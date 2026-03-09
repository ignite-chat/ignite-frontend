import type { DiscordChannel } from './channel';

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner_id?: string;
  permissions?: string;
  channels?: DiscordChannel[];
  [key: string]: any;
};

export type MuteConfig = {
  selected_time_window: number;
  end_time: string | null;
} | null;

export type ChannelOverride = {
  channel_id: string;
  muted: boolean;
  mute_config: MuteConfig;
  message_notifications: number;
  flags: number;
  collapsed: boolean;
};

export type GuildSettings = {
  guild_id: string;
  version: number;
  suppress_roles: boolean;
  suppress_everyone: boolean;
  notify_highlights: number;
  muted: boolean;
  mute_scheduled_events: boolean;
  mute_config: MuteConfig;
  mobile_push: boolean;
  message_notifications: number;
  hide_muted_channels: boolean;
  flags: number;
  channel_overrides: ChannelOverride[];
};
