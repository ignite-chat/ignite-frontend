import { create } from 'zustand';
import type { UserProfile } from '../types/api';
import { DiscordApiService } from '../services/discord-api.service';

type ProfileKey = string; // `${userId}` or `${userId}:${guildId}`

const makeKey = (userId: string, guildId?: string): ProfileKey =>
  guildId ? `${userId}:${guildId}` : userId;

/** In-flight request deduplication — prevents duplicate API calls for the same profile */
const _inflight = new Map<ProfileKey, Promise<UserProfile | null>>();

type DiscordProfilesStore = {
  profiles: Record<ProfileKey, UserProfile>;

  getProfile: (userId: string, guildId?: string) => UserProfile | undefined;
  setProfile: (userId: string, guildId: string | undefined, profile: UserProfile) => void;
  fetchProfile: (userId: string, guildId?: string) => Promise<UserProfile | null>;
  removeProfile: (userId: string, guildId?: string) => void;
  clear: () => void;
};

export const useDiscordProfilesStore = create<DiscordProfilesStore>((set, get) => ({
  profiles: {},

  getProfile: (userId, guildId) => get().profiles[makeKey(userId, guildId)],

  setProfile: (userId, guildId, profile) => {
    const key = makeKey(userId, guildId);
    set((state) => ({
      profiles: { ...state.profiles, [key]: profile },
    }));
  },

  fetchProfile: async (userId, guildId) => {
    const key = makeKey(userId, guildId);
    const existing = get().profiles[key];
    if (existing) return existing;

    // Deduplicate in-flight requests
    const inflight = _inflight.get(key);
    if (inflight) return inflight;

    const request = (async () => {
      try {
        const profile = await DiscordApiService.getUserProfile(userId, guildId);
        get().setProfile(userId, guildId, profile);
        return profile;
      } catch {
        return null;
      } finally {
        _inflight.delete(key);
      }
    })();

    _inflight.set(key, request);
    return request;
  },

  removeProfile: (userId, guildId) => {
    const key = makeKey(userId, guildId);
    set((state) => {
      const { [key]: _, ...rest } = state.profiles;
      return { profiles: rest };
    });
  },

  clear: () => set({ profiles: {} }),
}));
