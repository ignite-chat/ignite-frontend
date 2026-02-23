import { useEffect } from 'react';
import { useUnreadsStore } from '../store/unreads.store';
import { useChannelsStore } from '../store/channels.store';
import { isChannelUnread, getChannelMentionCount, getUnreadMessageCount } from '../utils/unreads.utils';

/**
 * Keeps the Electron taskbar overlay badge in sync with unread state.
 *
 * Badge mapping:
 *  - 1–10: number of mentions (capped at 10)
 *  - 11: unread messages but zero mentions
 *  - 0/null: no unreads, clear badge
 */
export function useElectronBadge() {
  const channelUnreads = useUnreadsStore((s) => s.channelUnreads);
  const channelUnreadsLoaded = useUnreadsStore((s) => s.channelUnreadsLoaded);
  const channels = useChannelsStore((s) => s.channels);
  const channelMessages = useChannelsStore((s) => s.channelMessages);

  useEffect(() => {
    if (!window.IgniteNative?.setBadgeCount || !channelUnreadsLoaded) return;

    let totalMentions = 0;
    let hasUnread = false;

    for (const channel of channels) {
      totalMentions += getChannelMentionCount(channel.channel_id, channelUnreads, channelUnreadsLoaded);

      // DM channels (type 1) count their unread messages as mentions
      const unread = isChannelUnread(channel, channelUnreads, channelUnreadsLoaded);
      if (unread && channel.type === 1) {
        const dmUnreadCount = getUnreadMessageCount(
          channel.channel_id,
          channelMessages[channel.channel_id] || [],
          channelUnreads
        );
        totalMentions += dmUnreadCount || 1; // fallback to 1 if messages aren't loaded
      } else if (unread && !hasUnread) {
        hasUnread = true;
      }
    }

    let badgeCount: number;
    if (totalMentions > 0) {
      badgeCount = Math.min(totalMentions, 10);
    } else if (hasUnread) {
      badgeCount = 11; // unread but no mentions
    } else {
      badgeCount = 0; // clear badge
    }

    window.IgniteNative.setBadgeCount(badgeCount);
  }, [channelUnreads, channelUnreadsLoaded, channels, channelMessages]);
}
