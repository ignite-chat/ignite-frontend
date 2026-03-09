import { create } from 'zustand';
import type { GuildSettings } from '../types';

type DiscordGuildSettingsStore = {
  /** Guild settings keyed by guild_id */
  settings: { [guildId: string]: GuildSettings };

  setAllSettings: (entries: GuildSettings[]) => void;
  updateGuildSettings: (guildId: string, updates: Partial<GuildSettings>) => void;
  getGuildSettings: (guildId: string) => GuildSettings | undefined;
  clear: () => void;
};

const DEFAULT_SETTINGS: Omit<GuildSettings, 'guild_id'> = {
  version: 0,
  suppress_roles: false,
  suppress_everyone: false,
  notify_highlights: 0,
  muted: false,
  mute_scheduled_events: false,
  mute_config: null,
  mobile_push: true,
  message_notifications: 1,
  hide_muted_channels: false,
  flags: 0,
  channel_overrides: [],
};

export const useDiscordGuildSettingsStore = create<DiscordGuildSettingsStore>((set, get) => ({
  settings: {},

  setAllSettings: (entries) =>
    set({
      settings: Object.fromEntries(
        entries.map((e) => [e.guild_id, { ...DEFAULT_SETTINGS, ...e }])
      ),
    }),

  updateGuildSettings: (guildId, updates) =>
    set((state) => ({
      settings: {
        ...state.settings,
        [guildId]: {
          ...DEFAULT_SETTINGS,
          ...state.settings[guildId],
          ...updates,
          guild_id: guildId,
        },
      },
    })),

  getGuildSettings: (guildId) => get().settings[guildId],

  clear: () => set({ settings: {} }),
}));
