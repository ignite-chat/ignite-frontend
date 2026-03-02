import api from '../api.js';
import { useStickersStore } from '../store/stickers.store.js';
import { useGuildsStore } from '../store/guilds.store.js';

export const StickersService = {
  async loadGuildStickers(guildId: string) {
    const { setGuildStickers } = useStickersStore.getState();

    try {
      const res = await api.get(`guilds/${guildId}/stickers`);
      setGuildStickers(guildId, res.data);
    } catch (error) {
      console.warn(`Failed to load stickers for guild ${guildId}:`, error);
    }
  },

  async loadAllGuildStickers() {
    const { guilds } = useGuildsStore.getState();
    if (!guilds || guilds.length === 0) return;

    await Promise.allSettled(
      guilds.map((guild) => this.loadGuildStickers(guild.id))
    );
  },

  async deleteSticker(guildId: string, stickerId: string) {
    const { removeGuildSticker } = useStickersStore.getState();

    try {
      await api.delete(`guilds/${guildId}/stickers/${stickerId}`);
      removeGuildSticker(guildId, stickerId);
    } catch (error) {
      throw error;
    }
  },

  handleStickerCreated(event: any) {
    const { addGuildSticker } = useStickersStore.getState();
    addGuildSticker(event.sticker.guild_id, event.sticker);
  },

  handleStickerDeleted(event: any) {
    const { removeGuildSticker } = useStickersStore.getState();
    removeGuildSticker(event.sticker.guild_id, event.sticker.id);
  },
};
