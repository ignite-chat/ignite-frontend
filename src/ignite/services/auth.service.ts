import { toast } from 'sonner';
import api from '../api.js';
import { useAuthStore } from '../store/auth.store';
import { useUsersStore } from '../store/users.store';
import type { User } from '../store/users.store';
import axios from 'axios';

export type AuthResponse = {
  user: User;
  token: string;
};

export type LoginCredentials = {
  username: string;
  password: string;
  hcaptcha_captcha_token: string;
};

export type RegisterCredentials = {
  username: string;
  email?: string | null;
  password?: string | null;
  hcaptcha_captcha_token?: string;
};

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse | undefined> {
    try {
      const { data } = await api.post<AuthResponse>('/login', credentials);

      if (data.user && data.token) {
        // Store user in users store
        useUsersStore.getState().setUser(data.user.id, data.user);

        // Store userId and token in auth store
        useAuthStore.getState().login(data.user.id, data.token);

        toast.success('Logged in successfully.');
        return data;
      }
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message || 'An unknown error occurred during login.'
          : 'An unknown error occurred during login.';
      toast.error(message);
      throw error;
    }
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse | undefined> {
    try {
      const { data } = await api.post<AuthResponse>('/register', credentials);

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
        axios.isAxiosError(error)
          ? error.response?.data?.message || 'An unknown error occurred during registration.'
          : 'An unknown error occurred during registration.';
      toast.error(message);
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>('/@me');
    return data;
  },
};
