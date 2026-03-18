import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Emoji = {
  id: string;
  guild_id: string;
  name: string;
};

type RecentEmoji = {
  id?: string;
  label: string;
  surrogates?: string;
  url?: string;
  isCustom: boolean;
};

type EmojisStore = {
  guildEmojis: { [guildId: string]: Emoji[] };
  recentEmojis: RecentEmoji[];
  setGuildEmojis: (guildId: string, emojis: Emoji[]) => void;
  addGuildEmoji: (guildId: string, emoji: Emoji) => void;
  removeGuildEmoji: (guildId: string, emojiId: string) => void;
  addRecentEmoji: (emoji: RecentEmoji) => void;
  pruneRecentEmojis: () => void;
};

export const useEmojisStore = create<EmojisStore>()(
  persist(
    (set) => ({
      guildEmojis: {},
      recentEmojis: [],

      setGuildEmojis: (guildId, emojis) =>
        set((state) => ({
          guildEmojis: {
            ...state.guildEmojis,
            [guildId]: emojis,
          },
        })),

      addGuildEmoji: (guildId, emoji) =>
        set((state) => {
          const existing = state.guildEmojis[guildId] || [];
          if (existing.some((e) => e.id === emoji.id)) return state;
          return {
            guildEmojis: {
              ...state.guildEmojis,
              [guildId]: [...existing, emoji],
            },
          };
        }),

      removeGuildEmoji: (guildId, emojiId) =>
        set((state) => ({
          guildEmojis: {
            ...state.guildEmojis,
            [guildId]: (state.guildEmojis[guildId] || []).filter((e) => e.id !== emojiId),
          },
          recentEmojis: state.recentEmojis.filter((e) => e.id !== emojiId),
        })),

      addRecentEmoji: (emoji) =>
        set((state) => {
          const filtered = state.recentEmojis.filter((e) => e.label !== emoji.label);
          const newRecent = [emoji, ...filtered].slice(0, 20);
          return { recentEmojis: newRecent };
        }),

      pruneRecentEmojis: () =>
        set((state) => {
          const allCustomIds = new Set(
            Object.values(state.guildEmojis).flatMap((emojis) => emojis.map((e) => e.id))
          );
          const pruned = state.recentEmojis.filter((e) => !e.isCustom || (e.id && allCustomIds.has(e.id)));
          if (pruned.length === state.recentEmojis.length) return state;
          return { recentEmojis: pruned };
        }),
    }),
    {
      name: 'ignite-emojis-storage',
      partialize: (state) => ({ recentEmojis: state.recentEmojis }),
    }
  )
);
