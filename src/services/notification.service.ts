import { useUsersStore } from '@/store/users.store';
import useStore from '../hooks/useStore';
import { useChannelsStore } from '../store/channels.store';
import { useNotificationStore } from '../store/notification.store';
import { SoundService } from './sound.service';

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
  notifyNewMessage(event: any) {
    const user = useUsersStore.getState().getCurrentUser();
    const { channels } = useChannelsStore.getState();
    const { activeChannelId, blockedUserIds, mutedChannelIds, mutedGuildIds } =
      useNotificationStore.getState();

    const channelId: string = event.channel.id;
    const authorId: string = event.message.author.id;

    // 1. Don't notify for own messages
    if (authorId === user?.id) return;

    // 2. Don't notify for blocked users
    if (blockedUserIds.includes(authorId)) return;

    // 3. Don't notify for muted channels
    if (mutedChannelIds.includes(channelId)) return;

    // 4. Don't notify for muted guilds
    const channel = channels.find((c) => String(c.channel_id) === String(channelId));
    if (channel?.guild_id && mutedGuildIds.includes(String(channel.guild_id))) return;

    // 5. Don't notify if the user is currently viewing this channel
    if (activeChannelId === channelId) return;

    // 6. Channel must exist in our store
    if (!channel) return;

    // All checks passed — notify
    SoundService.playNotificationSound(event.message.id);
    this.showDesktopNotification(event);
  },

  /**
   * Show an OS-level desktop notification for an incoming message.
   * Coordinated across tabs so only one notification is shown.
   */
  showDesktopNotification(event: any) {
    // Skip if another tab already handled this message
    if (recentlyNotified.has(event.message.id)) return;

    recentlyNotified.add(event.message.id);
    desktopNotifChannel?.postMessage({ type: 'notified', id: event.message.id });
    setTimeout(() => recentlyNotified.delete(event.message.id), 10000);

    // Check permission
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') return;

    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this._createNotification(event);
        }
      });
      return;
    }

    this._createNotification(event);
  },

  _createNotification(event: any) {
    const author = event.message.author;
    const displayName = author.name || author.username || 'Someone';
    const body = truncate(event.message.content || '', 100);

    const notification = new Notification(displayName, {
      body,
      tag: `ignite-msg-${event.message.id}`,
      silent: true, // We already play our own sound
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  },
};
