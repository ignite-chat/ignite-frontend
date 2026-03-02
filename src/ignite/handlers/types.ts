import type { User } from '../store/users.store';
import type { Channel, ChannelRolePermission, Message, Reaction } from '../store/channels.store';
import type { Guild } from '../store/guilds.store';
import type { Role } from '../store/roles.store';
import type { VoiceState } from '../store/voice.store';
import type { GuildNotificationSettings } from '../store/notification.store';

export interface GatewayHandlerContext {
  guildId: string;
  currentUserId: string;
}

export type MessageEvent = {
  channel: { id: string };
  message: Message;
};

export type ChannelEvent = {
  channel: Channel;
  channel_id?: string;
};

export type ChannelPermissionEvent = {
  channel_id: string;
  permission: ChannelRolePermission;
};

export type GuildEvent = {
  guild: Guild;
};

export type MemberTypingEvent = {
  channel: { id: string };
  member: { user: User };
};

export type RoleEvent = {
  role: Role;
};

export type EmojiEvent = {
  emoji: { id: string; guild_id: string; name: string };
};

export type StickerEvent = {
  sticker: { id: string; guild_id: string; name: string };
};

export type ReactionEvent = {
  channel_id: string;
  message_id: string;
  emoji: string;
  user_id: string;
};

export type ReactionsSetEvent = {
  channel_id: string;
  message_id: string;
  reactions: Reaction[];
};

export type VoiceStateEvent = {
  voice_state: VoiceState;
};

export type UnreadEvent = {
  channel_id: string;
  last_read_message_id?: string;
  mentioned_message_ids?: string[];
};

export type GuildSettingsEvent = {
  settings: GuildNotificationSettings;
};

export type UserUpdatedEvent = {
  user: User;
};

export type GuildJoinedEvent = {
  guild: Guild;
};
