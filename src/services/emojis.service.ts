import api from '../api.js';
import { useEmojisStore } from '../store/emojis.store.js';
import { useGuildsStore } from '../store/guilds.store.js';

export const EmojisService = {
  async loadGuildEmojis(guildId: string) {
    const { setGuildEmojis } = useEmojisStore.getState();

    try {
      const res = await api.get(`guilds/${guildId}/emojis`);
      setGuildEmojis(guildId, res.data);
    } catch (error) {
      console.warn(`Failed to load emojis for guild ${guildId}:`, error);
    }
  },

  async loadAllGuildEmojis() {
    const { guilds } = useGuildsStore.getState();
    if (!guilds || guilds.length === 0) return;

    // Load emojis for all guilds in parallel
    await Promise.allSettled(
      guilds.map((guild) => this.loadGuildEmojis(guild.id))
    );
  },

  async uploadEmoji(guildId: string, name: string, file: File) {
    const { addGuildEmoji } = useEmojisStore.getState();

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

    reader.readAsDataURL(file);
    const base64Image = await base64Promise;

    try {
      const res = await api.post(`guilds/${guildId}/emojis`, {
        name,
        image: base64Image,
      });
      addGuildEmoji(guildId, res.data);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteEmoji(guildId: string, emojiId: string) {
    const { removeGuildEmoji } = useEmojisStore.getState();

    try {
      await api.delete(`guilds/${guildId}/emojis/${emojiId}`);
      removeGuildEmoji(guildId, emojiId);
    } catch (error) {
      throw error;
    }
  },

  handleEmojiCreated(event: any) {
    const { addGuildEmoji } = useEmojisStore.getState();
    addGuildEmoji(event.emoji.guild_id, event.emoji);
  },

  handleEmojiDeleted(event: any) {
    const { removeGuildEmoji } = useEmojisStore.getState();
    removeGuildEmoji(event.emoji.guild_id, event.emoji.id);
  },
};

