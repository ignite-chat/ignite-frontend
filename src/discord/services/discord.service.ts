import { toast } from 'sonner';
import { useModalStore } from '@/store/modal.store';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordRelationshipsStore } from '../store/discord-relationships.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordGuildFoldersStore } from '../store/discord-guild-folders.store';
import { DiscordGatewayService } from './discord-gateway.service';
import { DiscordApiService } from './discord-api.service';
import { generateNonce } from '../utils/snowflake';

export const DiscordService = {
  /**
   * Connect all stored Discord accounts to the gateway.
   */
  async connectAll() {
    const { accounts } = useDiscordStore.getState();
    if (accounts.length === 0) {
      toast.error('No Discord accounts configured.');
      return false;
    }

    // Set up the dispatch handler once
    DiscordGatewayService.onDispatch = (accountToken, payload) => {
      this._handleGatewayDispatch(payload.event, payload.data);
    };

    for (const account of accounts) {
      if (!account.isConnected) {
        try {
          DiscordGatewayService.connect(account.token);
        } catch (error) {
          console.error('[Discord] Failed to connect account:', error);
        }
      }
    }
    return true;
  },

  /**
   * Connect a single Discord account by token.
   */
  async connect(token?: string) {
    const resolvedToken = token ?? useDiscordStore.getState().token;
    if (!resolvedToken) {
      toast.error('No Discord token configured.');
      return false;
    }

    try {
      // Ensure dispatch handler is set up
      if (!DiscordGatewayService.onDispatch) {
        DiscordGatewayService.onDispatch = (accountToken, payload) => {
          this._handleGatewayDispatch(payload.event, payload.data);
        };
      }

      DiscordGatewayService.connect(resolvedToken);
      return true;
    } catch (error) {
      console.error('[Discord] Failed to connect:', error);
      toast.error('Failed to connect to Discord.');
      return false;
    }
  },

  /**
   * Disconnect all accounts and clear all stores.
   */
  disconnectAll() {
    DiscordGatewayService.disconnectAll();
    DiscordGatewayService.onDispatch = null;
    useDiscordGuildsStore.getState().clear();
    useDiscordChannelsStore.getState().clear();
    useDiscordUsersStore.getState().clear();
    useDiscordReadStatesStore.getState().clear();
    useDiscordRelationshipsStore.getState().clear();
    useDiscordGuildFoldersStore.getState().clear();
    console.log('[Discord] All accounts disconnected and stores cleared');
  },

  /**
   * Disconnect a single account by token and clear its data from stores.
   */
  disconnectAccount(token: string) {
    const account = useDiscordStore.getState().getAccountByToken(token);
    const accountUserId = account?.user?.id;

    DiscordGatewayService.disconnect(token);

    if (accountUserId) {
      useDiscordGuildsStore.getState().clearAccount(accountUserId);
      useDiscordGuildFoldersStore.getState().clearAccount(accountUserId);
      useDiscordChannelsStore.getState().clearAccount(accountUserId);
      useDiscordRelationshipsStore.getState().clearAccount(accountUserId);
    }

    console.log(`[Discord] Account disconnected: ${accountUserId || token}`);
  },

  /**
   * Fully disconnect and remove all stored accounts.
   */
  logout() {
    this.disconnectAll();
    useDiscordStore.getState().disconnect();
    toast.success('Disconnected from Discord.');
  },

  /**
   * Fully disconnect and remove a single account.
   */
  logoutAccount(token: string) {
    DiscordApiService.logout(token);
    this.disconnectAccount(token);
    useDiscordStore.getState().removeAccountByToken(token);
    toast.success('Discord account disconnected.');
  },

  /**
   * Load messages for a specific channel via REST API.
   * Messages are returned newest-first from Discord, we reverse for chronological order.
   */
  async loadChannelMessages(channelId: string, before?: string, limit?: number) {
    try {
      const messages = await DiscordApiService.getChannelMessages(channelId, before, limit);

      // Store author and mentioned user objects in the users store
      const authors = messages.map((m: any) => m.author).filter(Boolean);
      const mentionedUsers = messages.flatMap((m: any) => m.mentions || []).filter(Boolean);
      const allUsers = [...authors, ...mentionedUsers];
      if (allUsers.length > 0) {
        useDiscordUsersStore.getState().addUsers(allUsers);
      }

      // Store member data and request full guild members via Opcode 8
      const channel = useDiscordChannelsStore.getState().channels.find((c) => c.id === channelId);
      if (channel?.guild_id) {
        // Store inline member data from messages
        const membersToAdd = messages
          .filter((m: any) => m.member && m.author?.id)
          .map((m: any) => ({ ...m.member, user: m.author }));
        if (membersToAdd.length > 0) {
          useDiscordMembersStore.getState().addMembers(channel.guild_id, membersToAdd);
        }

        // Request full member data for all unique authors + mentioned users via Opcode 8
        const uniqueUserIds = [...new Set(allUsers.map((u: any) => u.id).filter(Boolean))] as string[];
        if (uniqueUserIds.length > 0) {
          DiscordGatewayService.requestGuildMembers(channel.guild_id, uniqueUserIds);
        }
      }

      const { channelMessages, setChannelMessages } = useDiscordChannelsStore.getState();
      const existing = channelMessages[channelId] || [];

      // Merge and deduplicate by ID, sort chronologically
      // Put API messages first so existing (gateway-updated) versions take priority
      const merged = [...messages, ...existing];
      const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values()).sort((a, b) =>
        a.id.localeCompare(b.id)
      );

      // setChannelMessages applies the per-channel cap automatically
      setChannelMessages(channelId, unique);
      return messages;
    } catch (error) {
      console.error(`[Discord] Failed to load messages for channel ${channelId}:`, error);
      toast.error('Failed to load Discord messages.');
      return [];
    }
  },

  /**
   * Send a message to a Discord channel.
   * Creates a pending message immediately for instant UI feedback,
   * then removes it once the server confirms via MESSAGE_CREATE.
   */
  async sendMessage(channelId: string, content: string, replyToMessageId?: string | null, attachments?: { file: File; uploaded_filename: string }[]) {
    const nonce = generateNonce();
    const currentUser = useDiscordStore.getState().user;

    const messageReference = replyToMessageId
      ? { message_id: replyToMessageId }
      : undefined;

    // Look up the referenced message for UI feedback
    let referencedMessage = undefined;
    if (replyToMessageId) {
      const messages = useDiscordChannelsStore.getState().channelMessages[channelId] || [];
      referencedMessage = messages.find((m) => m.id === replyToMessageId) || undefined;
    }

    // Add pending message for instant UI feedback
    if (currentUser) {
      useDiscordChannelsStore.getState().addPendingMessage(channelId, {
        nonce,
        channel_id: channelId,
        content,
        author: {
          id: currentUser.id,
          username: currentUser.username,
          discriminator: currentUser.discriminator,
          global_name: currentUser.global_name,
          avatar: currentUser.avatar,
        },
        timestamp: new Date().toISOString(),
        type: 0,
        status: 'sending',
        ...(messageReference && { message_reference: messageReference }),
        ...(referencedMessage && { referenced_message: referencedMessage }),
        ...(attachments && attachments.length > 0 && {
          attachments: attachments.map((att, i) => ({
            id: String(i),
            filename: att.file.name,
            size: att.file.size,
            content_type: att.file.type,
          })),
        }),
        _retryData: { replyToMessageId, attachments },
      });
    }

    try {
      await DiscordApiService.sendMessage(channelId, content, nonce, messageReference, attachments);
      return true;
    } catch (error: any) {
      console.error(`[Discord] Failed to send message to channel ${channelId}:`, error);
      const data = error.response?.data;
      const errInfo = {
        code: data?.code || error.response?.status || 0,
        message: data?.message || error.message || 'Failed to send message',
      };
      useDiscordChannelsStore.getState().markPendingFailed(channelId, nonce, errInfo);

      // Show error modal for specific error codes
      const ERROR_MODALS: Record<number, { title: string; description: string }> = {
        340001: { title: 'Your account has limited access', description: 'Discord has limited your access to sending messages in guild channels. Please check for system messages from Discord with more information.' },
        340002: { title: 'Your account has limited access', description: 'Discord has limited your access to sending DMs. Please check for system messages from Discord with more information.' },
        340003: { title: 'Your account has limited access', description: 'Discord has limited your access to sending messages in group DMs. Please check for system messages from Discord with more information.' },
        340004: { title: 'Your account has limited access', description: 'Discord has limited your access to uploading attachments to guilds. Please check for system messages from Discord with more information.' },
        340005: { title: 'Your account has limited access', description: 'Discord has limited your access to uploading attachments to DMs. Please check for system messages from Discord with more information.' },
        340006: { title: 'Your account has limited access', description: 'Discord has limited your access to uploading attachments to group DMs. Please check for system messages from Discord with more information.' },
        340013: { title: 'Your account has limited access', description: 'Discord has limited your access to sending messages in server channels. Please check for system messages from Discord with more information.' },
        340014: { title: 'Your account has limited access', description: 'Discord has limited your access to uploading attachments to servers. Please check for system messages from Discord with more information.' },
        50007: { title: 'Cannot send message', description: 'Cannot send messages to this user.' },
        50278: { title: 'Cannot send message', description: 'Cannot send messages to this user.' },
        40004: { title: 'Messages disabled', description: 'Send message has been temporarily disabled.' },
        20028: { title: 'Slow down', description: 'You are sending messages too fast. Please slow down.' },
        50013: { title: 'Missing Permissions', description: 'You do not have permission to send messages in this channel.' },
      };
      const modalInfo = ERROR_MODALS[errInfo.code];
      if (modalInfo) {
        const { default: DiscordErrorModal } = await import('../components/modals/DiscordErrorModal');
        useModalStore.getState().push(DiscordErrorModal, modalInfo);
      }

      return false;
    }
  },

  /** Retry a failed pending message */
  async retryMessage(channelId: string, nonce: string) {
    const store = useDiscordChannelsStore.getState();
    const pending = (store.channelPendingMessages[channelId] || []).find((p) => p.nonce === nonce);
    if (!pending || pending.status !== 'failed') return;

    // Remove the failed message and re-send
    store.removePendingByNonce(channelId, nonce);
    await this.sendMessage(
      channelId,
      pending.content,
      pending._retryData?.replyToMessageId,
      pending._retryData?.attachments,
    );
  },

  /**
   * Load guild members via REST API.
   */
  async loadGuildMembers(guildId: string) {
    try {
      const members = await DiscordApiService.getGuildMembers(guildId);
      useDiscordGuildsStore.getState().setGuildMembers(guildId, members);
      return members;
    } catch (error) {
      console.error(`[Discord] Failed to load members for guild ${guildId}:`, error);
      toast.error('Failed to load Discord members.');
      return [];
    }
  },

  /**
   * Get the avatar URL for a Discord user.
   */
  getUserAvatarUrl(userId: string, avatarHash: string | null, size: number = 64) {
    if (!avatarHash) {
      // Default avatar based on discriminator or user ID
      const index = Number(BigInt(userId) >> 22n) % 6;
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  },

  /**
   * Get the banner URL for a Discord user.
   */
  getUserBannerUrl(userId: string, bannerHash: string | null, size: number = 300) {
    if (!bannerHash) return null;
    const ext = bannerHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${ext}?size=${size}`;
  },

  /**
   * Get the icon URL for a Discord guild.
   */
  getGuildIconUrl(guildId: string, iconHash: string | null, size: number = 64) {
    if (!iconHash) return null;
    const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
  },

  /**
   * Get the URL for a Discord sticker.
   * format_type: 1=PNG, 2=APNG, 3=Lottie, 4=GIF
   */
  getStickerUrl(stickerId: string, formatType: number, size: number = 160) {
    if (formatType === 3) {
      // Lottie stickers are JSON — can't render as an image
      return null;
    }
    const ext = formatType === 4 ? 'gif' : 'png';
    return `https://media.discordapp.net/stickers/${stickerId}.${ext}?size=${size}`;
  },

  /**
   * Handle gateway dispatch events for additional processing.
   * The gateway service already updates stores directly — this is for
   * any extra logic (notifications, cross-store coordination, etc.)
   */
  _handleGatewayDispatch(eventName: string, data: any) {
    switch (eventName) {
      case 'READY':
        console.log(`[Discord] Connected as ${data.user?.username}`);
        break;

      case 'MESSAGE_CREATE': {
        // Could add notification logic here in the future
        const currentUser = useDiscordStore.getState().user;
        if (data.author?.id !== currentUser?.id) {
          // Message from someone else — potential notification
        }
        break;
      }

      default:
        break;
    }
  },
};
