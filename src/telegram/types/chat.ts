import type { TelegramMessage } from './message';

export type TelegramChatType = 'private' | 'group' | 'supergroup' | 'channel';

export type TelegramChat = {
  id: string;
  type: TelegramChatType;
  title: string;
  photo?: string | null;
  lastMessage?: TelegramMessage | null;
  unreadCount: number;
  unreadMentionCount: number;
  pinned: boolean;
  archived: boolean;
  muteUntil?: number;
  /** Number of members in group/supergroup/channel */
  memberCount?: number;
  /** Username for supergroups/channels */
  username?: string;
};
