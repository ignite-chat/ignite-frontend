import { toast } from 'sonner';
import api from '../api.js';
import { useNotificationStore } from '../store/notification.store';
import type { GuildNotificationSettings } from '../store/notification.store';
import type { GuildSettingsEvent } from '../handlers/types';

export const GuildSettingsService = {
  async loadGuildSettings() {
    const { setGuildNotificationSettings } = useNotificationStore.getState();
    try {
      const { data } = await api.get<GuildNotificationSettings[]>('/users/@me/guilds/settings');
      setGuildNotificationSettings(data);
    } catch {
      toast.error('Unable to load guild settings.');
    }
  },

  async updateGuildSettings(guildId: string, updates: Partial<GuildNotificationSettings>) {
    try {
      await api.patch('/users/@me/guilds/settings', [
        { guild_id: guildId, ...updates },
      ]);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update notification settings.');
    }
  },

  handleGuildSettingsUpdated(event: GuildSettingsEvent) {
    const { updateGuildNotificationSettings } = useNotificationStore.getState();
    if (event.settings) {
      updateGuildNotificationSettings(event.settings.guild_id, event.settings);
    }
  },
};
