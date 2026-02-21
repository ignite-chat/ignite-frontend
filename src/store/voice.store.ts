import { create } from 'zustand';
import type { Room } from 'livekit-client';

export interface VoiceState {
  user_id: string;
  guild_id: string;
  channel_id: string;
  self_mute: boolean;
  self_deaf: boolean;
  self_video: boolean;
  self_stream: boolean;
  speaking?: boolean;
}

interface VoiceStoreState {
  room: Room | null;
  channelId: string | null;
  guildId: string | null;
  guildName: string | null;
  channelName: string | null;
  voiceStates: VoiceState[];
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isScreenSharePickerOpen: boolean;
  watchingScreens: string[];
  connectionState: 'disconnected' | 'connecting' | 'connected';
  ping: number | null;
  audioInputDeviceId: string | null;
  audioOutputDeviceId: string | null;
  noiseSuppression: boolean;

  setRoom: (room: Room | null) => void;
  setChannel: (
    channelId: string | null,
    guildId: string | null,
    guildName: string | null,
    channelName: string | null
  ) => void;
  setVoiceStates: (voiceStates: VoiceState[]) => void;
  upsertVoiceState: (channelId: string, voiceState: VoiceState) => void;
  removeVoiceState: (userId: string) => void;
  setChannelVoiceStates: (channelId: string, voiceStates: VoiceState[]) => void;
  setConnectionState: (state: 'disconnected' | 'connecting' | 'connected') => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setCameraOn: (on: boolean) => void;
  setScreenSharing: (on: boolean) => void;
  setScreenSharePickerOpen: (open: boolean) => void;
  addWatchingScreen: (identity: string) => void;
  removeWatchingScreen: (identity: string) => void;
  setPing: (ping: number | null) => void;
  setAudioInputDeviceId: (id: string | null) => void;
  setAudioOutputDeviceId: (id: string | null) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  room: null,
  channelId: null,
  guildId: null,
  guildName: null,
  channelName: null,
  voiceStates: [],
  isMuted: true,
  isDeafened: false,
  isCameraOn: false,
  isScreenSharing: false,
  isScreenSharePickerOpen: false,
  watchingScreens: [],
  connectionState: 'disconnected',
  ping: null,
  audioInputDeviceId: localStorage.getItem('audioInputDeviceId') || null,
  audioOutputDeviceId: localStorage.getItem('audioOutputDeviceId') || null,
  noiseSuppression: localStorage.getItem('noiseSuppression') === 'true',

  setRoom: (room) => set({ room }),
  setChannel: (channelId, guildId, guildName, channelName) =>
    set({ channelId, guildId, guildName, channelName }),
  setVoiceStates: (voiceStates) => set({ voiceStates }),
  upsertVoiceState: (channelId, voiceState) =>
    set((state) => {
      const idx = state.voiceStates.findIndex(
        (vs) => String(vs.user_id) === String(voiceState.user_id)
      );
      if (idx === -1) {
        return { voiceStates: [...state.voiceStates, voiceState] };
      }
      const updated = [...state.voiceStates];
      updated[idx] = voiceState;
      return { voiceStates: updated };
    }),
  removeVoiceState: (userId) =>
    set((state) => ({
      voiceStates: state.voiceStates.filter(
        (vs) => String(vs.user_id) !== String(userId)
      ),
    })),
  setChannelVoiceStates: (channelId, voiceStates) =>
    set((state) => ({
      voiceStates: [
        ...state.voiceStates.filter((vs) => String(vs.channel_id) !== String(channelId)),
        ...voiceStates,
      ],
    })),
  setPing: (ping) => set({ ping }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setScreenSharePickerOpen: (isScreenSharePickerOpen) => set({ isScreenSharePickerOpen }),
  addWatchingScreen: (identity) =>
    set((state) => ({
      watchingScreens: state.watchingScreens.includes(identity)
        ? state.watchingScreens
        : [...state.watchingScreens, identity],
    })),
  removeWatchingScreen: (identity) =>
    set((state) => ({
      watchingScreens: state.watchingScreens.filter((id) => id !== identity),
    })),
  setAudioInputDeviceId: (audioInputDeviceId) => {
    if (audioInputDeviceId) {
      localStorage.setItem('audioInputDeviceId', audioInputDeviceId);
    } else {
      localStorage.removeItem('audioInputDeviceId');
    }
    set({ audioInputDeviceId });
  },
  setAudioOutputDeviceId: (audioOutputDeviceId) => {
    if (audioOutputDeviceId) {
      localStorage.setItem('audioOutputDeviceId', audioOutputDeviceId);
    } else {
      localStorage.removeItem('audioOutputDeviceId');
    }
    set({ audioOutputDeviceId });
  },
  setNoiseSuppression: (noiseSuppression) => {
    localStorage.setItem('noiseSuppression', String(noiseSuppression));
    set({ noiseSuppression });
  },
  reset: () =>
    set((state) => ({
      room: null,
      channelId: null,
      guildId: null,
      guildName: null,
      channelName: null,
      isMuted: state.isMuted,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false,
      isScreenSharePickerOpen: false,
      watchingScreens: [],
      connectionState: 'disconnected',
      ping: null,
    })),
}));
