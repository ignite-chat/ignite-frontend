import { create } from 'zustand';
import type { TelegramUser } from '../types';

const MAX_USERS = 5000;

type TelegramUsersStore = {
  users: { [userId: string]: TelegramUser };

  setUsers: (users: TelegramUser[]) => void;
  addUser: (user: TelegramUser) => void;
  addUsers: (users: TelegramUser[]) => void;
  getUser: (userId: string) => TelegramUser | undefined;
  updateStatus: (userId: string, status: TelegramUser['status'], lastOnline?: number) => void;
  clear: () => void;
};

export const useTelegramUsersStore = create<TelegramUsersStore>((set, get) => ({
  users: {},

  setUsers: (users) =>
    set({
      users: Object.fromEntries(users.map((u) => [u.id, u])),
    }),

  addUser: (user) =>
    set((state) => ({
      users: { ...state.users, [user.id]: { ...state.users[user.id], ...user } },
    })),

  addUsers: (users) =>
    set((state) => {
      const updated = { ...state.users };
      for (const user of users) {
        updated[user.id] = { ...updated[user.id], ...user };
      }
      const keys = Object.keys(updated);
      if (keys.length > MAX_USERS) {
        const excess = keys.length - MAX_USERS;
        for (let i = 0; i < excess; i++) {
          delete updated[keys[i]];
        }
      }
      return { users: updated };
    }),

  getUser: (userId) => get().users[userId],

  updateStatus: (userId, status, lastOnline) =>
    set((state) => {
      const existing = state.users[userId];
      if (!existing) return state;
      return {
        users: {
          ...state.users,
          [userId]: { ...existing, status, ...(lastOnline !== undefined && { lastOnline }) },
        },
      };
    }),

  clear: () => set({ users: {} }),
}));
