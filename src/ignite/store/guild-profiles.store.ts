import { create } from 'zustand';
import api from '@/ignite/api';

// Backend returns a loose shape (name, description, owner_id, is_discoverable,
// afk_channel_id, system_channel_id, rules_channel_id, mfa_level, etc.) and
// callers already handle missing fields, so we don't lock it down here.
export type GuildProfile = Record<string, any>;

const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes

type Entry = { data: GuildProfile; fetchedAt: number };

// Module-level promise map so simultaneous callers dedupe onto one request.
// Not in Zustand state because these promises aren't serialisable and
// shouldn't trigger re-renders.
const pending = new Map<string, Promise<GuildProfile>>();

type GuildProfilesStore = {
  profiles: Record<string, Entry>;

  getProfile: (guildId: string) => GuildProfile | undefined;
  setProfile: (guildId: string, data: GuildProfile) => void;
  /**
   * Returns the cached profile when present AND fresh (< STALE_AFTER_MS old).
   * Otherwise fetches from `/guilds/:id/profile`, caches, and returns the
   * new data. Simultaneous callers share one in-flight request. Pass
   * `{ force: true }` to bypass both the freshness check and dedupe.
   */
  fetchProfile: (guildId: string, opts?: { force?: boolean }) => Promise<GuildProfile>;
  invalidate: (guildId: string) => void;
  clear: () => void;
};

export const useGuildProfilesStore = create<GuildProfilesStore>((set, get) => ({
  profiles: {},

  getProfile: (guildId) => get().profiles[guildId]?.data,

  setProfile: (guildId, data) =>
    set((state) => ({
      profiles: {
        ...state.profiles,
        [guildId]: { data, fetchedAt: Date.now() },
      },
    })),

  fetchProfile: async (guildId, opts) => {
    if (!opts?.force) {
      const entry = get().profiles[guildId];
      if (entry && Date.now() - entry.fetchedAt < STALE_AFTER_MS) {
        return entry.data;
      }
      const inflight = pending.get(guildId);
      if (inflight) return inflight;
    }

    const promise = api
      .get<GuildProfile>(`/guilds/${guildId}/profile`)
      .then(({ data }) => {
        set((state) => ({
          profiles: {
            ...state.profiles,
            [guildId]: { data, fetchedAt: Date.now() },
          },
        }));
        pending.delete(guildId);
        return data;
      })
      .catch((err) => {
        pending.delete(guildId);
        throw err;
      });

    pending.set(guildId, promise);
    return promise;
  },

  invalidate: (guildId) =>
    set((state) => {
      const { [guildId]: _, ...rest } = state.profiles;
      return { profiles: rest };
    }),

  clear: () => set({ profiles: {} }),
}));
