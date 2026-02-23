import { create } from 'zustand';
import { useAuthStore } from './auth.store';

type User = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  [key: string]: any;
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
