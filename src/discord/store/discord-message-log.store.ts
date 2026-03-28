import { create } from 'zustand';
import type { DiscordMessage } from '../types';
import { useDiscordGuildsStore } from './discord-guilds.store';

export type LoggedMessage = {
  /** The original message snapshot at the time of deletion/edit */
  message: DiscordMessage;
  /** 'deleted' or 'edited' */
  type: 'deleted' | 'edited';
  /** When the event was captured (ISO string) */
  loggedAt: string;
  /** Guild ID (null for DMs) */
  guildId: string | null;
  /** The new content after edit (only for 'edited' type) */
  newContent?: string;
  /** URLs of saved attachments (Electron file paths or blob URLs) */
  savedAttachments?: string[];
};

export type ChannelLogConfig = {
  channelId: string;
  guildId: string | null;
  channelName: string;
  enabled: boolean;
};

export type MessageLogSettings = {
  /** Master toggle for message logging */
  enabled: boolean;
  /** Log all channels by default, or only explicitly enabled ones */
  logAllChannels: boolean;
  /** Per-channel overrides (channelId -> config) */
  channelConfigs: { [channelId: string]: ChannelLogConfig };
  /** Whether to persist logs permanently (IndexedDB / files) */
  permanentStorage: boolean;
  /** Whether to download and store images/attachments (Electron only) */
  storeImages: boolean;
  /** Exclude channels from guilds marked as large (250+ members) */
  excludeLargeGuilds: boolean;
};

type DiscordMessageLogStore = {
  settings: MessageLogSettings;
  /** In-memory log: channelId -> logged messages (newest first) */
  logs: { [channelId: string]: LoggedMessage[] };

  // Settings actions
  setEnabled: (enabled: boolean) => void;
  setLogAllChannels: (logAll: boolean) => void;
  setPermanentStorage: (permanent: boolean) => void;
  setStoreImages: (store: boolean) => void;
  setExcludeLargeGuilds: (exclude: boolean) => void;
  setChannelConfig: (config: ChannelLogConfig) => void;
  removeChannelConfig: (channelId: string) => void;

  // Log actions
  addLogEntry: (entry: LoggedMessage) => void;
  addLogEntries: (entries: LoggedMessage[]) => void;
  getChannelLogs: (channelId: string) => LoggedMessage[];
  clearChannelLogs: (channelId: string) => void;
  clearAllLogs: () => void;

  /** Check if a channel should be logged */
  isChannelLogged: (channelId: string, guildId?: string | null) => boolean;

  clear: () => void;
};

const SETTINGS_KEY = 'discord_message_log_settings';

function loadSettings(): MessageLogSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings(), ...parsed };
    }
  } catch {}
  return defaultSettings();
}

function defaultSettings(): MessageLogSettings {
  return {
    enabled: false,
    logAllChannels: false,
    channelConfigs: {},
    permanentStorage: false,
    storeImages: false,
    excludeLargeGuilds: true,
  };
}

function saveSettings(settings: MessageLogSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const savedSettings = loadSettings();

export const useDiscordMessageLogStore = create<DiscordMessageLogStore>((set, get) => ({
  settings: savedSettings,
  logs: {},

  setEnabled: (enabled) => {
    const settings = { ...get().settings, enabled };
    set({ settings });
    saveSettings(settings);
  },

  setLogAllChannels: (logAll) => {
    const settings = { ...get().settings, logAllChannels: logAll };
    set({ settings });
    saveSettings(settings);
  },

  setPermanentStorage: (permanent) => {
    const settings = { ...get().settings, permanentStorage: permanent };
    set({ settings });
    saveSettings(settings);
  },

  setStoreImages: (store) => {
    const settings = { ...get().settings, storeImages: store };
    set({ settings });
    saveSettings(settings);
  },

  setExcludeLargeGuilds: (exclude) => {
    const settings = { ...get().settings, excludeLargeGuilds: exclude };
    set({ settings });
    saveSettings(settings);
  },

  setChannelConfig: (config) => {
    const settings = {
      ...get().settings,
      channelConfigs: { ...get().settings.channelConfigs, [config.channelId]: config },
    };
    set({ settings });
    saveSettings(settings);
  },

  removeChannelConfig: (channelId) => {
    const { [channelId]: _, ...rest } = get().settings.channelConfigs;
    const settings = { ...get().settings, channelConfigs: rest };
    set({ settings });
    saveSettings(settings);
  },

  addLogEntry: (entry) => {
    set((state) => {
      const channelId = entry.message.channel_id;
      const existing = state.logs[channelId] || [];
      return {
        logs: {
          ...state.logs,
          [channelId]: [entry, ...existing],
        },
      };
    });
  },

  addLogEntries: (entries) => {
    if (entries.length === 0) return;
    set((state) => {
      const newLogs = { ...state.logs };
      for (const entry of entries) {
        const channelId = entry.message.channel_id;
        newLogs[channelId] = [entry, ...(newLogs[channelId] || [])];
      }
      return { logs: newLogs };
    });
  },

  getChannelLogs: (channelId) => {
    return get().logs[channelId] || [];
  },

  clearChannelLogs: (channelId) => {
    set((state) => {
      const { [channelId]: _, ...rest } = state.logs;
      return { logs: rest };
    });
  },

  clearAllLogs: () => {
    set({ logs: {} });
  },

  isChannelLogged: (channelId, guildId) => {
    const { settings } = get();
    if (!settings.enabled) return false;
    if (!window.IgniteNative) return false;

    // Check large guild exclusion before per-channel overrides
    if (guildId && settings.excludeLargeGuilds) {
      const guild = useDiscordGuildsStore.getState().guilds.find((g) => g.id === guildId);
      if (guild?.large) return false;
    }

    const config = settings.channelConfigs[channelId];
    if (config) return config.enabled;
    return settings.logAllChannels;
  },

  clear: () => {
    set({ logs: {}, settings: defaultSettings() });
    localStorage.removeItem(SETTINGS_KEY);
  },
}));
