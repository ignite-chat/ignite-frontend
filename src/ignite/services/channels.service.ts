import { toast } from 'sonner';
import { useChannelsStore } from '../store/channels.store';
import { useGuildsStore } from '../store/guilds.store';
import { useTypingStore } from '../store/typing.store';
import api from '../api.js';
import axios from 'axios';
import { NotificationService } from './notification.service';
import { UnreadsService } from './unreads.service';
import { useNotificationStore } from '../store/notification.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { VoiceService } from './voice.service';
import type { Channel, Message, PendingMessage } from '../store/channels.store';
import type {
  MessageEvent,
  ChannelEvent,
  ChannelPermissionEvent,
  MemberTypingEvent,
  ReactionEvent,
  ReactionsSetEvent,
} from '../handlers/types';

export type CreateChannelPayload = {
  name: string;
  type: number;
  parent_id?: string | null;
};

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
      const { data } = await api.get<Channel[]>('/@me/channels');
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
  async createPrivateChannel(recipientsIds: string[]): Promise<Channel | undefined> {
    try {
      const { data } = await api.post<Channel>('@me/channels', { recipients: recipientsIds });

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
  async createGuildChannel(guildId: string, channelData: CreateChannelPayload): Promise<Channel | undefined> {
    try {
      const { data } = await api.post<Channel>(`/guilds/${guildId}/channels`, channelData);

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

  handleMemberTyping(event: MemberTypingEvent) {
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

    const pendingMessage: PendingMessage = {
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
          (msg) => msg.nonce !== pendingMessage.nonce
        )
      );
      toast.error('Unable to send message.');
    }
  },

  async loadChannelMessages(channelId: string, beforeId: string | null = null): Promise<Message[]> {
    const { channelMessages, setChannelMessages } = useChannelsStore.getState();
    try {
      const { data } = await api.get<Message[]>(`/channels/${channelId}/messages`, {
        params: {
          before: beforeId,
          limit: 50,
        },
      });

      const mergedChannelMessages = [...(channelMessages[channelId] || []), ...data];
      const newChannelMessages = Array.from(
        new Map(mergedChannelMessages.map((msg) => [msg.id, msg])).values()
      ).sort((a, b) => a.id.localeCompare(b.id));

      setChannelMessages(channelId, newChannelMessages);

      // Cache message authors in users store
      const { users, setUsers } = useUsersStore.getState();
      const newAuthors = data
        .filter((msg) => msg.author && !users[msg.author.id])
        .map((msg) => msg.author);
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
   */
  handleMessageCreated(event: MessageEvent) {
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
   */
  handleMessageDeleted(event: MessageEvent) {
    const { channels, setChannels, channelMessages, setChannelMessages } =
      useChannelsStore.getState();
    const channelId = event.channel.id;

    if (channelMessages[channelId]) {
      const filtered = channelMessages[channelId].filter((m) => m.id !== event.message.id);
      setChannelMessages(channelId, filtered);

      const latest = [...filtered].sort((a, b) => b.id.localeCompare(a.id))[0];

      // Update last_message_id for the channel
      const newChannels = channels.map((c) =>
        c.channel_id === channelId ? { ...c, last_message_id: latest?.id || null } : c
      );
      setChannels(newChannels);
    }
  },

  /**
   * Callback for the .message.updated event from the WebSocket to update the local store with the updated message data.
   */
  handleMessageUpdated(event: MessageEvent) {
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
   */
  handleChannelCreated(event: ChannelEvent) {
    const { channels, setChannels } = useChannelsStore.getState();

    if (!channels.some((c) => c.channel_id === event.channel.channel_id)) {
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
   */
  toggleMessageReaction(channelId: string, messageId: string, emoji: string) {
    const user = useUsersStore.getState().getCurrentUser();
    if (!user) return;

    const { channelReactions, addReaction, removeReaction } = useChannelsStore.getState();

    const messageReactions = channelReactions[channelId]?.[messageId] || [];
    const existingReaction = messageReactions.find((r) => r.emoji === emoji);

    if (existingReaction?.users.includes(user.id)) {
      removeReaction(channelId, messageId, emoji, user.id);
    } else {
      addReaction(channelId, messageId, emoji, user.id);
    }
  },

  /**
   * Callback for the .message.reaction.added event from the WebSocket to add a reaction.
   */
  handleReactionAdded(event: ReactionEvent) {
    const { addReaction } = useChannelsStore.getState();
    const { channel_id, message_id, emoji, user_id } = event;

    addReaction(channel_id, message_id, emoji, user_id);
  },

  /**
   * Callback for the .message.reaction.removed event from the WebSocket to remove a reaction.
   */
  handleReactionRemoved(event: ReactionEvent) {
    const { removeReaction } = useChannelsStore.getState();
    const { channel_id, message_id, emoji, user_id } = event;

    removeReaction(channel_id, message_id, emoji, user_id);
  },

  /**
   * Callback for the .message.reactions.set event from the WebSocket when loading existing reactions.
   */
  handleReactionsSet(event: ReactionsSetEvent) {
    const { setMessageReactions } = useChannelsStore.getState();
    const { channel_id, message_id, reactions } = event;

    setMessageReactions(channel_id, message_id, reactions);
  },

  /**
   * Update a guild channel's properties (name, description, permissions, etc.)
   */
  async updateGuildChannel(guildId: string, channelId: string, data: Record<string, unknown>) {
    try {
      await api.patch(`/guilds/${guildId}/channels/${channelId}`, data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data?.message || 'Failed to update channel');
      } else {
        toast.error('Failed to update channel');
      }
      throw error;
    }
  },

  /**
   * Update permissions for a specific role on a channel.
   */
  async updateChannelRolePermissions(channelId: string, roleId: string, data: { allowed_permissions: string; denied_permissions: string }) {
    try {
      await api.put(`/channels/${channelId}/permissions/${roleId}`, data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data?.message || 'Failed to update permissions');
      } else {
        toast.error('Failed to update permissions');
      }
      throw error;
    }
  },

  handleChannelUpdated(event: ChannelEvent) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(
      channels.map((c) =>
        c.channel_id === event.channel.channel_id ? { ...c, ...event.channel } : c
      )
    );
  },

  handleChannelDeleted(event: ChannelEvent) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(channels.filter((c) => c.channel_id !== event.channel.channel_id));
  },

  handleChannelPermissionUpdated(event: ChannelPermissionEvent) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(
      channels.map((c) => {
        if (c.channel_id !== event.channel_id) return c;
        const rolePermissions = c.role_permissions || [];
        const idx = rolePermissions.findIndex((rp) => rp.role_id === event.permission.role_id);
        if (idx === -1) {
          return { ...c, role_permissions: [...rolePermissions, event.permission] };
        }
        const updated = [...rolePermissions];
        updated[idx] = event.permission;
        return { ...c, role_permissions: updated };
      })
    );
  },

  handleChannelPermissionDeleted(event: ChannelPermissionEvent) {
    const { channels, setChannels } = useChannelsStore.getState();
    setChannels(
      channels.map((c) => {
        if (c.channel_id !== event.channel_id) return c;
        return {
          ...c,
          role_permissions: (c.role_permissions || []).filter(
            (rp) => rp.role_id !== event.permission.role_id
          ),
        };
      })
    );
  },
};
