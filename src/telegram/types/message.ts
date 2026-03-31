export type TelegramMessageEntity = {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'pre' | 'url' | 'textUrl' | 'mention' | 'hashtag' | 'botCommand' | 'spoiler' | 'blockquote';
  offset: number;
  length: number;
  /** URL for textUrl entities */
  url?: string;
};

export type TelegramMessageMedia = {
  type: 'photo' | 'document' | 'video' | 'audio' | 'voice' | 'sticker' | 'animation' | 'videoNote' | 'contact' | 'location' | 'poll' | 'webpage' | 'venue' | 'game' | 'invoice' | 'dice' | 'story' | 'giveaway' | 'paidMedia' | 'unsupported';
  fileName?: string;
  mimeType?: string;
  size?: number;
  /** Cached blob URL after downloading */
  cachedUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
  captionEntities?: TelegramMessageEntity[];
  /** Web page preview */
  url?: string;
  siteName?: string;
  title?: string;
  description?: string;
  /** Dice emoji + value */
  emoji?: string;
  value?: number;
  /** Venue */
  address?: string;
  /** Game */
  gameName?: string;
  /** Invoice */
  currency?: string;
  totalAmount?: number;
};

export type TelegramMessage = {
  id: number;
  chatId: string;
  senderId?: string;
  senderName?: string;
  text: string;
  date: number;
  editDate?: number;
  replyToMsgId?: number;
  entities?: TelegramMessageEntity[];
  media?: TelegramMessageMedia | null;
  /** Action messages (user joined, left, title changed, etc.) */
  action?: string;
  /** Whether the message is outgoing (sent by current user) */
  out?: boolean;
  /** Group messages by sender+time */
  grouped_id?: string;
};

export type TelegramPendingMessage = {
  nonce: string;
  chatId: string;
  text: string;
  senderId: string;
  senderName: string;
  date: number;
  replyToMsgId?: number;
  status: 'sending' | 'failed';
  error?: { message: string } | null;
};
