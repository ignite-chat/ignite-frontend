import { create } from 'zustand';

type DiscordPreferencesStore = {
  /** Chat font size in pixels (12-24, default 16) */
  chatFontSize: number;
  /** Whether to show channels the user can't access */
  showHiddenChannels: boolean;
  /** Render animated custom emojis as GIF (disable for performance) */
  animateEmojis: boolean;
  /** Show avatar decoration overlays */
  showAvatarDecorations: boolean;
  /** Show guild banner images in the sidebar header */
  showGuildBanners: boolean;
  /** Number of messages to fetch per request (25-100, default 50) */
  messageFetchLimit: number;
  /** Treat message requests as regular DMs instead of filtering them */
  disableMessageRequests: boolean;

  setChatFontSize: (size: number) => void;
  setShowHiddenChannels: (show: boolean) => void;
  setAnimateEmojis: (v: boolean) => void;
  setShowAvatarDecorations: (v: boolean) => void;
  setShowGuildBanners: (v: boolean) => void;
  setMessageFetchLimit: (limit: number) => void;
  setDisableMessageRequests: (v: boolean) => void;
  clear: () => void;
};

const STORAGE_KEY = 'discord_preferences';

type Persisted = {
  chatFontSize?: number;
  showHiddenChannels?: boolean;
  animateEmojis?: boolean;
  showAvatarDecorations?: boolean;
  showGuildBanners?: boolean;
  messageFetchLimit?: number;
  disableMessageRequests?: boolean;
};

function loadFromStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: Persisted) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    chatFontSize: state.chatFontSize,
    showHiddenChannels: state.showHiddenChannels,
    animateEmojis: state.animateEmojis,
    showAvatarDecorations: state.showAvatarDecorations,
    showGuildBanners: state.showGuildBanners,
    messageFetchLimit: state.messageFetchLimit,
    disableMessageRequests: state.disableMessageRequests,
  }));
}

const saved = loadFromStorage();

export const useDiscordPreferencesStore = create<DiscordPreferencesStore>((set, get) => ({
  chatFontSize: saved.chatFontSize ?? 16,
  showHiddenChannels: saved.showHiddenChannels ?? false,
  animateEmojis: saved.animateEmojis ?? true,
  showAvatarDecorations: saved.showAvatarDecorations ?? true,
  showGuildBanners: saved.showGuildBanners ?? true,
  messageFetchLimit: saved.messageFetchLimit ?? 50,
  disableMessageRequests: saved.disableMessageRequests ?? false,

  setChatFontSize: (size) => {
    const clamped = Math.min(24, Math.max(12, size));
    set({ chatFontSize: clamped });
    saveToStorage({ ...get(), chatFontSize: clamped });
  },

  setShowHiddenChannels: (show) => {
    set({ showHiddenChannels: show });
    saveToStorage({ ...get(), showHiddenChannels: show });
  },

  setAnimateEmojis: (v) => {
    set({ animateEmojis: v });
    saveToStorage({ ...get(), animateEmojis: v });
  },

  setShowAvatarDecorations: (v) => {
    set({ showAvatarDecorations: v });
    saveToStorage({ ...get(), showAvatarDecorations: v });
  },

  setShowGuildBanners: (v) => {
    set({ showGuildBanners: v });
    saveToStorage({ ...get(), showGuildBanners: v });
  },

  setDisableMessageRequests: (v) => {
    set({ disableMessageRequests: v });
    saveToStorage({ ...get(), disableMessageRequests: v });
  },

  setMessageFetchLimit: (limit) => {
    const clamped = Math.min(100, Math.max(25, limit));
    set({ messageFetchLimit: clamped });
    saveToStorage({ ...get(), messageFetchLimit: clamped });
  },

  clear: () => {
    set({ chatFontSize: 16, showHiddenChannels: false, animateEmojis: true, showAvatarDecorations: true, showGuildBanners: true, messageFetchLimit: 50, disableMessageRequests: false });
    localStorage.removeItem(STORAGE_KEY);
  },
}));
