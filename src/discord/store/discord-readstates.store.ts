import { create } from 'zustand';
import type { ReadStateEntry } from '../types';

type DiscordReadStatesStore = {
  /** Channel read states keyed by channel/entity ID */
  readStates: { [id: string]: ReadStateEntry };

  setReadStates: (entries: ReadStateEntry[]) => void;
  updateReadState: (id: string, updates: Partial<ReadStateEntry>) => void;
  ackChannel: (channelId: string, messageId: string) => void;

  /** Check if a channel has unread messages by comparing its last_message_id with the read state */
  isUnread: (channelId: string, channelLastMessageId: string | null | undefined) => boolean;
  getMentionCount: (channelId: string) => number;

  clear: () => void;
};

export const useDiscordReadStatesStore = create<DiscordReadStatesStore>((set, get) => ({
  readStates: {},

  setReadStates: (entries) =>
    set({
      readStates: Object.fromEntries(entries.map((e) => [e.id, e])),
    }),

  updateReadState: (id, updates) =>
    set((state) => ({
      readStates: {
        ...state.readStates,
        [id]: { ...state.readStates[id], id, ...updates },
      },
    })),

  ackChannel: (channelId, messageId) =>
    set((state) => ({
      readStates: {
        ...state.readStates,
        [channelId]: {
          ...state.readStates[channelId],
          id: channelId,
          last_message_id: messageId,
          mention_count: 0,
        },
      },
    })),

  isUnread: (channelId, channelLastMessageId) => {
    if (!channelLastMessageId) return false;
    const entry = get().readStates[channelId];
    if (!entry?.last_message_id) return true;
    // Snowflake IDs are chronological — larger = newer
    return channelLastMessageId > entry.last_message_id;
  },

  getMentionCount: (channelId) => {
    const entry = get().readStates[channelId];
    return entry?.mention_count ?? 0;
  },

  clear: () => set({ readStates: {} }),
}));
