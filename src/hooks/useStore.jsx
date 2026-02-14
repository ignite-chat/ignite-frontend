import { create } from 'zustand';

const useStore = create((set) => ({
  user: null,
  token: null,

  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, shops: [], shopId: null });
  },

  setUser: (user) => set({ user }),

  guilds: [],

  setGuilds: (guilds) => set({ guilds }),
}));

export default useStore;
