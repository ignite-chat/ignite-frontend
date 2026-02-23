import { create } from 'zustand';

type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  [key: string]: any;
};

type DiscordStore = {
  token: string | null;
  user: DiscordUser | null;
  isConnected: boolean;
  sessionId: string | null;

  setToken: (token: string | null) => void;
  setUser: (user: DiscordUser | null) => void;
  setConnected: (connected: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  getToken: () => string | null;
  disconnect: () => void;
};

export const useDiscordStore = create<DiscordStore>((set, get) => ({
  token: localStorage.getItem('discord_token'),
  user: null,
  isConnected: false,
  sessionId: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem('discord_token', token);
    } else {
      localStorage.removeItem('discord_token');
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

  setConnected: (connected) => set({ isConnected: connected }),

  setSessionId: (sessionId) => set({ sessionId }),

  getToken: () => get().token,

  disconnect: () => {
    localStorage.removeItem('discord_token');
    set({ token: null, user: null, isConnected: false, sessionId: null });
  },
}));
