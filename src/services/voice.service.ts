import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import { toast } from 'sonner';
import api from '../api.js';
import { useVoiceStore, type VoiceParticipant } from '../store/voice.store';
import { useUsersStore } from '../store/users.store';
import useStore from '../hooks/useStore';

function resolveParticipantName(identity: string): string {
  const currentUser = useStore.getState().user;
  if (currentUser && String(currentUser.id) === identity) {
    return currentUser.name || currentUser.username || identity;
  }

  const user = useUsersStore.getState().getUser(identity);
  if (user) {
    return user.name || user.username || identity;
  }

  return identity;
}

function buildParticipantsList(room: Room): VoiceParticipant[] {
  const participants: VoiceParticipant[] = [];

  const local = room.localParticipant;
  if (local) {
    participants.push({
      identity: local.identity,
      name: resolveParticipantName(local.identity),
      isSpeaking: local.isSpeaking,
      isMuted: !local.isMicrophoneEnabled,
      isCameraOn: local.isCameraEnabled,
      isScreenSharing: local.isScreenShareEnabled,
    });
  }

  room.remoteParticipants.forEach((participant) => {
    participants.push({
      identity: participant.identity,
      name: resolveParticipantName(participant.identity),
      isSpeaking: participant.isSpeaking,
      isMuted: !participant.isMicrophoneEnabled,
      isCameraOn: participant.isCameraEnabled,
      isScreenSharing: participant.isScreenShareEnabled,
    });
  });

  return participants;
}

function refreshParticipants(room: Room) {
  useVoiceStore.getState().setParticipants(buildParticipantsList(room));
}

export const VoiceService = {
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
      room.on(RoomEvent.ParticipantConnected, () => refreshParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => refreshParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(room));
      room.on(RoomEvent.TrackMuted, () => refreshParticipants(room));
      room.on(RoomEvent.TrackUnmuted, () => refreshParticipants(room));

      // Track publish/unpublish events (for video & screenshare updates)
      room.on(RoomEvent.TrackPublished, () => refreshParticipants(room));
      room.on(RoomEvent.TrackUnpublished, () => refreshParticipants(room));
      room.on(RoomEvent.TrackSubscribed, () => refreshParticipants(room));
      room.on(RoomEvent.TrackUnsubscribed, () => refreshParticipants(room));
      room.on(RoomEvent.LocalTrackPublished, () => {
        const s = useVoiceStore.getState();
        s.setCameraOn(room.localParticipant.isCameraEnabled);
        s.setScreenSharing(room.localParticipant.isScreenShareEnabled);
        refreshParticipants(room);
      });
      room.on(RoomEvent.LocalTrackUnpublished, () => {
        const s = useVoiceStore.getState();
        s.setCameraOn(room.localParticipant.isCameraEnabled);
        s.setScreenSharing(room.localParticipant.isScreenShareEnabled);
        refreshParticipants(room);
      });

      room.on(RoomEvent.Disconnected, () => {
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

      // Try to enable microphone, but don't fail the call if denied
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        console.warn('Microphone access denied — joining muted.');
        store.setMuted(true);
      }

      store.setParticipants(buildParticipantsList(room));
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      toast.error('Failed to join voice channel.');
      store.reset();
    }
  },

  async leaveVoiceChannel() {
    const store = useVoiceStore.getState();
    const { room } = store;

    if (room) {
      room.disconnect();
    }

    store.reset();
  },

  async toggleMute() {
    const store = useVoiceStore.getState();
    const { room, isMuted } = store;

    if (!room) return;

    const newMuted = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    store.setMuted(newMuted);
    refreshParticipants(room);
  },

  async toggleDeafen() {
    const store = useVoiceStore.getState();
    const { room, isDeafened } = store;

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
    }

    store.setDeafened(newDeafened);
  },

  async toggleCamera() {
    const store = useVoiceStore.getState();
    const { room, isCameraOn } = store;

    if (!room) return;

    try {
      await room.localParticipant.setCameraEnabled(!isCameraOn);
      store.setCameraOn(!isCameraOn);
      refreshParticipants(room);
    } catch {
      console.warn('Camera access denied.');
      toast.error('Could not access camera.');
    }
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
        refreshParticipants(room);
      } catch {
        console.warn('Failed to stop screen share.');
      }
      return;
    }

    // In Electron, open the custom picker
    if (window.IgniteNative?.getDesktopSources) {
      store.setScreenSharePickerOpen(true);
      return;
    }

    // In browser, use the default picker
    try {
      await room.localParticipant.setScreenShareEnabled(true);
      store.setScreenSharing(true);
      refreshParticipants(room);
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
      refreshParticipants(room);

      // Listen for the track ending (e.g. user stops via OS-level controls)
      videoTrack.onended = () => {
        room.localParticipant.unpublishTrack(videoTrack);
        videoTrack.stop();
        store.setScreenSharing(false);
        refreshParticipants(room);
      };
    } catch (err) {
      console.error('Failed to start screen share:', err);
      toast.error('Failed to start screen share.');
    }
  },
};
