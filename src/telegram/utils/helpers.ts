import { Api } from 'telegram';
import type { Dialog } from 'telegram/tl/custom/dialog';
import type {
  TelegramUser,
  TelegramChat,
  TelegramChatType,
  TelegramMessage,
  TelegramMessageEntity,
  TelegramMessageMedia,
} from '../types';

/**
 * Convert a GramJS BigInteger, Peer, or number to a string for use as store keys.
 * GramJS uses the `big-integer` library (not native bigint), so all IDs have `.toString()`.
 */
export function bigIntToString(id: any): string {
  if (id === undefined || id === null) return '0';
  if (typeof id === 'number') return id.toString();
  if (typeof id === 'bigint') return id.toString();

  // Handle Peer types
  if (id instanceof Api.PeerUser) return id.userId.toString();
  if (id instanceof Api.PeerChat) {
    const chatIdStr = id.chatId.toString();
    return '-' + chatIdStr;
  }
  if (id instanceof Api.PeerChannel) {
    const channelIdStr = id.channelId.toString();
    return '-100' + channelIdStr;
  }

  // BigInteger or anything else with .toString()
  if (typeof id.toString === 'function') return id.toString();

  return '0';
}

/**
 * Convert a string ID back to BigInt for API calls.
 */
export function stringToBigInt(id: string): bigint {
  return BigInt(id);
}

/**
 * Convert a GramJS User to our TelegramUser type.
 */
export function gramUserToTelegramUser(user: Api.User): TelegramUser {
  let status: TelegramUser['status'] = undefined;
  let lastOnline: number | undefined;

  if (user.status instanceof Api.UserStatusOnline) {
    status = 'online';
  } else if (user.status instanceof Api.UserStatusOffline) {
    status = 'offline';
    lastOnline = user.status.wasOnline;
  } else if (user.status instanceof Api.UserStatusRecently) {
    status = 'recently';
  } else if (user.status instanceof Api.UserStatusLastWeek) {
    status = 'lastWeek';
  } else if (user.status instanceof Api.UserStatusLastMonth) {
    status = 'lastMonth';
  }

  return {
    id: user.id.toString(),
    firstName: user.deleted ? 'Deleted Account' : user.firstName || '',
    lastName: user.deleted ? undefined : user.lastName || undefined,
    username: user.deleted ? undefined : user.username || undefined,
    phone: user.phone || undefined,
    bot: user.bot || false,
    deleted: user.deleted || false,
    status,
    lastOnline,
  };
}

/**
 * Determine chat type from a GramJS Dialog.
 */
function getChatType(dialog: Dialog): TelegramChatType {
  if (dialog.entity instanceof Api.User) return 'private';
  if (dialog.entity instanceof Api.Chat) return 'group';
  if (dialog.entity instanceof Api.Channel) {
    return dialog.entity.megagroup ? 'supergroup' : 'channel';
  }
  return 'private';
}

/**
 * Convert a GramJS Dialog to our TelegramChat type.
 */
export function gramDialogToTelegramChat(dialog: Dialog): TelegramChat {
  const type = getChatType(dialog);
  let title = '';
  let username: string | undefined;
  let memberCount: number | undefined;

  if (dialog.entity instanceof Api.User) {
    title = dialog.entity.deleted ? 'Deleted Account' : [dialog.entity.firstName, dialog.entity.lastName].filter(Boolean).join(' ') || dialog.entity.username || 'Unknown';
    username = dialog.entity.username || undefined;
  } else if (dialog.entity instanceof Api.Chat) {
    title = dialog.entity.title || 'Group';
    memberCount = dialog.entity.participantsCount || undefined;
  } else if (dialog.entity instanceof Api.Channel) {
    title = dialog.entity.title || 'Channel';
    username = dialog.entity.username || undefined;
    memberCount = dialog.entity.participantsCount || undefined;
  }

  // Build proper Telegram chat IDs:
  // Users: positive ID
  // Basic groups: negative ID (-chatId)
  // Channels/supergroups: -100 prefix (-100channelId)
  let id: string;
  const rawId = dialog.entity?.id?.toString() || '0';
  if (dialog.entity instanceof Api.Chat) {
    id = '-' + rawId;
  } else if (dialog.entity instanceof Api.Channel) {
    id = '-100' + rawId;
  } else {
    id = rawId;
  }

  return {
    id,
    type,
    title,
    photo: null, // Photos are loaded asynchronously
    lastMessage: dialog.message instanceof Api.Message ? gramMessageToTelegramMessage(dialog.message) : null,
    unreadCount: dialog.unreadCount || 0,
    unreadMentionCount: dialog.unreadMentionsCount || 0,
    pinned: dialog.pinned || false,
    archived: dialog.archived || false,
    muteUntil: undefined,
    memberCount,
    username,
  };
}

/**
 * Convert a GramJS Message to our TelegramMessage type.
 */
export function gramMessageToTelegramMessage(message: Api.Message): TelegramMessage {
  const chatId = bigIntToString(message.peerId);

  let senderId: string | undefined;
  let senderName: string | undefined;

  if (message.fromId) {
    senderId = bigIntToString(message.fromId);
  } else if (message.peerId instanceof Api.PeerUser) {
    senderId = message.out ? undefined : message.peerId.userId.toString();
  }

  if (message.sender instanceof Api.User) {
    senderName = [message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ');
  } else if (message.sender instanceof Api.Channel) {
    senderName = message.sender.title;
  }

  return {
    id: message.id,
    chatId,
    senderId,
    senderName,
    text: message.message || '',
    date: message.date || 0,
    editDate: message.editDate || undefined,
    replyToMsgId: message.replyTo instanceof Api.MessageReplyHeader ? message.replyTo.replyToMsgId : undefined,
    entities: message.entities ? gramEntitiesToTelegramEntities(message.entities) : undefined,
    media: message.media ? gramMediaToTelegramMedia(message.media) : null,
    action: message.action ? describeAction(message.action) : undefined,
    out: message.out || false,
    grouped_id: message.groupedId?.toString(),
  };
}

/**
 * Convert GramJS message entities to our format.
 */
function gramEntitiesToTelegramEntities(entities: Api.TypeMessageEntity[]): TelegramMessageEntity[] {
  return entities.map((e) => {
    let type: TelegramMessageEntity['type'] = 'bold';
    let url: string | undefined;

    if (e instanceof Api.MessageEntityBold) type = 'bold';
    else if (e instanceof Api.MessageEntityItalic) type = 'italic';
    else if (e instanceof Api.MessageEntityUnderline) type = 'underline';
    else if (e instanceof Api.MessageEntityStrike) type = 'strikethrough';
    else if (e instanceof Api.MessageEntityCode) type = 'code';
    else if (e instanceof Api.MessageEntityPre) type = 'pre';
    else if (e instanceof Api.MessageEntityUrl) type = 'url';
    else if (e instanceof Api.MessageEntityTextUrl) {
      type = 'textUrl';
      url = e.url;
    } else if (e instanceof Api.MessageEntityMention) type = 'mention';
    else if (e instanceof Api.MessageEntityHashtag) type = 'hashtag';
    else if (e instanceof Api.MessageEntityBotCommand) type = 'botCommand';
    else if (e instanceof Api.MessageEntitySpoiler) type = 'spoiler';
    else if (e instanceof Api.MessageEntityBlockquote) type = 'blockquote';

    return {
      type,
      offset: e.offset,
      length: e.length,
      ...(url && { url }),
    };
  });
}

/**
 * Convert GramJS media to our format.
 */
function gramMediaToTelegramMedia(media: Api.TypeMessageMedia): TelegramMessageMedia | null {
  if (media instanceof Api.MessageMediaPhoto) {
    return { type: 'photo' };
  }
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    if (doc instanceof Api.Document) {
      const isSticker = doc.attributes.some((a: any) => a instanceof Api.DocumentAttributeSticker);
      const isAnimated = doc.attributes.some((a: any) => a instanceof Api.DocumentAttributeAnimated);
      const isVideo = doc.attributes.some((a: any) => a instanceof Api.DocumentAttributeVideo);
      const isAudio = doc.attributes.some((a: any) => a instanceof Api.DocumentAttributeAudio);

      const getSize = (size: any): number => {
        if (typeof size === 'number') return size;
        if (size && typeof size.toJSNumber === 'function') return size.toJSNumber();
        return Number(size) || 0;
      };

      if (isSticker) return { type: 'sticker', mimeType: doc.mimeType, size: getSize(doc.size) };
      if (isAnimated) return { type: 'animation', mimeType: doc.mimeType };
      if (isVideo) {
        const videoAttr = doc.attributes.find((a: any) => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo | undefined;
        return {
          type: videoAttr?.roundMessage ? 'videoNote' : 'video',
          mimeType: doc.mimeType,
          size: getSize(doc.size),
          width: videoAttr?.w,
          height: videoAttr?.h,
          duration: videoAttr?.duration,
        };
      }
      if (isAudio) {
        const audioAttr = doc.attributes.find((a: any) => a instanceof Api.DocumentAttributeAudio) as Api.DocumentAttributeAudio | undefined;
        return {
          type: audioAttr?.voice ? 'voice' : 'audio',
          mimeType: doc.mimeType,
          duration: audioAttr?.duration,
        };
      }

      const filenameAttr = doc.attributes.find((a: any) => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename | undefined;
      return {
        type: 'document',
        fileName: filenameAttr?.fileName,
        mimeType: doc.mimeType,
        size: getSize(doc.size),
      };
    }
    return { type: 'document' };
  }
  if (media instanceof Api.MessageMediaContact) {
    return {
      type: 'contact',
      title: [media.firstName, media.lastName].filter(Boolean).join(' ') || 'Contact',
      description: media.phoneNumber || undefined,
    };
  }
  if (media instanceof Api.MessageMediaGeo || media instanceof Api.MessageMediaGeoLive) {
    return { type: 'location' };
  }
  if (media instanceof Api.MessageMediaPoll) {
    const question = media.poll?.question;
    // question may be a string or a TextWithEntities object
    const questionText = typeof question === 'string' ? question : (question as any)?.text || 'Poll';
    return { type: 'poll', title: questionText };
  }
  if (media instanceof Api.MessageMediaWebPage) {
    const page = media.webpage;
    if (page instanceof Api.WebPage) {
      return {
        type: 'webpage',
        url: page.url,
        siteName: page.siteName || undefined,
        title: page.title || undefined,
        description: page.description || undefined,
      };
    }
    return { type: 'webpage' };
  }
  if (media instanceof Api.MessageMediaVenue) {
    return {
      type: 'venue',
      title: media.title,
      address: media.address,
    };
  }
  if (media instanceof Api.MessageMediaGame) {
    return {
      type: 'game',
      gameName: media.game?.title || 'Game',
    };
  }
  if (media instanceof Api.MessageMediaInvoice) {
    return {
      type: 'invoice',
      title: media.title,
      description: media.description,
      currency: media.currency,
      totalAmount: typeof media.totalAmount === 'number' ? media.totalAmount : Number(media.totalAmount),
    };
  }
  if (media instanceof Api.MessageMediaDice) {
    return {
      type: 'dice',
      emoji: media.emoticon,
      value: media.value,
    };
  }
  if (media instanceof Api.MessageMediaStory) {
    return { type: 'story' };
  }
  if (media instanceof Api.MessageMediaGiveaway) {
    return { type: 'giveaway' };
  }
  if (media instanceof Api.MessageMediaGiveawayResults) {
    return { type: 'giveaway' };
  }
  if (media instanceof Api.MessageMediaPaidMedia) {
    return { type: 'paidMedia' };
  }
  if (media instanceof Api.MessageMediaEmpty) {
    return null;
  }
  if (media instanceof Api.MessageMediaUnsupported) {
    return null;
  }

  return null;
}

/**
 * Describe a message action in human-readable text.
 */
function describeAction(action: Api.TypeMessageAction): string {
  if (action instanceof Api.MessageActionChatCreate) return 'created the group';
  if (action instanceof Api.MessageActionChatEditTitle) return `changed the group title to "${action.title}"`;
  if (action instanceof Api.MessageActionChatEditPhoto) return 'changed the group photo';
  if (action instanceof Api.MessageActionChatAddUser) return 'added members to the group';
  if (action instanceof Api.MessageActionChatDeleteUser) return 'removed a member from the group';
  if (action instanceof Api.MessageActionChatJoinedByLink) return 'joined the group via invite link';
  if (action instanceof Api.MessageActionPinMessage) return 'pinned a message';
  if (action instanceof Api.MessageActionPhoneCall) return 'made a phone call';
  if (action instanceof Api.MessageActionChannelCreate) return 'created the channel';
  return 'performed an action';
}

/**
 * Get a display name for a chat, resolving private chats to user names.
 */
export function getChatDisplayName(
  chat: TelegramChat,
  users: { [userId: string]: TelegramUser },
): string {
  if (chat.type === 'private') {
    const user = users[chat.id];
    if (user) {
      if (user.deleted) return 'Deleted Account';
      return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown';
    }
  }
  return chat.title;
}

/**
 * Format a unix timestamp into a relative or absolute time string.
 */
export function formatTelegramDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a full date+time for message timestamps.
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
