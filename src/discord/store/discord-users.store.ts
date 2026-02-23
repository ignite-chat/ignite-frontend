import { create } from 'zustand';

type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  display_name?: string | null;
  avatar: string | null;
  avatar_decoration_data?: {
    sku_id: string;
    expires_at: string | null;
    asset: string;
  } | null;
  bot?: boolean;
  public_flags?: number;
  [key: string]: any;
};

type DiscordUsersStore = {
  users: { [userId: string]: DiscordUser };

  setUsers: (users: DiscordUser[]) => void;
  addUser: (user: DiscordUser) => void;
  addUsers: (users: DiscordUser[]) => void;
  getUser: (userId: string) => DiscordUser | undefined;
  clear: () => void;
};

export const useDiscordUsersStore = create<DiscordUsersStore>((set, get) => ({
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
      return { users: updated };
    }),

  getUser: (userId) => get().users[userId],

  clear: () => set({ users: {} }),
}));
