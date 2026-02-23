import { toast } from 'sonner';
import { useChannelsStore } from '../store/channels.store';
import { useGuildsStore } from '../store/guilds.store';
import { useTypingStore } from '../store/typing.store';
import api from '../api.js';
import axios from 'axios';
import useStore from '../hooks/useStore';
import { NotificationService } from './notification.service';
import { UnreadsService } from './unreads.service';
import { useNotificationStore } from '../store/notification.store';
import { useUsersStore } from '@/store/users.store';
import { VoiceService } from './voice.service';

export const ChannelsService = {
  /**
   * Initialize channels for a specific guild
   */
  async initializeGuildChannels(guildId: string) {
    const { guilds } = useGuildsStore.getState();
    const { channels, setChannels } = useChannelsStore.getState();
    const guild = guilds.find((g) => g.id === guildId);

    if (!guild) {
      toast.error('Guild not found.');
      return;
    }

    const guildChannels = guild.channels || [];
    const mergedChannels = [...channels, ...guildChannels];
    setChannels(mergedChannels);
    VoiceService.seedVoiceStates(guildChannels);
  },

  /**
   * Load DM/Group channels for the current user, Initialize guild channels from guilds store, and update the local store.
   *
   * @returns void
   */
  async loadChannels() {
    const { setChannels } = useChannelsStore.getState();
    const { guilds } = useGuildsStore.getState();

    try {
      const { data } = await api.get('/@me/channels');
      const guildChannels = guilds.flatMap((g) => g.channels || []);
      const mergedChannels = [...data, ...guildChannels];

      setChannels(mergedChannels);
      VoiceService.seedVoiceStates(guildChannels);
    } catch {
      toast.error('Unable to load channels.');
    }
  },

  /**
   * Create a new DM/Group channel with specified recipients IDs and update the local store.
   *
   * @param recipientsIds Array of user IDs to create a channel with
   * @returns The created channel data
   */
  async createPrivateChannel(recipientsIds: string[]) {
    try {
      const { data } = await api.post('@me/channels', { recipients: recipientsIds });

      // Update local store only if channel doesn't already exist
      const { addChannel } = useChannelsStore.getState();
      addChannel(data);

      return data;
    } catch (error) {
      console.error('Failed to create DM:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Server response:', error.response.data);
        toast.error(`Failed to create DM: ${error.response.data?.message || error.message}`);
      } else {
        toast.error('Failed to create DM');
      }
    }
  },

  /**
   * Create a new guild channel under a specified guild and update the local store.
   *
   * @param guildId The ID of the guild to create the channel in
   * @param channelData The data for the new channel
   * @returns The created channel data
   */
  async createGuildChannel(guildId: string, channelData: any) {
    try {
      const { data } = await api.post(`/guilds/${guildId}/channels`, channelData);

      // Update local store
      const { channels, setChannels } = useChannelsStore.getState();
      setChannels([...channels, data]);

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.message || 'Failed to create guild channel';
        toast.error(errorMessage);
      } else {
        toast.error('Failed to create guild channel');
      }
    }
  },

  /**
   * Delete a guild channel by its ID and update the local store.
   *
   * @param guildId The ID of the guild the channel belongs to
   * @param channelId The ID of the channel to delete
   * @returns void
   */
  async deleteGuildChannel(guildId: string, channelId: string) {
    try {
      await api.delete(`/guilds/${guildId}/channels/${channelId}`);

      // Update local store
      const { channels, setChannels } = useChannelsStore.getState();
      setChannels(channels.filter((channel) => channel.channel_id !== channelId));
    } catch {
      toast.error('Failed to delete channel');
    }
  },

  _lastTypingSent: {} as Record<string, number>,

  handleMemberTyping(event: any) {
    const currentUser = useUsersStore.getState().getCurrentUser();
    if (!event.member?.user || event.member.user.id === currentUser?.id) return;
    useTypingStore.getState().addTypingUser(event.channel.id, {
      user_id: event.member.user.id,
      username: event.member.user.username,
    });
  },

  async sendTypingIndicator(channelId: string) {
    const now = Date.now();
    if (now - (this._lastTypingSent[channelId] || 0) < 1000) return;
    this._lastTypingSent[channelId] = now;
    await api.post(`channels/${channelId}/typing`).catch(() => { });
  },

  async sendChannelMessage(channelId: string, content: string, replyTo: string | null = null, shouldMention: boolean = true, stickerIds: string[] = [], attachments: File[] = []) {
    const { setChannelPendingMessages, channelPendingMessages } = useChannelsStore.getState();

    const generatedNonce = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    const currentUser = useUsersStore.getState().getCurrentUser();

    const pendingMessage: any = {
      nonce: generatedNonce,
      content: content,
      author: currentUser,
      created_at: new Date().toISOString(),
      message_references: replyTo ? [{ message_id: replyTo, channel_id: channelId }] : [],
      attachments: attachments.map((f, i) => ({
        id: String(i),
        filename: f.name,
        size: f.size,
      })),
      uploadProgress: attachments.length > 0 ? 0 : undefined,
    };

    setChannelPendingMessages(channelId, [
      ...(channelPendingMessages[channelId] || []),
      pendingMessage,
    ]);

    try {
      if (attachments.length > 0) {
        const formData = new FormData();

        const payloadJson = {
          nonce: generatedNonce,
          content: content,
          attachments: attachments.map((f, i) => ({
            id: String(i),
            filename: f.name,
            title: f.name,
            flags: 0,
          })),
          flags: 0,
          ...(replyTo ? {
            message_reference: { message_id: replyTo },
            allowed_mentions: { replied_user: shouldMention }
          } : {}),
          ...(stickerIds.length > 0 ? { sticker_ids: stickerIds } : {}),
        };

        formData.append('payload_json', JSON.stringify(payloadJson));
        attachments.forEach((file, i) => {
          formData.append(`files[${i}]`, file, file.name);
        });

        await api.post(`/channels/${channelId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            useChannelsStore.getState().updatePendingMessageProgress(
              channelId,
              generatedNonce,
              percent
            );
          },
        });
      } else {
        await api.post(`/channels/${channelId}/messages`, {
          content: content,
          nonce: generatedNonce,
          ...(replyTo ? {
            message_reference: { message_id: replyTo },
            allowed_mentions: { replied_user: shouldMention }
          } : {}),
          ...(stickerIds.length > 0 ? { sticker_ids: stickerIds } : {}),
        });
      }
    } catch {
      // Remove from pending messages
      setChannelPendingMessages(
        channelId,
        (channelPendingMessages[channelId] || []).filter(
          (msg: any) => msg.nonce !== pendingMessage.nonce
        )
      );
      toast.error('Unable to send message.');
    }
  },

  async loadChannelMessages(channelId: string, beforeId: string | null = null) {
    const { channelMessages, setChannelMessages } = useChannelsStore.getState();
    try {
      const { data } = await api.get(`/channels/${channelId}/messages`, {
        params: {
          before: beforeId,
          limit: 50,
        },
      });

      const mergedChannelMessages = [...(channelMessages[channelId] || []), ...data];
      const newChannelMessages = Array.from(
        new Map(mergedChannelMessages.map((msg: any) => [msg.id, msg])).values()
      ).sort((a: any, b: any) => a.id.localeCompare(b.id));

      setChannelMessages(channelId, newChannelMessages);

      // Cache message authors in users store
      const { users, setUsers } = useUsersStore.getState();
      const newAuthors = data
        .filter((msg: any) => msg.author && !users[msg.author.id])
        .map((msg: any) => msg.author);
      if (newAuthors.length > 0) {
        setUsers(newAuthors);
      }

      return data;
    } catch {
      toast.error('Unable to load channel messages.');
      return [];
    }
  },

  async acknowledgeChannelMessage(channelId: string, messageId: string) {
    try {
      await api.put(`/channels/${channelId}/ack/${messageId}`);
    } catch {
      toast.error('Unable to acknowledge channel messages.');
    }
  },

  /**
   * Callback for the .message.created event from the WebSocket to update the local store with the new message.
   *
   * @param event The message created event data
   * @return void
   */
  handleMessageCreated(event: any) {
    const {
      channels,
      setChannels,
      channelMessages,
      channelPendingMessages,
      setChannelMessages,
      setChannelPendingMessages,
    } = useChannelsStore.getState();
    const channelId = event.channel.id;

    console.log('New message event received on channel', channelId);

    // Clear typing indicator immediately when user sends a message
    useTypingStore.getState().removeTypingUser(channelId, event.message.author.id);

    if (channelPendingMessages[channelId]?.some((m) => m.nonce === event.message.nonce)) {
      setChannelPendingMessages(
        channelId,
        channelPendingMessages[channelId].filter((m) => m.nonce !== event.message.nonce)
      );
    }

    if (
      channelMessages[channelId] &&
      !channelMessages[channelId]?.some((m) => m.id === event.message.id)
    ) {
      setChannelMessages(channelId, [...(channelMessages[channelId] || []), event.message]);
    }

    // Cache message author in users store if not already present
    const { users, setUser } = useUsersStore.getState();
    if (event.message.author && !users[event.message.author.id]) {
      setUser(event.message.author.id, event.message.author);
    }

    // If we authored this message or are viewing this channel, mark as read immediately
    const currentUser = useUsersStore.getState().getCurrentUser();
    const { activeChannelId } = useNotificationStore.getState();
    if (event.message.author.id === currentUser?.id || activeChannelId === channelId) {
      UnreadsService.setLastReadMessageId(channelId, event.message.id);
    }

    /**
     * Update last_message_id for the channel
     */
    const newChannels = channels.map((c) =>
      c.channel_id === channelId ? { ...c, last_message_id: event.message.id } : c
    );
    console.log(
      'Updating channel last_message_id:',
      newChannels.find((c) => c.channel_id === channelId)
    );
    setChannels(newChannels);

    // Notify (sound + desktop notification) with guard checks
    NotificationService.notifyNewMessage(event);
  },

  /**
   * Callback for the .message.deleted event from the WebSocket to update the local store by removing the deleted message.
   *
   * @param event The message deleted event data
   * @return void
   */
  handleMessageDeleted(event: any) {
    const { channels, setChannels, channelMessages, setChannelMessages } =
      useChannelsStore.getState();
    const channelId = event.channel.id;

    if (channelMessages[channelId]) {
      const filtered = channelMessages[channelId].filter((m) => m.id !== event.message.id);
      setChannelMessages(channelId, filtered);

      const latest = [...filtered].sort((a, b) => b.id - a.id)[0];

      // Update last_message_id for the channel
      const newChannels = channels.map((c) =>
        c.channel_id === channelId ? { ...c, last_message_id: latest?.id || null } : c
      );
      setChannels(newChannels);
    }
  },

  /**
   * Callback for the .message.updated event from the WebSocket to update the local store with the updated message data.
   *
   * @param event The message updated event data
   * @return void
   */
  handleMessageUpdated(event: any) {
    const { channelMessages, setChannelMessages } = useChannelsStore.getState();
    const channelId = event.channel.id;

    if (channelMessages[channelId]?.some((m) => m.id === event.message.id)) {
      setChannelMessages(
        channelId,
        channelMessages[channelId].map((m) =>
          m.id === event.message.id
            ? { ...m, content: event.message.content, updated_at: event.message.updated_at }
            : m
        )
      );
    }
  },

  /**
   * Callback for the .channel.created event from the WebSocket to update the local store with the new channel.
   *
   * @param event The channel created event data
   * @return void
   */
  handleChannelCreated(event: any) {
    const { channels, setChannels } = useChannelsStore.getState();

    if (!channels.some((c) => c.channel_id === event.channel.id)) {
      setChannels([...channels, event.channel]);
    }
  },

  /**
   * Toggle a reaction on a message (add if not present, remove if present)
   *
   * FRONTEND-ONLY IMPLEMENTATION: Currently, reactions are stored only in the Zustand store (in-memory).
   * When the page is refreshed, all reactions are lost. This is because the backend API is not yet implemented.
   *
   * For persistence across page refreshes and real-time sync with other users, the following backend integration is needed:
   * 1. API endpoints to save/remove reactions to the server
   * 2. WebSocket events to broadcast reaction changes to all connected clients
   *
   * @param channelId The ID of the channel
   * @param messageId The ID of the message
   * @param emoji The emoji to react with
   */
  toggleMessageReaction(channelId: string, messageId: string, emoji: string) {
    const user = useUsersStore.getState().getCurrentUser();
    const { channelReactions, addReaction, removeReaction } = useChannelsStore.getState();

    const messageReactions = channelReactions[channelId]?.[messageId] || [];
    const existingReaction = messageReactions.find((r) => r.emoji === emoji);

    if (existingReaction?.users.includes(user.id)) {
      // Optimistic update — immediately reflect in UI
      removeReaction(channelId, messageId, emoji, user.id);
      // TODO: BACKEND — Uncomment when the reaction API endpoints are implemented:
      // api.delete(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`)
      //   .catch(() => {
      //     // Rollback on failure
      //     addReaction(channelId, messageId, emoji, user.id);
      //     toast.error('Failed to remove reaction');
      //   });
    } else {
      // Optimistic update — immediately reflect in UI
      addReaction(channelId, messageId, emoji, user.id);
      // TODO: BACKEND — Uncomment when the reaction API endpoints are implemented:
      // api.put(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`)
      //   .catch(() => {
      //     // Rollback on failure
      //     removeReaction(channelId, messageId, emoji, user.id);
      //     toast.error('Failed to add reaction');
      //   });
    }
  },

  /**
   * Callback for the .message.reaction.added event from the WebSocket to add a reaction.
   *
   * BACKEND INTEGRATION: This handler is called when another user (or you, from another client) adds a reaction to a message.
   * The server broadcasts this event via WebSocket when an API call is made to:
   * PUT /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me
   *
   * To enable this:
   * 1. Add this event listener in the WebSocket message handler (typically in websocket.service.ts or similar)
   *    Example: websocket.on('message.reaction.added', (event) => ChannelsService.handleReactionAdded(event))
   * 2. The backend should broadcast this event to all clients in the channel when a reaction is added
   * 3. Each event should contain: { channel_id, message_id, emoji, user_id }
   *
   * @param event The reaction added event data: { channel_id, message_id, emoji, user_id }
   * @return void
   */
  handleReactionAdded(event: any) {
    const { addReaction } = useChannelsStore.getState();
    const { channel_id, message_id, emoji, user_id } = event;

    addReaction(channel_id, message_id, emoji, user_id);
  },

  /**
   * Callback for the .message.reaction.removed event from the WebSocket to remove a reaction.
   *
   * BACKEND INTEGRATION: This handler is called when another user (or you, from another client) removes a reaction from a message.
   * The server broadcasts this event via WebSocket when an API call is made to:
   * DELETE /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me
   *
   * To enable this:
   * 1. Add this event listener in the WebSocket message handler (typically in websocket.service.ts or similar)
   *    Example: websocket.on('message.reaction.removed', (event) => ChannelsService.handleReactionRemoved(event))
   * 2. The backend should broadcast this event to all clients in the channel when a reaction is removed
   * 3. Each event should contain: { channel_id, message_id, emoji, user_id }
   *
   * @param event The reaction removed event data: { channel_id, message_id, emoji, user_id }
   * @return void
   */
  handleReactionRemoved(event: any) {
    const { removeReaction } = useChannelsStore.getState();
    const { channel_id, message_id, emoji, user_id } = event;

    removeReaction(channel_id, message_id, emoji, user_id);
  },

  /**
   * Callback for the .message.reactions.set event from the WebSocket when loading existing reactions.
   *
   * BACKEND INTEGRATION: This handler is called when initially loading a message's reactions (e.g., when opening a channel).
   * The server broadcasts this event via WebSocket after the client opens a channel to sync all existing reactions.
   *
   * To enable this:
   * 1. Add this event listener in the WebSocket message handler (typically in websocket.service.ts or similar)
   *    Example: websocket.on('message.reactions.set', (event) => ChannelsService.handleReactionsSet(event))
   * 2. The backend should send this event for each message when a channel is opened
   * 3. Or, implement a GET /channels/{channelId}/messages/{messageId}/reactions endpoint to load reactions
   * 4. Each event should contain: { channel_id, message_id, reactions: Reaction[] }
   *    Where Reaction = { emoji, count, users: string[], me: boolean }
   *
   * @param event The reactions set event data: { channel_id, message_id, reactions }
   * @return void
   */
  handleReactionsSet(event: any) {
    const { setMessageReactions } = useChannelsStore.getState();
    const { channel_id, message_id, reactions } = event;

    setMessageReactions(channel_id, message_id, reactions);
  },

  handleChannelUpdated(event: any) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(
      channels.map((c) =>
        c.channel_id === event.channel.channel_id ? { ...c, ...event.channel } : c
      )
    );
  },

  handleChannelDeleted(event: any) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(channels.filter((c) => c.channel_id !== event.channel.channel_id));
  },

  handleChannelPermissionUpdated(event: any) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(
      channels.map((c) => {
        if (c.channel_id !== event.channel_id) return c;
        const rolePermissions = c.role_permissions || [];
        const idx = rolePermissions.findIndex((rp: any) => rp.role_id === event.permission.role_id);
        if (idx === -1) {
          return { ...c, role_permissions: [...rolePermissions, event.permission] };
        }
        const updated = [...rolePermissions];
        updated[idx] = event.permission;
        return { ...c, role_permissions: updated };
      })
    );
  },

  handleChannelPermissionDeleted(event: any) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(
      channels.map((c) => {
        if (c.channel_id !== event.channel_id) return c;
        return {
          ...c,
          role_permissions: (c.role_permissions || []).filter(
            (rp: any) => rp.role_id !== event.permission.role_id
          ),
        };
      })
    );
  },
};
