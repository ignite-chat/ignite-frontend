import type { DiscordGuild } from './guild';
import type { DiscordMessage } from './message';
import type { DiscordUser } from './user';
import type { ForumThread } from './thread';

export type UserProfile = {
  user: DiscordUser;
  user_profile?: {
    bio?: string | null;
    accent_color?: number | null;
    banner?: string | null;
    theme_colors?: number[] | null;
    pronouns?: string;
    [key: string]: any;
  };
  guild_member_profile?: {
    guild_id: string;
    bio?: string | null;
    banner?: string | null;
    accent_color?: number | null;
    theme_colors?: number[] | null;
    pronouns?: string;
    [key: string]: any;
  };
  mutual_guilds?: { id: string; nick: string | null }[];
  mutual_friends?: DiscordUser[];
  mutual_friends_count?: number;
  connected_accounts?: {
    type: string;
    id: string;
    name: string;
    verified: boolean;
    [key: string]: any;
  }[];
  premium_since?: string | null;
  premium_type?: number | null;
  premium_guild_since?: string | null;
  [key: string]: any;
};

export type DiscordApplication = {
  id: string;
  name: string;
  icon: string | null;
  description?: string;
  bot_public?: boolean;
  [key: string]: any;
};

export type ForumPostData = {
  threads: ForumThread[];
  first_messages: (DiscordMessage | null)[];
  [key: string]: any;
};

export type ForumThreadSearchResult = {
  threads: ForumThread[];
  members: any[];
  total_results: number;
  has_more: boolean;
  first_messages: Record<string, DiscordMessage>;
  [key: string]: any;
};

export type MessageSearchResult = {
  messages: DiscordMessage[][];
  total_results: number;
  analytics_id?: string;
  [key: string]: any;
};

export type AckMessageResponse = {
  token: string | null;
};

export type InteractionPayload = {
  type: number;
  application_id: string;
  channel_id: string;
  guild_id?: string;
  data: any;
  message_flags?: number;
  message_id: string;
  nonce: string;
  session_id: string;
};

export type AckBulkEntry = {
  channel_id: string;
  message_id: string;
  read_state_type: number;
};

export type UserGuildSettingsResponse = {
  entries: {
    [guildId: string]: any;
  };
  partial: boolean;
  version: number;
};
