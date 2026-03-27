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

// ── Guild Profile (/guilds/:id/profile) ────────────────────────────

export type GuildProfileGameActivity = {
  activity_level: number;
  activity_score: number;
};

export type GuildProfile = {
  id: string;
  name: string;
  icon_hash: string | null;
  member_count: number;
  online_count: number;
  description: string | null;
  banner_hash: string | null;
  custom_banner_hash: string | null;
  game_application_ids: string[];
  game_activity: { [applicationId: string]: GuildProfileGameActivity };
  tag: string;
  badge: number;
  badge_color_primary: string | null;
  badge_color_secondary: string | null;
  badge_hash: string | null;
  traits: string[];
  features: string[];
  visibility: number;
  premium_subscription_count: number;
  premium_tier: number;
};

// ── Guild Top Emojis (/guilds/:id/top-emojis) ─────────────────────

export type GuildTopEmojiItem = {
  emoji_id: string;
  emoji_rank: number;
};

export type GuildTopEmojisResponse = {
  items: GuildTopEmojiItem[];
};

// ── Application Identities (/users/:id/application-identities) ────

export type ApplicationIdentityImage = {
  id: string;
  url: string;
  proxy_url: string;
  width: number;
  height: number;
  placeholder: string;
  placeholder_version: number;
  content_type: string;
  loading_state: number;
  flags: number;
};

export type ApplicationIdentityProfileData = {
  [key: string]: any;
};

export type ApplicationIdentityProfile = {
  username: string;
  metadata: string;
  data: ApplicationIdentityProfileData;
  data_trusted: boolean;
  connection_visible: boolean;
};

export type ApplicationIdentity = {
  application_id: string;
  provider_issued_user_id: string;
  profile: ApplicationIdentityProfile;
  profiles: ApplicationIdentityProfile[];
};

export type ApplicationIdentitiesResponse = {
  identities: ApplicationIdentity[];
};
