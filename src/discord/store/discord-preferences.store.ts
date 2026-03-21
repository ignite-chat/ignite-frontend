import { create } from 'zustand';

type DiscordPreferencesStore = {
  /** Chat font size in pixels (12-24, default 16) */
  chatFontSize: number;

  setChatFontSize: (size: number) => void;
  clear: () => void;
};

const STORAGE_KEY = 'discord_preferences';

function loadFromStorage(): Partial<DiscordPreferencesStore> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: { chatFontSize: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chatFontSize: state.chatFontSize }));
}

const saved = loadFromStorage();

export const useDiscordPreferencesStore = create<DiscordPreferencesStore>((set, get) => ({
  chatFontSize: saved.chatFontSize ?? 16,

  setChatFontSize: (size) => {
    const clamped = Math.min(24, Math.max(12, size));
    set({ chatFontSize: clamped });
    saveToStorage({ chatFontSize: clamped });
  },

  clear: () => {
    set({ chatFontSize: 16 });
    localStorage.removeItem(STORAGE_KEY);
  },
}));
