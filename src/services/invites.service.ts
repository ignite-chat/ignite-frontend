import { toast } from 'sonner';
import api from '../api.js';
import useStore from '../hooks/useStore';
import { GuildsService } from './guilds.service';
import { ChannelsService } from './channels.service';
import { FriendsService } from './friends.service';
import { UnreadsService } from './unreads.service';

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
      await GuildsService.loadGuilds();
      await ChannelsService.loadChannels();
      toast.success('Joined server successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join server.');
      throw error;
    }
  },

  async acceptInviteWithQuickAccount(code, username) {
    try {
      // Register with username only
      const { data: authData } = await api.post('/register', { username });

      // Login with the new account
      useStore.getState().login(authData.user, authData.token);

      // Accept the invite
      await api.post(`/invites/${code}`);

      toast.success('Account created and joined server successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create account and join.');
      throw error;
    }
  },
};
