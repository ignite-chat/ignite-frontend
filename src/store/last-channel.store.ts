import { create } from 'zustand';

/**
 * Module-level maps for scroll positions.
 * These don't need to be reactive — just saved/restored imperatively.
 */
const messageScrollPositions = new Map<string, number>();
const sidebarScrollPositions = new Map<string, number>();

type LastChannelStore = {
  /** guildId → last visited channelId */
  lastChannels: Record<string, string>;
  setLastChannel: (guildId: string, channelId: string) => void;
  getLastChannel: (guildId: string) => string | undefined;
};

export const useLastChannelStore = create<LastChannelStore>((set, get) => ({
  lastChannels: {},

  setLastChannel: (guildId, channelId) =>
    set((state) => ({
      lastChannels: { ...state.lastChannels, [guildId]: channelId },
    })),

  getLastChannel: (guildId) => get().lastChannels[guildId],
}));

/** Save/restore scroll position for message containers, keyed by channelId */
export const scrollPositions = {
  saveMessage: (channelId: string, scrollTop: number) => {
    messageScrollPositions.set(channelId, scrollTop);
  },
  getMessage: (channelId: string) => messageScrollPositions.get(channelId),

  saveSidebar: (guildId: string, scrollTop: number) => {
    sidebarScrollPositions.set(guildId, scrollTop);
  },
  getSidebar: (guildId: string) => sidebarScrollPositions.get(guildId),
};
