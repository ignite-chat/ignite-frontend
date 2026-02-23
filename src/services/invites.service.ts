import { toast } from 'sonner';
import api from '../api.js';
import useStore from '../hooks/useStore';
import { GuildsService } from './guilds.service';
import { ChannelsService } from './channels.service';
import { FriendsService } from './friends.service';
import { UnreadsService } from './unreads.service';
import { useAuthStore } from '@/store/auth.store.js';
import { useUsersStore } from '@/store/users.store.js';
import { EmojisService } from './emojis.service';
import { StickersService } from './stickers.service';

export const InvitesService = {
  async getInvitePreview(code) {
    try {
      const { data } = await api.get(`/invites/${code}`);
      return data;
    } catch (error) {
      throw error;
    }
  },

  async acceptInvite(code) {
    try {
      await api.post(`/invites/${code}`);
      toast.success('Joined server successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join server.');
      throw error;
    }
  },

  async acceptInviteWithQuickAccount(code, username) {
    try {
      // Register with username only
      const { data } = await api.post('/register', { username });

      // Store user in users store
      useUsersStore.getState().setUser(data.user.id, data.user);

      // Login with the new account
      useAuthStore.getState().login(data.user.id, data.token);

      // Accept the invite
      await api.post(`/invites/${code}`);

      toast.success('Account created and joined server successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create account and join.');
      throw error;
    }
  },
};
