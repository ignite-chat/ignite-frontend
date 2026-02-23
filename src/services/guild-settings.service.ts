import { toast } from 'sonner';
import api from '../api.js';
import { useNotificationStore } from '../store/notification.store';

export const GuildSettingsService = {
  async loadGuildSettings() {
    const { setGuildSettings } = useNotificationStore.getState();
    try {
      const { data } = await api.get('/users/@me/guilds/settings');
      setGuildSettings(data);
    } catch {
      toast.error('Unable to load guild settings.');
    }
  },

  async updateGuildSettings(guildId: string, updates: any) {
    const { updateGuildSettings } = useNotificationStore.getState();
    try {
      await api.patch('/users/@me/guilds/settings', [
        { guild_id: guildId, ...updates },
      ]);
      //updateGuildSettings(guildId, updates);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update notification settings.');
    }
  },

  handleGuildSettingsUpdated(event: any) {
    const { updateGuildSettings } = useNotificationStore.getState();
    if (event.settings) {
      updateGuildSettings(event.settings.guild_id, event.settings);
    }
  },
};
