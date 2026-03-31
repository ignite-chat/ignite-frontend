import { create } from 'zustand';

type ReadState = {
  lastReadMessageId: number;
  unreadCount: number;
  unreadMentionCount: number;
};

type TelegramReadStatesStore = {
  readStates: { [chatId: string]: ReadState };

  setReadStates: (states: { chatId: string; lastReadMessageId: number; unreadCount: number; unreadMentionCount: number }[]) => void;
  updateReadState: (chatId: string, updates: Partial<ReadState>) => void;
  ackChat: (chatId: string, messageId: number) => void;
  isUnread: (chatId: string) => boolean;
  getMentionCount: (chatId: string) => number;
  getUnreadCount: (chatId: string) => number;
  clear: () => void;
};

export const useTelegramReadStatesStore = create<TelegramReadStatesStore>((set, get) => ({
  readStates: {},

  setReadStates: (states) =>
    set({
      readStates: Object.fromEntries(
        states.map((s) => [s.chatId, {
          lastReadMessageId: s.lastReadMessageId,
          unreadCount: s.unreadCount,
          unreadMentionCount: s.unreadMentionCount,
        }]),
      ),
    }),

  updateReadState: (chatId, updates) =>
    set((state) => ({
      readStates: {
        ...state.readStates,
        [chatId]: {
          lastReadMessageId: 0,
          unreadCount: 0,
          unreadMentionCount: 0,
          ...state.readStates[chatId],
          ...updates,
        },
      },
    })),

  ackChat: (chatId, messageId) =>
    set((state) => ({
      readStates: {
        ...state.readStates,
        [chatId]: {
          ...state.readStates[chatId],
          lastReadMessageId: messageId,
          unreadCount: 0,
          unreadMentionCount: 0,
        },
      },
    })),

  isUnread: (chatId) => {
    const entry = get().readStates[chatId];
    return (entry?.unreadCount ?? 0) > 0;
  },

  getMentionCount: (chatId) => {
    const entry = get().readStates[chatId];
    return entry?.unreadMentionCount ?? 0;
  },

  getUnreadCount: (chatId) => {
    const entry = get().readStates[chatId];
    return entry?.unreadCount ?? 0;
  },

  clear: () => set({ readStates: {} }),
}));
