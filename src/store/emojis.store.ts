import { create } from 'zustand';

type Emoji = {
  id: string;
  guild_id: string;
  name: string;
};

type EmojisStore = {
  guildEmojis: { [guildId: string]: Emoji[] };

  setGuildEmojis: (guildId: string, emojis: Emoji[]) => void;
};

export const useEmojisStore = create<EmojisStore>((set) => ({
  guildEmojis: {},

  setGuildEmojis: (guildId, emojis) =>
    set((state) => ({
      guildEmojis: {
        ...state.guildEmojis,
        [guildId]: emojis,
      },
    })),
}));
