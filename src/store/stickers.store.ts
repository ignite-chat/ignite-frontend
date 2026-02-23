import { create } from 'zustand';

type Sticker = {
  id: string;
  guild_id: string;
  name: string;
};

type StickersStore = {
  guildStickers: { [guildId: string]: Sticker[] };
  setGuildStickers: (guildId: string, stickers: Sticker[]) => void;
  addGuildSticker: (guildId: string, sticker: Sticker) => void;
  removeGuildSticker: (guildId: string, stickerId: string) => void;
};

export const useStickersStore = create<StickersStore>()((set) => ({
  guildStickers: {},

  setGuildStickers: (guildId, stickers) =>
    set((state) => ({
      guildStickers: {
        ...state.guildStickers,
        [guildId]: stickers,
      },
    })),

  addGuildSticker: (guildId, sticker) =>
    set((state) => {
      const existing = state.guildStickers[guildId] || [];
      if (existing.some((s) => s.id === sticker.id)) return state;
      return {
        guildStickers: {
          ...state.guildStickers,
          [guildId]: [...existing, sticker],
        },
      };
    }),

  removeGuildSticker: (guildId, stickerId) =>
    set((state) => ({
      guildStickers: {
        ...state.guildStickers,
        [guildId]: (state.guildStickers[guildId] || []).filter((s) => s.id !== stickerId),
      },
    })),
}));
