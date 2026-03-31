import { create } from 'zustand';

type TypingUser = {
  userId: string;
  firstName: string;
  expiresAt: number;
};

type TelegramTypingStore = {
  typing: { [chatId: string]: TypingUser[] };
  addTypingUser: (chatId: string, user: { userId: string; firstName: string }) => void;
  removeTypingUser: (chatId: string, userId: string) => void;
  clearExpired: () => void;
};

const TYPING_DURATION = 6000;

export const useTelegramTypingStore = create<TelegramTypingStore>((set) => ({
  typing: {},

  addTypingUser: (chatId, user) =>
    set((state) => {
      const existing = state.typing[chatId] || [];
      const filtered = existing.filter((t) => t.userId !== user.userId);
      return {
        typing: {
          ...state.typing,
          [chatId]: [
            ...filtered,
            { ...user, expiresAt: Date.now() + TYPING_DURATION },
          ],
        },
      };
    }),

  removeTypingUser: (chatId, userId) =>
    set((state) => {
      const existing = state.typing[chatId] || [];
      return {
        typing: {
          ...state.typing,
          [chatId]: existing.filter((t) => t.userId !== userId),
        },
      };
    }),

  clearExpired: () =>
    set((state) => {
      const now = Date.now();
      const typing: typeof state.typing = {};
      for (const [chatId, users] of Object.entries(state.typing)) {
        const active = users.filter((t) => t.expiresAt > now);
        if (active.length > 0) typing[chatId] = active;
      }
      return { typing };
    }),
}));
