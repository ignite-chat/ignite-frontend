import { create } from 'zustand';

type GuildSettings = {
  guild_id: string;
  suppress_everyone: boolean;
  suppress_roles: boolean;
  message_notifications: number; // 0 = All Messages, 1 = Only @mentions, 2 = Nothing
  muted_until: string | null;
  hide_muted_channels: boolean;
};

type NotificationStore = {
  activeChannelId: string | null;
  blockedUserIds: string[];
  mutedChannelIds: string[];
  mutedGuildIds: string[];
  guildSettings: { [guildId: string]: GuildSettings };

  setActiveChannelId: (channelId: string | null) => void;
  setBlockedUserIds: (userIds: string[]) => void;
  setMutedChannelIds: (channelIds: string[]) => void;
  setMutedGuildIds: (guildIds: string[]) => void;
  setGuildSettings: (settings: GuildSettings[]) => void;
  updateGuildSettings: (guildId: string, updates: Partial<GuildSettings>) => void;
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
  setGuildSettings: (settings) =>
    set({
      guildSettings: Object.fromEntries(settings.map((s) => [s.guild_id, s])),
    }),
  updateGuildSettings: (guildId, updates) =>
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
