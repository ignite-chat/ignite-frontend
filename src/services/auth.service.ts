import { toast } from 'sonner';
import api from '../api.js';
import { useAuthStore } from '../store/auth.store';
import { useUsersStore } from '../store/users.store';

export const AuthService = {
  async login(credentials) {
    try {
      const { data } = await api.post('/login', credentials);

      if (data.user && data.token) {
        // Store user in users store
        useUsersStore.getState().setUser(data.user.id, data.user);

        // Store userId and token in auth store
        useAuthStore.getState().login(data.user.id, data.token);

        toast.success('Logged in successfully.');
        return data;
      }
    } catch (error) {
      const message = error.response?.data?.message || 'An unknown error occurred during login.';
      toast.error(message);
      throw error;
    }
  },

  async register(credentials) {
    try {
      const { data } = await api.post('/register', credentials);

      if (data.user && data.token) {
        // Store user in users store
        useUsersStore.getState().setUser(data.user.id, data.user);

        // Store userId and token in auth store
        useAuthStore.getState().login(data.user.id, data.token);

        toast.success('Registered successfully.');
        return data;
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'An unknown error occurred during registration.';
      toast.error(message);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const { data } = await api.get('/@me');
      return data;
    } catch (error) {
      throw error;
    }
  },
};
