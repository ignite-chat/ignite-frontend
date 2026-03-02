import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import { toast } from 'sonner';
import api from '../api.js';
import { useVoiceStore, type VoiceState } from '../store/voice.store';
import { SoundService } from './sound.service';
import { useUsersStore } from '../store/users.store';
import type { Channel } from '../store/channels.store';

// RNNoise noise suppression — lazy-loaded to avoid WASM init at import time.
// Runs entirely client-side via WASM + AudioWorklet. No cloud dependency.
import { RnnoiseProcessor } from '@/lib/rnnoise-processor';

let rnnoiseProcessor: RnnoiseProcessor | null = null;

async function applyNoiseSuppression(room: Room) {
  const { noiseSuppression } = useVoiceStore.getState();
  const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  const track = publication?.track;
  if (!track) return;

  try {
    if (!rnnoiseProcessor) {
      rnnoiseProcessor = new RnnoiseProcessor();
    }
    await track.setProcessor(rnnoiseProcessor);
    rnnoiseProcessor.setEnabled(noiseSuppression);
  } catch (err) {
    console.warn('[noise] RNNoise setup failed:', err);
  }
}

async function toggleNoiseSuppressionOnTrack(room: Room, enabled: boolean) {
  const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  const track = publication?.track;
  if (!track) return;

  if (rnnoiseProcessor) {
    rnnoiseProcessor.setEnabled(enabled);
  } else {
    await applyNoiseSuppression(room);
  }
}

function buildVoiceStates(room: Room): VoiceState[] {
  const { isMuted, isDeafened, isCameraOn, isScreenSharing, channelId, guildId, voiceStates } = useVoiceStore.getState();

  const states: VoiceState[] = [];

  const local = room.localParticipant;
  if (local) {
    states.push({
      user_id: local.identity,
      guild_id: guildId || '',
      channel_id: channelId || '',
      self_mute: isMuted,
      self_deaf: isDeafened,
      self_video: isCameraOn,
      self_stream: isScreenSharing,
      speaking: localSpeakingState,
    });
  }

  room.remoteParticipants.forEach((participant) => {
    const existing = voiceStates.find(
      (v) => String(v.user_id) === String(participant.identity)
    );
    states.push({
      user_id: participant.identity,
      guild_id: guildId || '',
      channel_id: channelId || '',
      self_mute: !participant.isMicrophoneEnabled,
      self_deaf: existing?.self_deaf ?? false,
      self_video: participant.isCameraEnabled,
      self_stream: participant.isScreenShareEnabled,
      speaking: participant.isSpeaking,
    });
  });

  return states;
}

function refreshVoiceStates(room: Room) {
  const { channelId } = useVoiceStore.getState();
  if (channelId) {
    useVoiceStore.getState().setChannelVoiceStates(channelId, buildVoiceStates(room));
  }
}

// Local speaking detection via Web Audio API (no server roundtrip)
let localSpeakingState = false;
let speakingMonitorCleanup: (() => void) | null = null;

function startLocalSpeakingMonitor(room: Room) {
  stopLocalSpeakingMonitor();

  const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  const mediaStreamTrack = publication?.track?.mediaStreamTrack;
  if (!mediaStreamTrack) return;

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const SPEAKING_THRESHOLD = 15;

  const interval = setInterval(() => {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    const nowSpeaking = average > SPEAKING_THRESHOLD;

    if (nowSpeaking !== localSpeakingState) {
      localSpeakingState = nowSpeaking;
      refreshVoiceStates(room);
    }
  }, 50);

  speakingMonitorCleanup = () => {
    clearInterval(interval);
    source.disconnect();
    audioContext.close();
    localSpeakingState = false;
  };
}

function stopLocalSpeakingMonitor() {
  if (speakingMonitorCleanup) {
    speakingMonitorCleanup();
    speakingMonitorCleanup = null;
  }
}

export const VoiceService = {
  seedVoiceStates(channels: Channel[]) {
    const allVoiceStates = channels.flatMap((c) => c.voice_states || []);
    if (allVoiceStates.length > 0) {
      const existing = useVoiceStore.getState().voiceStates;
      const merged = [...existing, ...allVoiceStates];
      const deduped = Array.from(
        new Map(merged.map((vs) => [`${vs.user_id}:${vs.channel_id}`, vs])).values()
      );
      useVoiceStore.getState().setVoiceStates(deduped);

      // Cache voice state users in users store
      const { users, setUsers } = useUsersStore.getState();
      const newUsers = allVoiceStates
        .filter((vs) => vs.user && !users[vs.user.id])
        .map((vs) => vs.user!);
      if (newUsers.length > 0) {
        setUsers(newUsers);
      }
    }
  },

  async joinVoiceChannel(
    channelId: string,
    guildId: string,
    guildName: string,
    channelName: string
  ) {
    const store = useVoiceStore.getState();

    // If already in this channel, do nothing
    if (store.channelId === channelId && store.connectionState === 'connected') {
      return;
    }

    // If in a different channel, leave first
    if (store.room && store.connectionState !== 'disconnected') {
      await this.leaveVoiceChannel();
    }

    store.setConnectionState('connecting');
    store.setChannel(channelId, guildId, guildName, channelName);

    try {
      const { data } = await api.post(`/channels/${channelId}/join_call`);
      const { token, url } = data;

      const audioInputDeviceId = useVoiceStore.getState().audioInputDeviceId;
      const audioOutputDeviceId = useVoiceStore.getState().audioOutputDeviceId;

      const room = new Room({
        audioCaptureDefaults: audioInputDeviceId ? { deviceId: audioInputDeviceId } : undefined,
        audioOutput: audioOutputDeviceId ? { deviceId: audioOutputDeviceId } : undefined,
      });

      // Participant events
      room.on(RoomEvent.ParticipantConnected, () => {
        refreshVoiceStates(room);
        SoundService.playSound('user_join_channel');
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        refreshVoiceStates(room);
        SoundService.playSound('user_leave_channel');
      });
      room.on(RoomEvent.ActiveSpeakersChanged, () => refreshVoiceStates(room));
      room.on(RoomEvent.TrackMuted, () => refreshVoiceStates(room));
      room.on(RoomEvent.TrackUnmuted, () => refreshVoiceStates(room));

      // Track publish/unpublish events (for video & screenshare updates)
      room.on(RoomEvent.TrackPublished, () => refreshVoiceStates(room));
      room.on(RoomEvent.TrackUnpublished, () => refreshVoiceStates(room));
      room.on(RoomEvent.TrackSubscribed, () => refreshVoiceStates(room));
      room.on(RoomEvent.TrackUnsubscribed, () => refreshVoiceStates(room));
      room.on(RoomEvent.LocalTrackPublished, () => {
        const s = useVoiceStore.getState();
        s.setCameraOn(room.localParticipant.isCameraEnabled);
        s.setScreenSharing(room.localParticipant.isScreenShareEnabled);
        refreshVoiceStates(room);
      });
      room.on(RoomEvent.LocalTrackUnpublished, () => {
        const s = useVoiceStore.getState();
        s.setCameraOn(room.localParticipant.isCameraEnabled);
        s.setScreenSharing(room.localParticipant.isScreenShareEnabled);
        refreshVoiceStates(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        stopLocalSpeakingMonitor();
        rnnoiseProcessor = null;
        SoundService.playSound('voice_disconnected');
        useVoiceStore.getState().reset();
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connected) {
          useVoiceStore.getState().setConnectionState('connected');
        } else if (state === ConnectionState.Reconnecting) {
          useVoiceStore.getState().setConnectionState('connecting');
        }
      });

      await room.connect(url, token);

      store.setRoom(room);
      store.setConnectionState('connected');
      store.setChannelVoiceStates(channelId, buildVoiceStates(room));

      // Respect the user's current mute state when joining
      const shouldEnableMic = !useVoiceStore.getState().isMuted;
      if (shouldEnableMic) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          await applyNoiseSuppression(room);
          startLocalSpeakingMonitor(room);
        } catch {
          console.warn('Microphone access denied — joining muted.');
          store.setMuted(true);
        }
      }
      refreshVoiceStates(room);

    } catch (error) {
      console.error('Failed to join voice channel:', error);
      toast.error('Failed to join voice channel.');
      store.reset();
    }
  },

  async leaveVoiceChannel() {
    const store = useVoiceStore.getState();
    const { room } = store;

    stopLocalSpeakingMonitor();
    rnnoiseProcessor = null;

    if (room) {
      room.localParticipant.setScreenShareEnabled(false);
      room.disconnect();
    }

    store.reset();
  },

  async toggleMute() {
    const store = useVoiceStore.getState();
    const { room, isMuted, channelId } = store;

    if (!room) return;

    const newMuted = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    store.setMuted(newMuted);
    SoundService.playSound(newMuted ? 'voice_mute' : 'voice_unmute');

    if (newMuted) {
      stopLocalSpeakingMonitor();
    } else {
      await applyNoiseSuppression(room);
      startLocalSpeakingMonitor(room);
    }

    refreshVoiceStates(room);

    if (channelId) {
      api.patch(`/channels/${channelId}/voice-state`, {
        self_mute: newMuted,
      }).catch(() => {});
    }
  },

  async toggleDeafen() {
    const store = useVoiceStore.getState();
    const { room, isDeafened, channelId } = store;

    if (!room) return;

    const newDeafened = !isDeafened;

    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          if (newDeafened) {
            publication.track.detach();
          } else {
            publication.track.attach();
          }
        }
      });
    });

    if (newDeafened && !store.isMuted) {
      await room.localParticipant.setMicrophoneEnabled(false);
      store.setMuted(true);
      stopLocalSpeakingMonitor();
    }

    store.setDeafened(newDeafened);
    SoundService.playSound(newDeafened ? 'voice_deafen' : 'voice_undeafen');
    refreshVoiceStates(room);

    if (channelId) {
      api.patch(`/channels/${channelId}/voice-state`, {
        self_mute: newDeafened ? true : store.isMuted,
        self_deaf: newDeafened,
      }).catch(() => {});
    }
  },

  async toggleCamera() {
    const store = useVoiceStore.getState();
    const { room, isCameraOn } = store;

    if (!room) return;

    try {
      await room.localParticipant.setCameraEnabled(!isCameraOn);
      store.setCameraOn(!isCameraOn);
      SoundService.playSound(!isCameraOn ? 'camera_on' : 'camera_off');
      refreshVoiceStates(room);
    } catch {
      console.warn('Camera access denied.');
      toast.error('Could not access camera.');
    }
  },

  async toggleNoiseSuppression() {
    const store = useVoiceStore.getState();
    const newEnabled = !store.noiseSuppression;
    store.setNoiseSuppression(newEnabled);

    const { room } = store;
    if (!room) return;

    await toggleNoiseSuppressionOnTrack(room, newEnabled);
  },

  async toggleScreenShare() {
    const store = useVoiceStore.getState();
    const { room, isScreenSharing } = store;

    if (!room) return;

    // If already sharing, stop it
    if (isScreenSharing) {
      try {
        await room.localParticipant.setScreenShareEnabled(false);
        store.setScreenSharing(false);
        refreshVoiceStates(room);
      } catch {
        console.warn('Failed to stop screen share.');
      }
      return;
    }

    // In browser, use the default picker
    try {
      await room.localParticipant.setScreenShareEnabled(true);
      store.setScreenSharing(true);
      refreshVoiceStates(room);
    } catch {
      console.warn('Screen share cancelled or denied.');
    }
  },

  async startScreenShare(
    sourceId: string,
    quality: { width: number; height: number; frameRate: number }
  ) {
    const store = useVoiceStore.getState();
    const { room } = store;

    if (!room) return;

    try {
      // Get the stream using Electron's chromeMediaSourceId constraint
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: quality.width,
            maxHeight: quality.height,
            maxFrameRate: quality.frameRate,
          },
        } as any,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        console.warn('No video track from screen capture.');
        return;
      }

      // Publish the track to the LiveKit room as a screen share
      await room.localParticipant.publishTrack(videoTrack, {
        source: Track.Source.ScreenShare,
        name: 'screen',
        videoEncoding: {
          maxBitrate: quality.frameRate >= 60 ? 4_000_000 : 2_500_000,
          maxFramerate: quality.frameRate,
        },
      });

      store.setScreenSharing(true);
      refreshVoiceStates(room);

      // Listen for the track ending (e.g. user stops via OS-level controls)
      videoTrack.onended = () => {
        room.localParticipant.unpublishTrack(videoTrack);
        videoTrack.stop();
        store.setScreenSharing(false);
        refreshVoiceStates(room);
      };
    } catch (err) {
      console.error('Failed to start screen share:', err);
      toast.error('Failed to start screen share.');
    }
  },
};
