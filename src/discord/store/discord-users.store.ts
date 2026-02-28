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
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  activities?: any[];
  client_status?: { desktop?: string; mobile?: string; web?: string };
  [key: string]: any;
};

type Presence = {
  user_id: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activities?: any[];
  client_status?: { desktop?: string; mobile?: string; web?: string };
};

type DiscordUsersStore = {
  users: { [userId: string]: DiscordUser };

  setUsers: (users: DiscordUser[]) => void;
  addUser: (user: DiscordUser) => void;
  addUsers: (users: DiscordUser[]) => void;
  getUser: (userId: string) => DiscordUser | undefined;
  updatePresence: (presence: Presence) => void;
  setPresences: (presences: Presence[]) => void;
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

  updatePresence: (presence) =>
    set((state) => {
      const existing = state.users[presence.user_id];
      if (!existing) return state;
      return {
        users: {
          ...state.users,
          [presence.user_id]: {
            ...existing,
            status: presence.status,
            activities: presence.activities,
            client_status: presence.client_status,
          },
        },
      };
    }),

  setPresences: (presences) =>
    set((state) => {
      const updated = { ...state.users };
      for (const p of presences) {
        if (updated[p.user_id]) {
          updated[p.user_id] = {
            ...updated[p.user_id],
            status: p.status,
            activities: p.activities,
            client_status: p.client_status,
          };
        }
      }
      return { users: updated };
    }),

  clear: () => set({ users: {} }),
}));
