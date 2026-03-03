import { useEffect, useMemo } from 'react';
import { useUnreadsStore } from '../store/unreads.store';
import { useChannelsStore } from '../store/channels.store';
import { isChannelUnread, getChannelMentionCount, getUnreadMessageCount } from '../utils/unreads.utils';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { useDiscordReadStatesStore } from '@/discord/store/discord-readstates.store';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordRelationshipsStore, RelationshipType } from '@/discord/store/discord-relationships.store';

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
  const { requests } = useFriendsStore();
  const user = useUsersStore((s) => s.getCurrentUser());
  const discordReadStates = useDiscordReadStatesStore((s) => s.readStates);
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);


  const pendingCount = useMemo(() => {
    if (!user) return 0;
    const ignitePending = requests.filter((req) => req.sender_id != user.id).length;
    const discordPending = discordRelationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length;
    return ignitePending + discordPending;
  }, [requests, user, discordRelationships]);

  useEffect(() => {
    if (!window.IgniteNative?.setBadgeCount || !channelUnreadsLoaded) return;

    let totalMentions = 0;
    let hasUnread = false;

    // Ignite channels
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

    // Discord channels
    for (const channel of discordChannels) {
      const readState = discordReadStates[channel.id];
      if (readState?.mention_count) {
        totalMentions += readState.mention_count;
      }
      if (!hasUnread && channel.last_message_id && readState?.last_message_id && channel.last_message_id > readState.last_message_id) {
        hasUnread = true;
      }
    }

    let badgeCount: number;
    badgeCount = Math.min(totalMentions + pendingCount, 10);

    if (hasUnread && badgeCount == 0) {
      badgeCount = 11; // unread but no mentions
    }

    window.IgniteNative.setBadgeCount(badgeCount);
  }, [channelUnreads, channelUnreadsLoaded, channels, channelMessages, pendingCount, discordReadStates, discordChannels]);
}
