import type { ChannelUnread } from '../store/unreads.store';

/**
 * Extract a comparable timestamp from a snowflake-style ID.
 */
function getTimestamp(id: string): bigint {
  return BigInt(id) >> 22n;
}

/**
 * Check whether a channel has unread messages.
 *
 * @param channel  The channel object (needs `channel_id` and `last_message_id`)
 * @param channelUnreads  The full unreads array from the store
 * @param channelUnreadsLoaded  Whether the unreads have been fetched yet
 */
export function isChannelUnread(
  channel: any,
  channelUnreads: ChannelUnread[],
  channelUnreadsLoaded: boolean
): boolean {
  if (!channel || !channelUnreadsLoaded || !channel.last_message_id) return false;

  const unread = channelUnreads.find(
    (cu) => String(cu.channel_id) === String(channel.channel_id)
  );

  // No unread record for a channel with messages → unread
  if (!unread || !unread.last_read_message_id) return true;

  return getTimestamp(channel.last_message_id) > getTimestamp(unread.last_read_message_id);
}

/**
 * Get the mention count for a specific channel.
 */
export function getChannelMentionCount(
  channelId: string,
  channelUnreads: ChannelUnread[],
  channelUnreadsLoaded: boolean
): number {
  if (!channelUnreadsLoaded) return 0;

  const unread = channelUnreads.find(
    (cu) => String(cu.channel_id) === String(channelId)
  );

  return unread?.mentioned_message_ids?.length || 0;
}

/**
 * Check whether the channel is already read up to a given message ID.
 */
export function isMessageRead(
  channelId: string,
  messageId: string,
  channelUnreads: ChannelUnread[]
): boolean {
  const unread = channelUnreads.find(
    (cu) => String(cu.channel_id) === String(channelId)
  );

  return unread?.last_read_message_id === messageId;
}

/**
 * Count unread messages in a channel using loaded messages from the store.
 */
export function getUnreadMessageCount(
  channelId: string,
  messages: any[],
  channelUnreads: ChannelUnread[]
): number {
  if (!messages || messages.length === 0) return 0;

  const unread = channelUnreads.find(
    (cu) => String(cu.channel_id) === String(channelId)
  );

  if (!unread?.last_read_message_id) return messages.length;

  const lastReadTs = getTimestamp(unread.last_read_message_id);

  return messages.filter((msg) => {
    try {
      return getTimestamp(msg.id) > lastReadTs;
    } catch {
      return false;
    }
  }).length;
}
