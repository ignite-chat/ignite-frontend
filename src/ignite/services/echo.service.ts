import Pusher from 'pusher-js';
import Echo from 'laravel-echo';

// This module wires long-lived Pusher subscriptions onto `window.Echo`. HMR
// would replace the EchoService object with a fresh one whose guards think
// no subscription exists, then re-register listeners on the same underlying
// channel — causing every event to log + handle N times. Force an actual
// page reload on update; `invalidate()` used to work here but bounces back
// into `accept()` through parent modules, creating an HMR loop.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

window.Pusher = Pusher;
import api from '@/ignite/api';
import { useAuthStore } from '../store/auth.store';
import {
  handleChannelCreated,
  handleChannelDeleted,
  handleChannelPermissionDeleted,
  handleChannelPermissionUpdated,
  handleChannelUpdated,
  handleEmojiCreated,
  handleEmojiDeleted,
  handleFriendRequestAccepted,
  handleFriendRequestCreated,
  handleFriendRequestDeleted,
  handleGuildDeleted,
  handleGuildJoined,
  handleGuildSettingsUpdated,
  handleGuildUpdated,
  handleMemberJoined,
  handleMemberLeft,
  handleMemberTyping,
  handleMemberUpdated,
  handleMessageCreated,
  handleMessageDeleted,
  handleMessageUpdated,
  handleReactionAdded,
  handleReactionRemoved,
  handleReactionsSet,
  handleRoleCreated,
  handleRoleDeleted,
  handleRoleUpdated,
  handleStickerCreated,
  handleStickerDeleted,
  handleUnreadUpdated,
  handleUserUpdated,
  handleVoiceStateJoined,
  handleVoiceStateLeft,
  handleVoiceStateUpdate,
} from '../handlers';

// Wrap every `.listen(event, handler)` on a channel so events are logged to
// the devtools console before the real handler fires. Echo's `.listen()`
// returns the channel itself for chaining, so the patch survives across
// every chained call.
const withLogging = (channel: any, label: string) => {
  const origListen = channel.listen.bind(channel);
  channel.listen = (event: string, handler: (data: any) => void) => {
    return origListen(event, (data: any) => {
      console.debug(`%c[echo]%c ${label} %c${event}`, 'color:#5865f2;font-weight:bold', 'color:inherit', 'color:#e11d48', data);
      handler(data);
    });
  };
  return channel;
};

export const EchoService = {
  activeGuildSubscriptions: new Set<string>(),
  userChannelSubscription: null as any,

  /** Initialize the Echo/Reverb WebSocket connection. Safe to call multiple times. */
  connect() {
    if (window.Echo) return;
    window.Echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST,
      wsPort: import.meta.env.VITE_REVERB_PORT,
      wssPort: import.meta.env.VITE_REVERB_PORT,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
      enabledTransports: ['ws', 'wss'],
      authorizer: (channel: any) => ({
        authorize: (socketId: string, callback: any) => {
          api
            .post('broadcasting/auth', {
              socket_id: socketId,
              channel_name: channel.name,
            })
            .then((response: any) => callback(false, response.data))
            .catch((error: any) => callback(true, error));
        },
      }),
    });
  },

  subscribeToUserChannel(userId: string) {
    // Self-bootstrap: when the user logs in mid-session (i.e. without an
    // Ignite token at page load), InitializationService never ran connect().
    this.connect();

    if (this.userChannelSubscription) {
      console.log('User channel already subscribed');
      return;
    }

    console.log(`Subscribing to private.user.${userId}`);

    const context = { guildId: '', currentUserId: userId };

    this.userChannelSubscription = withLogging(window.Echo.private(`user.${userId}`), `user.${userId}`)
      .listen('.friendrequest.created', handleFriendRequestCreated)
      .listen('.friendrequest.deleted', handleFriendRequestDeleted)
      .listen('.friendrequest.accepted', handleFriendRequestAccepted)
      .listen('.guild.joined', handleGuildJoined)
      .listen('.unread.updated', handleUnreadUpdated)
      .listen('.message.created', (data: any) => handleMessageCreated(data, context))
      .listen('.message.updated', (data: any) => handleMessageUpdated(data, context))
      .listen('.message.deleted', (data: any) => handleMessageDeleted(data, context))
      // TODO: BACKEND — These reaction listeners are ready; enable server-side broadcasting to activate
      .listen('.message.reaction.added', (data: any) => handleReactionAdded(data, context))
      .listen('.message.reaction.removed', (data: any) => handleReactionRemoved(data, context))
      .listen('.message.reactions.set', (data: any) => handleReactionsSet(data, context))
      .listen('.channel.created', (data: any) => handleChannelCreated(data, context))
      .listen('.member.typing', (data: any) => handleMemberTyping(data, context))
      .listen('.user.updated', (data: any) => handleUserUpdated(data, context))
      .listen('.user_guild_settings.updated', handleGuildSettingsUpdated);
  },

  unsubscribeFromUserChannel(userId: string) {
    if (this.userChannelSubscription) {
      window.Echo.leave(`private-user.${userId}`);
      this.userChannelSubscription = null;
    }
  },

  subscribeToGuild(guildId: string) {
    // Self-bootstrap for the mid-session login path (see subscribeToUserChannel).
    this.connect();

    if (this.activeGuildSubscriptions.has(guildId)) {
      return;
    }

    const currentUserId = useAuthStore.getState().userId;
    const context = { guildId, currentUserId };

    console.log(`Subscribing to guild: ${guildId}`);

    withLogging(window.Echo.private(`guild.${guildId}`), `guild.${guildId}`)
      .listen('.channel.created', (data: any) => handleChannelCreated(data, context))
      .listen('.channel.deleted', (data: any) => handleChannelDeleted(data, context))
      .listen('.channel.updated', (data: any) => handleChannelUpdated(data, context))
      .listen('.channel_permission.deleted', (data: any) => handleChannelPermissionDeleted(data, context))
      .listen('.channel_permission.updated', (data: any) => handleChannelPermissionUpdated(data, context))
      .listen('.emoji.created', (data: any) => handleEmojiCreated(data, context))
      .listen('.emoji.deleted', (data: any) => handleEmojiDeleted(data, context))
      .listen('.guild.deleted', (data: any) => handleGuildDeleted(data, context))
      .listen('.guild.updated', (data: any) => handleGuildUpdated(data, context))
      .listen('.member.joined', (data: any) => handleMemberJoined(data, context))
      .listen('.member.left', (data: any) => handleMemberLeft(data, context))
      .listen('.member.typing', (data: any) => handleMemberTyping(data, context))
      .listen('.member.updated', (data: any) => handleMemberUpdated(data, context))
      .listen('.message.created', (data: any) => handleMessageCreated(data, context))
      .listen('.message.deleted', (data: any) => handleMessageDeleted(data, context))
      .listen('.message.updated', (data: any) => handleMessageUpdated(data, context))
      // TODO: BACKEND — These reaction listeners are ready; enable server-side broadcasting to activate
      .listen('.message.reaction.added', (data: any) => handleReactionAdded(data, context))
      .listen('.message.reaction.removed', (data: any) => handleReactionRemoved(data, context))
      .listen('.message.reactions.set', (data: any) => handleReactionsSet(data, context))
      .listen('.role.created', (data: any) => handleRoleCreated(data, context))
      .listen('.role.deleted', (data: any) => handleRoleDeleted(data, context))
      .listen('.role.updated', (data: any) => handleRoleUpdated(data, context))
      .listen('.sticker.created', (data: any) => handleStickerCreated(data, context))
      .listen('.sticker.deleted', (data: any) => handleStickerDeleted(data, context))
      .listen('.user.updated', (data: any) => handleUserUpdated(data, context))
      .listen('.voice_state.joined', (data: any) => handleVoiceStateJoined(data, context))
      .listen('.voice_state.left', (data: any) => handleVoiceStateLeft(data, context))
      .listen('.voice_state.update', (data: any) => handleVoiceStateUpdate(data, context));

    this.activeGuildSubscriptions.add(guildId);
  },

  subscribeToGuilds(guilds: { id: string }[]) {
    guilds.forEach((guild) => {
      this.subscribeToGuild(guild.id);
    });
  },

  unsubscribeFromGuild(guildId: string) {
    if (this.activeGuildSubscriptions.has(guildId)) {
      window.Echo.leave(`private-guild.${guildId}`);
      this.activeGuildSubscriptions.delete(guildId);
    }
  },

  unsubscribeAll() {
    const userId = useAuthStore.getState().userId;
    if (userId) {
      this.unsubscribeFromUserChannel(userId);
    }

    this.activeGuildSubscriptions.forEach((guildId) => {
      this.unsubscribeFromGuild(guildId);
    });
  },
};
