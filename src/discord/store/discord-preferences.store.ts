import { create } from 'zustand';

type DiscordPreferencesStore = {
  /** Chat font size in pixels (12-24, default 16) */
  chatFontSize: number;
  /** Whether to show channels the user can't access */
  showHiddenChannels: boolean;

  setChatFontSize: (size: number) => void;
  setShowHiddenChannels: (show: boolean) => void;
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

function saveToStorage(state: { chatFontSize: number; showHiddenChannels: boolean }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    chatFontSize: state.chatFontSize,
    showHiddenChannels: state.showHiddenChannels,
  }));
}

const saved = loadFromStorage();

export const useDiscordPreferencesStore = create<DiscordPreferencesStore>((set, get) => ({
  chatFontSize: saved.chatFontSize ?? 16,
  showHiddenChannels: saved.showHiddenChannels ?? false,

  setChatFontSize: (size) => {
    const clamped = Math.min(24, Math.max(12, size));
    set({ chatFontSize: clamped });
    saveToStorage({ ...get(), chatFontSize: clamped });
  },

  setShowHiddenChannels: (show) => {
    set({ showHiddenChannels: show });
    saveToStorage({ ...get(), showHiddenChannels: show });
  },

  clear: () => {
    set({ chatFontSize: 16, showHiddenChannels: false });
    localStorage.removeItem(STORAGE_KEY);
  },
}));
