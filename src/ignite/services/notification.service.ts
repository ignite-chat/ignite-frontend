import { useUsersStore } from '@/ignite/store/users.store';
import { useChannelsStore } from '../store/channels.store';
import { useNotificationStore } from '../store/notification.store';
import { SoundService } from './sound.service';
import type { MessageEvent } from '../handlers/types';

/**
 * Cross-tab coordination for desktop notifications.
 * Same pattern as sound — first tab to handle it wins.
 */
const desktopNotifChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('ignite:desktop-notification')
    : null;
const recentlyNotified = new Set<string>();

desktopNotifChannel?.addEventListener('message', (event) => {
  if (event.data?.type === 'notified') {
    recentlyNotified.add(event.data.id);
  }
});

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '\u2026';
}

export const NotificationService = {
  /**
   * Called when a new message arrives via WebSocket.
   * Runs guard checks, then plays sound and shows desktop notification.
   */
  notifyNewMessage(event: MessageEvent) {
    const user = useUsersStore.getState().getCurrentUser();
    const { channels } = useChannelsStore.getState();
    const { activeChannelId, blockedUserIds, mutedChannelIds, mutedGuildIds, guildSettings } =
      useNotificationStore.getState();

    const channelId: string = event.channel.id;
    const authorId: string = event.message.author.id;

    // 1. Don't notify for own messages
    if (authorId === user?.id) return;

    // 2. Don't notify if the user is currently viewing this channel
    if (activeChannelId === channelId) return;

    const channel = channels.find((c) => String(c.channel_id) === String(channelId));

    // 6. Channel must exist in our store
    if (!channel) return;

    // 7. Apply per-guild notification settings
    if (channel.guild_id) {
      const settings = guildSettings[String(channel.guild_id)];
      if (settings) {
        // message_notifications: 0 = All, 1 = Only @mentions, 2 = Nothing
        if (settings.message_notifications == 2) return;

        if (settings.message_notifications == 1) {
          const mentions = event.message.mentions || [];
          const isUserMentioned = mentions.some(
            (m) => String(m.user_id) === String(user?.id)
          );
          const hasEveryoneMention = !!event.message.mention_everyone && !settings.suppress_everyone;
          const hasRoleMention = (event.message.mention_roles || []).length > 0 && !settings.suppress_roles;

          if (!isUserMentioned && !hasEveryoneMention && !hasRoleMention) return;
        }
      }
    }

    // All checks passed — notify
    SoundService.playNotificationSound(event.message.id);
    this.showDesktopNotification(event);
  },

  /**
   * Show a desktop notification for an incoming message.
   * Only sends notifications in Electron via IPC — skipped on web.
   */
  showDesktopNotification(event: MessageEvent) {
    if (!window.IgniteNative?.isElectron) return;

    // Skip if another tab already handled this message
    if (recentlyNotified.has(event.message.id)) return;

    recentlyNotified.add(event.message.id);
    desktopNotifChannel?.postMessage({ type: 'notified', id: event.message.id });
    setTimeout(() => recentlyNotified.delete(event.message.id), 10000);

    const author = event.message.author;
    const title = author.name || author.username || 'Someone';
    const body = truncate(event.message.content || '', 100);

    window.IgniteNative.showNotification({ title, body });
  },
};
