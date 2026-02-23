import { create } from 'zustand';

type TypingUser = {
  user_id: string;
  username: string;
  expiresAt: number;
};

type TypingStore = {
  typing: { [channelId: string]: TypingUser[] };
  addTypingUser: (channelId: string, user: { user_id: string; username: string }) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  clearExpired: () => void;
};

const TYPING_DURATION = 8000;

export const useTypingStore = create<TypingStore>((set) => ({
  typing: {},

  addTypingUser: (channelId, user) =>
    set((state) => {
      const existing = state.typing[channelId] || [];
      const filtered = existing.filter((t) => t.user_id !== user.user_id);
      return {
        typing: {
          ...state.typing,
          [channelId]: [
            ...filtered,
            { ...user, expiresAt: Date.now() + TYPING_DURATION },
          ],
        },
      };
    }),

  removeTypingUser: (channelId, userId) =>
    set((state) => {
      const existing = state.typing[channelId] || [];
      return {
        typing: {
          ...state.typing,
          [channelId]: existing.filter((t) => t.user_id !== userId),
        },
      };
    }),

  clearExpired: () =>
    set((state) => {
      const now = Date.now();
      const typing: typeof state.typing = {};
      for (const [channelId, users] of Object.entries(state.typing)) {
        const active = users.filter((t) => t.expiresAt > now);
        if (active.length > 0) typing[channelId] = active;
      }
      return { typing };
    }),
}));
