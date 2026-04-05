import { create } from 'zustand';

type TelegramPreferencesStore = {
  showUnreadBanner: boolean;
  setShowUnreadBanner: (value: boolean) => void;
};

const loadPref = (key: string, defaultValue: boolean): boolean => {
  try {
    const stored = localStorage.getItem(`telegram_pref_${key}`);
    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const savePref = (key: string, value: boolean) => {
  localStorage.setItem(`telegram_pref_${key}`, JSON.stringify(value));
};

export const useTelegramPreferencesStore = create<TelegramPreferencesStore>((set) => ({
  showUnreadBanner: loadPref('showUnreadBanner', true),

  setShowUnreadBanner: (value) => {
    savePref('showUnreadBanner', value);
    set({ showUnreadBanner: value });
  },
}));
