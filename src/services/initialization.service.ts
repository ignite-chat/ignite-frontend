import api from '../api';
import { useAuthStore } from '../store/auth.store';
import { useUsersStore } from '../store/users.store';
import { useGuildsStore } from '../store/guilds.store';
import { useChannelsStore } from '../store/channels.store';
import { useFriendsStore } from '../store/friends.store';
import { useUnreadsStore } from '../store/unreads.store';
import { useRolesStore } from '../store/roles.store';
import { useEmojisStore } from '../store/emojis.store';
import { useStickersStore } from '../store/stickers.store';
import { useNotificationStore } from '../store/notification.store';
import { VoiceService } from './voice.service';
import type { User } from '../store/users.store';
import type { Channel } from '../store/channels.store';

export const InitializationService = {
  async initialize() {
    try {
      const localToken = localStorage.getItem('token');
      if (!localToken) {
        return { success: false, authenticated: false };
      }

      const { data } = await api.get('/@me/ready', {
        headers: { Authorization: `Bearer ${localToken}` },
      });

      const { user, guilds, private_channels, unreads, friends, friend_requests, guild_settings } =
        data;

      if (!user?.username) {
        localStorage.removeItem('token');
        return { success: false, authenticated: false };
      }

      // Store current user
      useUsersStore.getState().setUser(user.id, user);
      useAuthStore.getState().login(user.id, localToken);

      // Extract nested data from guilds and store separately
      const guildChannels: Channel[] = [];
      const cleanGuilds = guilds.map((guild: any) => {
        const { emojis, stickers, roles, member, ...rest } = guild;

        guildChannels.push(...(guild.channels || []));

        if (roles) {
          useRolesStore.getState().setGuildRoles(guild.id, roles);
        }
        if (emojis) {
          useEmojisStore.getState().setGuildEmojis(guild.id, emojis);
        }
        if (stickers) {
          useStickersStore.getState().setGuildStickers(guild.id, stickers);
        }
        if (member) {
          useGuildsStore.getState().setGuildMembers(guild.id, [member]);
        }

        return rest;
      });

      useGuildsStore.getState().setGuilds(cleanGuilds);

      // Store guild channels + DM channels
      useChannelsStore.getState().setChannels([...guildChannels, ...(private_channels || [])]);
      VoiceService.seedVoiceStates(guildChannels);

      // Store friends and extract users
      useFriendsStore.getState().setFriends(friends || []);
      useUsersStore.getState().setUsers((friends || []) as User[]);

      // Store friend requests and extract users
      useFriendsStore.getState().setRequests(friend_requests || []);
      const requestUsers = (friend_requests || []).flatMap(
        (req: { sender?: User; receiver?: User; user?: User }) =>
          [req.sender, req.receiver, req.user].filter((u): u is User => !!u)
      );
      useUsersStore.getState().setUsers(requestUsers);

      // Store unreads and guild settings
      useUnreadsStore.getState().setChannelUnreads(unreads || []);
      useNotificationStore.getState().setGuildNotificationSettings(guild_settings || []);

      console.log('Initialization complete.');
      return { success: true, authenticated: true };
    } catch (error) {
      console.error('Failed to initialize', error);
      return { success: false, authenticated: false, error };
    }
  },
};
