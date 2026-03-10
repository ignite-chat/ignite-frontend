import { create } from 'zustand';
import type { UserProfile } from '../types/api';
import { DiscordApiService } from '../services/discord-api.service';

type ProfileKey = string; // `${userId}` or `${userId}:${guildId}`

const makeKey = (userId: string, guildId?: string): ProfileKey =>
  guildId ? `${userId}:${guildId}` : userId;

const MAX_CACHED_PROFILES = 20;

type DiscordProfilesStore = {
  profiles: Record<ProfileKey, UserProfile>;
  /** Tracks insertion order for LRU eviction */
  _order: ProfileKey[];

  getProfile: (userId: string, guildId?: string) => UserProfile | undefined;
  setProfile: (userId: string, guildId: string | undefined, profile: UserProfile) => void;
  fetchProfile: (userId: string, guildId?: string) => Promise<UserProfile | null>;
  removeProfile: (userId: string, guildId?: string) => void;
  clear: () => void;
};

export const useDiscordProfilesStore = create<DiscordProfilesStore>((set, get) => ({
  profiles: {},
  _order: [],

  getProfile: (userId, guildId) => get().profiles[makeKey(userId, guildId)],

  setProfile: (userId, guildId, profile) => {
    const key = makeKey(userId, guildId);
    set((state) => {
      const order = state._order.filter((k) => k !== key);
      order.push(key);
      const profiles = { ...state.profiles, [key]: profile };
      // Evict oldest entries beyond the cap
      while (order.length > MAX_CACHED_PROFILES) {
        const evict = order.shift()!;
        delete profiles[evict];
      }
      return { profiles, _order: order };
    });
  },

  fetchProfile: async (userId, guildId) => {
    const key = makeKey(userId, guildId);
    const existing = get().profiles[key];
    if (existing) return existing;

    try {
      const profile = await DiscordApiService.getUserProfile(userId, guildId);
      get().setProfile(userId, guildId, profile);
      return profile;
    } catch {
      return null;
    }
  },

  removeProfile: (userId, guildId) => {
    const key = makeKey(userId, guildId);
    set((state) => {
      const { [key]: _, ...rest } = state.profiles;
      return { profiles: rest, _order: state._order.filter((k) => k !== key) };
    });
  },

  clear: () => set({ profiles: {}, _order: [] }),
}));
