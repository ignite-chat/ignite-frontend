import { create } from 'zustand';

type AuthStore = {
  userId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  initialized: boolean;

  login: (userId: string, token: string) => void;
  logout: () => void;
  setUserId: (userId: string) => void;
  setToken: (token: string) => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  token: null,
  isAuthenticated: false,
  initialized: false,

  login: (userId, token) => {
    localStorage.setItem('token', token);
    set({ userId, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ userId: null, token: null, isAuthenticated: false, initialized: false });
  },

  setUserId: (userId) => set({ userId }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    }
    set({ token });
  },

  setInitialized: (initialized) => set({ initialized }),
}));
