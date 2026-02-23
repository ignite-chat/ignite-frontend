import api from '../api';
import { useAuthStore } from '../store/auth.store';
import { useUsersStore } from '../store/users.store';
import { GuildsService } from './guilds.service';
import { FriendsService } from './friends.service';
import { UnreadsService } from './unreads.service';
import { ChannelsService } from './channels.service';
import { RolesService } from './roles.service';
import { StickersService } from './stickers.service';
import { EmojisService } from './emojis.service';
import { GuildSettingsService } from './guild-settings.service';

export const InitializationService = {
  async initialize() {
    try {
      const localToken = localStorage.getItem('token');
      if (!localToken) {
        return { success: false, authenticated: false };
      }

      const { data: user } = await api.get('@me', {
        headers: { Authorization: `Bearer ${localToken}` },
      });

      if (!user?.username) {
        localStorage.removeItem('token');
        return { success: false, authenticated: false };
      }

      // Store user in users store
      useUsersStore.getState().setUser(user.id, user);

      // Store userId and token in auth store
      useAuthStore.getState().login(user.id, localToken);

      await Promise.all([
        GuildsService.loadGuilds(),
        FriendsService.loadFriends(),
        FriendsService.loadRequests(),
        UnreadsService.loadUnreads(),
        GuildSettingsService.loadGuildSettings(),
      ]);

      await ChannelsService.loadChannels();
      await RolesService.initializeGuildRoles();
      await EmojisService.loadAllGuildEmojis();
      await StickersService.loadAllGuildStickers();

      console.log('Initialization complete.');
      return { success: true, authenticated: true };
    } catch (error) {
      console.error('Failed to initialize', error);
      return { success: false, authenticated: false, error };
    }
  },
};
