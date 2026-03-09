// User & Authentication
export type { DiscordUser, Presence, ScannedUser, RemoteAuthState } from './user';

// Guild
export type { DiscordGuild, GuildSettings, MuteConfig, ChannelOverride } from './guild';

// Channel
export type { DiscordChannel, ReadStateEntry } from './channel';

// Message
export type { DiscordMessage, PendingMessage } from './message';

// Member
export type {
  DiscordMember,
  MemberListGroup,
  MemberListItem,
  MemberListData,
} from './member';

// Relationship
export type { DiscordRelationship } from './relationship';

// Activity
export type { DiscordActivity } from './activity';

// Voice
export type { VoiceState } from './voice';

// Thread / Forum
export type { ForumThread, FirstMessage, ChannelThreadData } from './thread';

// Misc (typing, captcha, gateway, permissions)
export type {
  DiscordTypingUser,
  CaptchaChallenge,
  CaptchaSolution,
  GatewayEventHandler,
  PermissionOverwrite,
  Role,
} from './misc';

// API response types
export type {
  UserProfile,
  DiscordApplication,
  ForumPostData,
  ForumThreadSearchResult,
  MessageSearchResult,
  AckMessageResponse,
  InteractionPayload,
  AckBulkEntry,
  UserGuildSettingsResponse,
} from './api';
