import { create } from 'zustand';

type UserVolumeEntry = {
  volume: number; // 0-100 (100 = normal)
  muted: boolean;
};

type DiscordUserVolumeStore = {
  /** userId -> volume settings */
  volumes: { [userId: string]: UserVolumeEntry };
  setUserVolume: (userId: string, volume: number) => void;
  setUserMuted: (userId: string, muted: boolean) => void;
  getUserVolume: (userId: string) => number;
  isUserMuted: (userId: string) => boolean;
  /** Get the effective gain (0-2) accounting for mute */
  getEffectiveGain: (userId: string) => number;
};

const STORAGE_KEY = 'discord_user_volumes';

function loadFromStorage(): { [userId: string]: UserVolumeEntry } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(volumes: { [userId: string]: UserVolumeEntry }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
}

const saved = loadFromStorage();

export const useDiscordUserVolumeStore = create<DiscordUserVolumeStore>((set, get) => ({
  volumes: saved,

  setUserVolume: (userId, volume) => {
    const clamped = Math.min(100, Math.max(0, volume));
    set((state) => {
      const entry = state.volumes[userId] || { volume: 100, muted: false };
      const volumes = { ...state.volumes, [userId]: { ...entry, volume: clamped } };
      saveToStorage(volumes);
      return { volumes };
    });
  },

  setUserMuted: (userId, muted) => {
    set((state) => {
      const entry = state.volumes[userId] || { volume: 100, muted: false };
      const volumes = { ...state.volumes, [userId]: { ...entry, muted } };
      saveToStorage(volumes);
      return { volumes };
    });
  },

  getUserVolume: (userId) => {
    return get().volumes[userId]?.volume ?? 100;
  },

  isUserMuted: (userId) => {
    return get().volumes[userId]?.muted ?? false;
  },

  getEffectiveGain: (userId) => {
    const entry = get().volumes[userId];
    if (!entry) return 1;
    if (entry.muted) return 0;
    return entry.volume / 100;
  },
}));
