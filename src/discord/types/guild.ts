import type { DiscordChannel } from './channel';

export type DiscordGuildProperties = {
  name: string;
  icon: string | null;
  owner_id?: string;
  discovery_splash?: string | null;
  hub_type?: string | null;
  nsfw_level?: number;
  safety_alerts_channel_id?: string | null;
  rules_channel_id?: string | null;
  description?: string | null;
  features?: string[];
  roles?: any[];
  [key: string]: any;
};

export type DiscordGuild = {
  id: string;
  properties: DiscordGuildProperties;
  channels?: DiscordChannel[];
  roles?: any[];
  emojis?: any[];
  stickers?: any[];
  member_count?: number;
  premium_subscription_count?: number;
  large?: boolean;
  lazy?: boolean;
  joined_at?: string;
  data_mode?: string;
  threads?: any[];
  stage_instances?: any[];
  guild_scheduled_events?: any[];
  version?: number;
  /** @deprecated Use properties.name */
  name?: string;
  /** @deprecated Use properties.icon */
  icon?: string | null;
  /** @deprecated Use properties.owner_id */
  owner_id?: string;
  permissions?: string;
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
