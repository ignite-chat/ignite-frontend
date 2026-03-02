import { toast } from 'sonner';
import api from '../api.js';
import { useAuthStore } from '@/ignite/store/auth.store.js';
import { useUsersStore } from '@/ignite/store/users.store.js';
import axios from 'axios';
import type { Invite } from '../store/invites.store';
import type { AuthResponse } from './auth.service';

export const InvitesService = {
  async getInvitePreview(code: string): Promise<Invite> {
    const { data } = await api.get<Invite>(`/invites/${code}`);
    return data;
  },

  async acceptInvite(code: string) {
    try {
      await api.post(`/invites/${code}`);
      toast.success('Joined server successfully.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to join server.');
      } else {
        toast.error('Failed to join server.');
      }
      throw error;
    }
  },

  async acceptInviteWithQuickAccount(code: string, username: string) {
    try {
      // Register with username only
      const { data } = await api.post<AuthResponse>('/register', { username });

      // Store user in users store
      useUsersStore.getState().setUser(data.user.id, data.user);

      // Login with the new account
      useAuthStore.getState().login(data.user.id, data.token);

      // Accept the invite
      await api.post(`/invites/${code}`);

      toast.success('Account created and joined server successfully.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to create account and join.');
      } else {
        toast.error('Failed to create account and join.');
      }
      throw error;
    }
  },
};
