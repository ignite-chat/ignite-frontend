import { create } from 'zustand';

export type GuildNotificationSettings = {
  guild_id: string;
  suppress_everyone: boolean;
  suppress_roles: boolean;
  message_notifications: number;
  muted_until: string | null;
  hide_muted_channels: boolean;
};

type NotificationStore = {
  activeChannelId: string | null;
  blockedUserIds: string[];
  mutedChannelIds: string[];
  mutedGuildIds: string[];
  guildSettings: { [guildId: string]: GuildNotificationSettings };

  setActiveChannelId: (channelId: string | null) => void;
  setBlockedUserIds: (userIds: string[]) => void;
  setMutedChannelIds: (channelIds: string[]) => void;
  setMutedGuildIds: (guildIds: string[]) => void;
  setGuildNotificationSettings: (settings: GuildNotificationSettings[]) => void;
  updateGuildNotificationSettings: (guildId: string, updates: Partial<GuildNotificationSettings>) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  activeChannelId: null,
  blockedUserIds: [],
  mutedChannelIds: [],
  mutedGuildIds: [],
  guildSettings: {},

  setActiveChannelId: (channelId) => set({ activeChannelId: channelId }),
  setBlockedUserIds: (userIds) => set({ blockedUserIds: userIds }),
  setMutedChannelIds: (channelIds) => set({ mutedChannelIds: channelIds }),
  setMutedGuildIds: (guildIds) => set({ mutedGuildIds: guildIds }),
  setGuildNotificationSettings: (settings) =>
    set({
      guildSettings: Object.fromEntries(settings.map((s) => [s.guild_id, s])),
    }),
  updateGuildNotificationSettings: (guildId, updates) =>
    set((state) => ({
      guildSettings: {
        ...state.guildSettings,
        [guildId]: {
          guild_id: guildId,
          suppress_everyone: false,
          suppress_roles: false,
          message_notifications: 0,
          muted_until: null,
          hide_muted_channels: false,
          ...state.guildSettings[guildId],
          ...updates,
        },
      },
    })),
}));
