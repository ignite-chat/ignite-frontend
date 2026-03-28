import { create } from 'zustand';
import type { DiscordUser, Presence } from '../types';

export type { DiscordUser } from '../types';

/** Max users kept in memory. Oldest entries are evicted when exceeded. */
const MAX_USERS = 5000;

type DiscordUsersStore = {
  users: { [userId: string]: DiscordUser };

  setUsers: (users: DiscordUser[]) => void;
  addUser: (user: DiscordUser) => void;
  addUsers: (users: DiscordUser[]) => void;
  getUser: (userId: string) => DiscordUser | undefined;
  updatePresence: (presence: Presence) => void;
  setPresences: (presences: Presence[], fromInitialLoad?: boolean) => void;
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
      // Evict oldest entries when over the limit
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
            processed_at_timestamp: presence.processed_at_timestamp,
            // Live updates: if they go offline, clear invisible flag (they actually went offline).
            // If they come online, also clear it.
            invisible: presence.status !== 'offline' ? false : existing.invisible,
          },
        },
      };
    }),

  setPresences: (presences, fromInitialLoad = false) =>
    set((state) => {
      const updated = { ...state.users };
      for (const p of presences) {
        if (updated[p.user_id]) {
          updated[p.user_id] = {
            ...updated[p.user_id],
            status: p.status,
            activities: p.activities,
            client_status: p.client_status,
            processed_at_timestamp: p.processed_at_timestamp,
            // Only flag as invisible from READY/READY_SUPPLEMENTAL — users
            // received offline via GUILD_MEMBERS_CHUNK or member list updates
            // are genuinely offline, not invisible.
            invisible: fromInitialLoad ? p.status === 'offline' : updated[p.user_id].invisible,
          };
        }
      }
      return { users: updated };
    }),

  clear: () => set({ users: {} }),
}));
