import { create } from 'zustand';
import { DiscordApiService } from '../services/discord-api.service';

export type DiscordActivity = {
  name: string;
  type: number;
  state?: string;
  details?: string;
  url?: string;
  timestamps?: { start?: number; end?: number };
  application_id?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  party?: { id?: string; size?: [number, number] };
  emoji?: { name: string; id?: string; animated?: boolean };
  created_at?: number;
  [key: string]: any;
};

/** Discord activity types */
export const ActivityType = {
  PLAYING: 0,
  STREAMING: 1,
  LISTENING: 2,
  WATCHING: 3,
  CUSTOM: 4,
  COMPETING: 5,
} as const;

type DiscordActivitiesStore = {
  /** userId -> activities array */
  activities: Record<string, DiscordActivity[]>;
  /** applicationId -> icon CDN URL (null = fetched but no icon) */
  appIcons: Record<string, string | null>;

  setActivities: (userId: string, activities: DiscordActivity[]) => void;
  setMany: (entries: { userId: string; activities: DiscordActivity[] }[]) => void;
  clearUser: (userId: string) => void;
  clear: () => void;
  fetchAppIcon: (applicationId: string) => void;
};

/** Track in-flight fetches to avoid duplicate requests */
const pendingIconFetches = new Set<string>();

export const useDiscordActivitiesStore = create<DiscordActivitiesStore>((set, get) => ({
  activities: {},
  appIcons: {},

  setActivities: (userId, activities) =>
    set((state) => ({
      activities: { ...state.activities, [userId]: activities },
    })),

  setMany: (entries) =>
    set((state) => {
      const updated = { ...state.activities };
      for (const { userId, activities } of entries) {
        if (activities && activities.length > 0) {
          updated[userId] = activities;
        } else {
          delete updated[userId];
        }
      }
      return { activities: updated };
    }),

  clearUser: (userId) =>
    set((state) => {
      const updated = { ...state.activities };
      delete updated[userId];
      return { activities: updated };
    }),

  clear: () => set({ activities: {}, appIcons: {} }),

  fetchAppIcon: (applicationId) => {
    const { appIcons } = get();
    if (applicationId in appIcons || pendingIconFetches.has(applicationId)) return;
    pendingIconFetches.add(applicationId);
    DiscordApiService.getApplication(applicationId)
      .then((app) => {
        const iconUrl = app.icon
          ? `https://cdn.discordapp.com/app-icons/${applicationId}/${app.icon}.png`
          : null;
        set((state) => ({
          appIcons: { ...state.appIcons, [applicationId]: iconUrl },
        }));
      })
      .catch(() => {
        set((state) => ({
          appIcons: { ...state.appIcons, [applicationId]: null },
        }));
      })
      .finally(() => {
        pendingIconFetches.delete(applicationId);
      });
  },
}));
