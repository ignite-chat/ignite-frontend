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

  setConnectionState: (state: DiscordVoiceConnectionState) => void;
  setChannel: (guildId: string, channelId: string, channelName: string, guildName: string) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
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

  setConnectionState: (connectionState) => set({ connectionState }),
  setChannel: (guildId, channelId, channelName, guildName) =>
    set({ guildId, channelId, channelName, guildName }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  reset: () =>
    set({
      connectionState: 'disconnected',
      guildId: null,
      channelId: null,
      channelName: null,
      guildName: null,
    }),
}));
