import { create } from 'zustand';

type DiscordVoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'force_disconnected';

type DiscordVoiceStore = {
  connectionState: DiscordVoiceConnectionState;
  guildId: string | null;
  channelId: string | null;
  channelName: string | null;
  guildName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isFakeMuted: boolean;
  isFakeDeafened: boolean;
  speakingUsers: Set<string>;
  /** Remote video/stream tracks keyed by userId */
  remoteVideoStreams: Map<string, MediaStream>;
  /** Currently watching stream key (null if not watching) */
  watchingStreamKey: string | null;
  /** Stream connection state */
  streamConnectionState: 'disconnected' | 'connecting' | 'connected';
  /** The MediaStream for the stream being watched */
  watchingStreamMedia: MediaStream | null;

  setConnectionState: (state: DiscordVoiceConnectionState) => void;
  setChannel: (guildId: string, channelId: string, channelName: string, guildName: string) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setFakeMuted: (fakeMuted: boolean) => void;
  setFakeDeafened: (fakeDeafened: boolean) => void;
  setSpeaking: (userId: string, speaking: boolean) => void;
  setRemoteVideoStream: (userId: string, stream: MediaStream | null) => void;
  setWatchingStream: (streamKey: string | null) => void;
  setStreamConnectionState: (state: 'disconnected' | 'connecting' | 'connected') => void;
  setWatchingStreamMedia: (stream: MediaStream | null) => void;
  reset: () => void;
};

export const useDiscordVoiceStore = create<DiscordVoiceStore>((set) => ({
  connectionState: 'disconnected',
  guildId: null,
  channelId: null,
  channelName: null,
  guildName: null,
  isMuted: false,
  isDeafened: false,
  isFakeMuted: false,
  isFakeDeafened: false,
  speakingUsers: new Set<string>(),
  remoteVideoStreams: new Map<string, MediaStream>(),
  watchingStreamKey: null,
  streamConnectionState: 'disconnected',
  watchingStreamMedia: null,

  setConnectionState: (connectionState) => set({ connectionState }),
  setChannel: (guildId, channelId, channelName, guildName) =>
    set({ guildId, channelId, channelName, guildName }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  setFakeMuted: (isFakeMuted) => set({ isFakeMuted }),
  setFakeDeafened: (isFakeDeafened) => set({ isFakeDeafened }),
  setSpeaking: (userId, speaking) =>
    set((state) => {
      const next = new Set(state.speakingUsers);
      if (speaking) next.add(userId);
      else next.delete(userId);
      return { speakingUsers: next };
    }),
  setRemoteVideoStream: (userId, stream) =>
    set((state) => {
      const next = new Map(state.remoteVideoStreams);
      if (stream) next.set(userId, stream);
      else next.delete(userId);
      return { remoteVideoStreams: next };
    }),
  setWatchingStream: (streamKey) => set({ watchingStreamKey: streamKey }),
  setStreamConnectionState: (streamConnectionState) => set({ streamConnectionState }),
  setWatchingStreamMedia: (watchingStreamMedia) => set({ watchingStreamMedia }),
  reset: () =>
    set({
      connectionState: 'disconnected',
      guildId: null,
      channelId: null,
      channelName: null,
      guildName: null,
      isMuted: false,
      isDeafened: false,
      isFakeMuted: false,
      isFakeDeafened: false,
      speakingUsers: new Set<string>(),
      remoteVideoStreams: new Map<string, MediaStream>(),
      watchingStreamKey: null,
      streamConnectionState: 'disconnected',
      watchingStreamMedia: null,
    }),
}));
