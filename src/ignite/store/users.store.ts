import { create } from 'zustand';
import { useAuthStore } from './auth.store';

export type User = {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio?: string | null;
  is_bot: boolean;
  created_at: string;
  updated_at: string;
};

type UsersStore = {
  users: { [userId: string]: User };

  setUser: (userId: string, user: User) => void;
  setUsers: (users: User[]) => void;
  getUser: (userId: string) => User | undefined;
  getCurrentUser: () => User | undefined;
};

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: {},

  setUser: (userId, user) =>
    set((state) => ({
      users: {
        ...state.users,
        [userId]: user,
      },
    })),

  setUsers: (users) =>
    set((state) => {
      const usersMap = users.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as { [userId: string]: User }
      );

      return {
        users: {
          ...state.users,
          ...usersMap,
        },
      };
    }),

  getUser: (userId) => get().users[userId],

  getCurrentUser: () => {
    const userId = useAuthStore.getState().userId;
    return userId ? get().users[userId] : undefined;
  },
}));
