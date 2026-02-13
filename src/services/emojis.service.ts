import api from '../api.js';
import { useEmojisStore } from '../store/emojis.store.js';

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
};
