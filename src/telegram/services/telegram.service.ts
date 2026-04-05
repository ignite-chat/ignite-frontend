import { Api } from 'telegram';
import bigInt from 'big-integer';
import { toast } from 'sonner';
import { TelegramClientService } from './telegram-client.service';
import { TelegramUpdatesService } from './telegram-updates.service';
import { useTelegramStore } from '../store/telegram.store';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { useTelegramMessagesStore } from '../store/telegram-messages.store';
import { useTelegramUsersStore } from '../store/telegram-users.store';
import { useTelegramReadStatesStore } from '../store/telegram-readstates.store';
import { useTelegramTypingStore } from '../store/telegram-typing.store';
import {
  bigIntToString,
  gramUserToTelegramUser,
  gramMessageToTelegramMessage,
  gramDialogToTelegramChat,
} from '../utils/helpers';

let typingTimer: ReturnType<typeof setInterval> | null = null;

export const TelegramService = {
  /**
   * Connect to Telegram using stored session.
   */
  async connect(): Promise<boolean> {
    const store = useTelegramStore.getState();
    if (store.isConnected || store.isConnecting) return store.isConnected;
    if (!store.session) return false;

    store.setConnecting(true);
    store.setConnectionFailed(false);

    try {
      TelegramClientService.initialize(store.session);
      const authorized = await TelegramClientService.connect();

      if (!authorized) {
        store.setConnecting(false);
        store.setConnectionFailed(true);
        return false;
      }

      const client = TelegramClientService.getClient()!;

      // Get current user
      const me = await client.getMe() as Api.User;
      store.setUser({
        id: me.id.toString(),
        firstName: me.firstName || '',
        lastName: me.lastName || undefined,
        username: me.username || undefined,
        phone: me.phone || undefined,
      });

      // Register update handlers
      TelegramUpdatesService.register(client);

      // Start periodic typing cleanup
      if (typingTimer) clearInterval(typingTimer);
      typingTimer = setInterval(() => {
        useTelegramTypingStore.getState().clearExpired();
      }, 2000);

      store.setConnected(true);
      store.setConnecting(false);
      store.setConnectionFailed(false);
      console.log(`[Telegram] Connected as ${me.firstName} ${me.lastName || ''}`);

      // Load initial chats
      await this.loadChats();

      return true;
    } catch (error: any) {
      console.error('[Telegram] Connection failed:', error);
      store.setConnecting(false);
      store.setConnectionFailed(true);
      const msg = error?.message?.includes('WebSocket')
        ? 'Could not reach Telegram servers. Check your network connection.'
        : 'Failed to connect to Telegram.';
      toast.error(msg);
      return false;
    }
  },

  /**
   * Disconnect and clear all stores.
   */
  async disconnect() {
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }

    const client = TelegramClientService.getClient();
    if (client) {
      TelegramUpdatesService.unregister(client);
    }

    await TelegramClientService.disconnect();
    useTelegramChatsStore.getState().clear();
    useTelegramMessagesStore.getState().clear();
    useTelegramUsersStore.getState().clear();
    useTelegramReadStatesStore.getState().clear();
    useTelegramTypingStore.getState().clearExpired();

    useTelegramStore.getState().setConnected(false);
    useTelegramStore.getState().setConnecting(false);
    console.log('[Telegram] Disconnected and stores cleared');
  },

  /**
   * Full logout — disconnect + clear session.
   */
  async logout() {
    await this.disconnect();
    useTelegramStore.getState().disconnect();
    toast.success('Disconnected from Telegram.');
  },

  /**
   * Load dialog list (chats).
   */
  async loadChats(limit: number = 50, offsetDate?: number) {
    const client = TelegramClientService.getClient();
    if (!client) return [];

    try {
      const dialogs = await client.getDialogs({
        limit,
        ...(offsetDate && { offsetDate }),
      });

      const chats = dialogs.map((d) => gramDialogToTelegramChat(d));
      const users: Api.User[] = [];

      // Extract user entities from dialogs
      for (const dialog of dialogs) {
        if (dialog.entity instanceof Api.User) {
          users.push(dialog.entity);
        }
        // Also get sender from last message
        if (dialog.message?.sender && dialog.message.sender instanceof Api.User) {
          users.push(dialog.message.sender);
        }
      }

      // Store users
      if (users.length > 0) {
        useTelegramUsersStore.getState().addUsers(users.map(gramUserToTelegramUser));
      }

      // Store chats
      useTelegramChatsStore.getState().setChats(chats);

      // Download chat photos in background (don't block)
      this._loadChatPhotos(dialogs, chats);

      // Store read states
      const readStates = dialogs.map((d) => ({
        chatId: gramDialogToTelegramChat(d).id,
        lastReadMessageId: d.dialog.readInboxMaxId || 0,
        unreadCount: d.unreadCount || 0,
        unreadMentionCount: d.unreadMentionsCount || 0,
      }));
      useTelegramReadStatesStore.getState().setReadStates(readStates);

      return chats;
    } catch (error) {
      console.error('[Telegram] Failed to load chats:', error);
      toast.error('Failed to load Telegram chats.');
      return [];
    }
  },

  /**
   * Load messages for a specific chat.
   * Returns { messages, total, hasMore } so the caller can determine pagination state.
   */
  async loadChatMessages(chatId: string, offsetId?: number, limit: number = 50): Promise<{ messages: any[]; total: number; hasMore: boolean }> {
    const client = TelegramClientService.getClient();
    if (!client) return { messages: [], total: 0, hasMore: false };

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) return { messages: [], total: 0, hasMore: false };

      const result = await client.getMessages(peer, {
        limit,
        ...(offsetId && { offsetId }),
      });

      // result is a TotalList with a .total property (total messages in chat)
      const total = (result as any).total ?? 0;

      const tgMessages = result
        .filter((m): m is Api.Message => m instanceof Api.Message)
        .map((m) => gramMessageToTelegramMessage(m))
        .reverse(); // Chronological order

      // Store user data from message senders
      const senderUsers = result
        .filter((m) => m.sender && m.sender instanceof Api.User)
        .map((m) => gramUserToTelegramUser(m.sender as Api.User));
      if (senderUsers.length > 0) {
        useTelegramUsersStore.getState().addUsers(senderUsers);
      }

      const { chatMessages, setChatMessages } = useTelegramMessagesStore.getState();
      const existing = chatMessages[chatId] || [];

      // Merge and deduplicate by ID, sort chronologically
      const merged = [...tgMessages, ...existing];
      const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values()).sort(
        (a, b) => a.id - b.id,
      );

      setChatMessages(chatId, unique);

      // hasMore: true if the total messages in this chat exceeds what we have loaded
      const hasMore = unique.length < total;

      return { messages: tgMessages, total, hasMore };
    } catch (error) {
      console.error(`[Telegram] Failed to load messages for chat ${chatId}:`, error);
      toast.error('Failed to load Telegram messages.');
      return { messages: [], total: 0, hasMore: false };
    }
  },

  /**
   * Send a text message to a chat.
   */
  async sendMessage(chatId: string, text: string, replyToMsgId?: number) {
    const client = TelegramClientService.getClient();
    if (!client) return false;

    const currentUser = useTelegramStore.getState().user;
    const nonce = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Add pending message for instant UI feedback
    if (currentUser) {
      useTelegramMessagesStore.getState().addPendingMessage(chatId, {
        nonce,
        chatId,
        text,
        senderId: currentUser.id,
        senderName: currentUser.firstName,
        date: Math.floor(Date.now() / 1000),
        replyToMsgId,
        status: 'sending',
      });
    }

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) throw new Error('Could not resolve peer');

      await client.sendMessage(peer, {
        message: text,
        ...(replyToMsgId && { replyTo: replyToMsgId }),
      });

      return true;
    } catch (error: any) {
      console.error(`[Telegram] Failed to send message to ${chatId}:`, error);
      useTelegramMessagesStore.getState().markPendingFailed(chatId, nonce, {
        message: error.message || 'Failed to send message',
      });

      // Handle flood wait
      if (error.errorMessage === 'FLOOD_WAIT') {
        toast.error(`Rate limited. Please wait ${error.seconds || 'a moment'} before sending again.`);
      }

      return false;
    }
  },

  /**
   * Mark messages as read in a chat.
   */
  async markAsRead(chatId: string, maxId?: number) {
    const client = TelegramClientService.getClient();
    if (!client) return;

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) return;

      await client.markAsRead(peer, maxId);

      // Update local read state
      if (maxId) {
        useTelegramReadStatesStore.getState().ackChat(chatId, maxId);
      }
      useTelegramChatsStore.getState().updateChat(chatId, { unreadCount: 0, unreadMentionCount: 0 });
    } catch (error) {
      console.error(`[Telegram] Failed to mark chat ${chatId} as read:`, error);
    }
  },

  /**
   * Delete messages from a chat.
   */
  async deleteMessages(chatId: string, messageIds: number[], revoke: boolean = true) {
    const client = TelegramClientService.getClient();
    if (!client) return false;

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) return false;

      await client.invoke(
        new Api.messages.DeleteMessages({
          id: messageIds,
          revoke,
        }),
      );

      // Remove from local store
      const store = useTelegramMessagesStore.getState();
      for (const id of messageIds) {
        store.removeMessage(chatId, id);
      }

      return true;
    } catch (error: any) {
      // Try channel delete for channels/supergroups
      try {
        const peer = await this._resolvePeer(chatId);
        if (peer instanceof Api.PeerChannel) {
          await client.invoke(
            new Api.channels.DeleteMessages({
              channel: new Api.InputChannel({ channelId: (peer as Api.PeerChannel).channelId, accessHash: bigInt(0) }),
              id: messageIds,
            }),
          );
          const store = useTelegramMessagesStore.getState();
          for (const id of messageIds) {
            store.removeMessage(chatId, id);
          }
          return true;
        }
      } catch {}

      console.error(`[Telegram] Failed to delete messages:`, error);
      toast.error('Failed to delete message.');
      return false;
    }
  },

  /**
   * Edit a message in a chat.
   */
  async editMessage(chatId: string, messageId: number, newText: string) {
    const client = TelegramClientService.getClient();
    if (!client) return false;

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) return false;

      await client.invoke(
        new Api.messages.EditMessage({
          peer,
          id: messageId,
          message: newText,
        }),
      );

      // Update local store
      useTelegramMessagesStore.getState().updateMessage(chatId, messageId, {
        text: newText,
        editDate: Math.floor(Date.now() / 1000),
      });

      return true;
    } catch (error: any) {
      console.error(`[Telegram] Failed to edit message:`, error);
      toast.error(error.errorMessage === 'MESSAGE_NOT_MODIFIED' ? 'Message not modified.' : 'Failed to edit message.');
      return false;
    }
  },

  /**
   * Download media from a message and return a blob URL.
   */
  async downloadMedia(chatId: string, messageId: number): Promise<string | null> {
    const client = TelegramClientService.getClient();
    if (!client) return null;

    const cacheKey = `media_${chatId}_${messageId}`;

    // Check cache first
    const cached = await TelegramClientService.getCachedPhotoUrl(cacheKey);
    if (cached) return cached;

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) return null;

      const messages = await client.getMessages(peer, { ids: [messageId] });
      const msg = messages[0];
      if (!msg || !(msg instanceof Api.Message) || !msg.media) return null;

      const buffer = await client.downloadMedia(msg.media, {});
      if (!buffer) return null;

      const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as any);
      if (data.length === 0) return null;

      const url = await (await import('./telegram-photo-cache.service')).TelegramPhotoCacheService.saveToDisk(cacheKey, data);
      return url;
    } catch (error) {
      console.error(`[Telegram] Failed to download media:`, error);
      return null;
    }
  },

  /**
   * Send typing action to a chat.
   */
  async sendTypingAction(chatId: string) {
    const client = TelegramClientService.getClient();
    if (!client) return;

    try {
      const peer = await this._resolvePeer(chatId);
      if (!peer) return;
      await client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
    } catch {}
  },

  /**
   * Resolve a chatId string to a GramJS peer.
   * Chat IDs:
   * - Positive: user
   * - Negative (> -1000000000000): basic group
   * - Negative (< -1000000000000): channel/supergroup (strip -100 prefix)
   */
  async _resolvePeer(chatId: string): Promise<Api.TypeEntityLike | null> {
    const client = TelegramClientService.getClient();
    if (!client) return null;

    try {
      const numericId = bigInt(chatId);
      if (numericId.greater(0)) {
        return new Api.PeerUser({ userId: numericId });
      } else if (numericId.greater(bigInt('-1000000000000'))) {
        return new Api.PeerChat({ chatId: numericId.negate() });
      } else {
        const channelId = numericId.negate().subtract(bigInt('1000000000000'));
        return new Api.PeerChannel({ channelId });
      }
    } catch {
      // Fallback: try to resolve as username or other entity
      try {
        return await client.getEntity(chatId);
      } catch {
        return null;
      }
    }
  },

  /**
   * Get photo URL for a user or chat entity.
   */
  async getPhotoUrl(entityId: string): Promise<string | null> {
    const cached = await TelegramClientService.getCachedPhotoUrl(`photo_${entityId}`);
    if (cached) return cached;

    const client = TelegramClientService.getClient();
    if (!client) return null;

    try {
      const peer = await this._resolvePeer(entityId);
      if (!peer) return null;
      const entity = await client.getEntity(peer);
      return await TelegramClientService.getPhotoUrl(entity as any, `photo_${entityId}`);
    } catch {
      return null;
    }
  },

  /**
   * Load photos for dialogs. First pass: load from disk cache (instant).
   * Second pass: download missing photos from Telegram API.
   */
  async _loadChatPhotos(dialogs: any[], chats: any[]) {
    const needsDownload: { dialog: any; chat: any }[] = [];

    // Pass 1: Load from persistent cache (instant, no network)
    for (let i = 0; i < dialogs.length; i++) {
      const dialog = dialogs[i];
      const chat = chats[i];
      if (!dialog.entity || !chat) continue;

      const hasPhoto = dialog.entity.photo && !(dialog.entity.photo instanceof Api.ChatPhotoEmpty) && !(dialog.entity.photo instanceof Api.UserProfilePhotoEmpty);
      if (!hasPhoto) continue;

      const cached = await TelegramClientService.getCachedPhotoUrl(`photo_${chat.id}`);
      if (cached) {
        useTelegramChatsStore.getState().updateChat(chat.id, { photo: cached });
      } else {
        needsDownload.push({ dialog, chat });
      }
    }

    // Pass 2: Download missing photos from API (background)
    for (const { dialog, chat } of needsDownload) {
      try {
        const url = await TelegramClientService.getPhotoUrl(dialog.entity, `photo_${chat.id}`);
        if (url) {
          useTelegramChatsStore.getState().updateChat(chat.id, { photo: url });
        }
      } catch {}
    }
  },

  // ─── Account / Profile ───────────────────────────────────────────

  async getMe() {
    const client = TelegramClientService.getClient();
    if (!client) return null;
    try {
      return await client.getMe();
    } catch (error) {
      console.error('[Telegram] Failed to get current user:', error);
      return null;
    }
  },

  async updateProfile(updates: { firstName?: string; lastName?: string; about?: string }) {
    const client = TelegramClientService.getClient();
    if (!client) return;
    try {
      await client.invoke(new Api.account.UpdateProfile(updates));
      toast.success('Profile updated');
    } catch (error: any) {
      console.error('[Telegram] Failed to update profile:', error);
      toast.error(error.errorMessage || 'Failed to update profile');
    }
  },

  async updateUsername(username: string) {
    const client = TelegramClientService.getClient();
    if (!client) return;
    try {
      await client.invoke(new Api.account.UpdateUsername({ username }));
      toast.success('Username updated');
    } catch (error: any) {
      console.error('[Telegram] Failed to update username:', error);
      toast.error(error.errorMessage || 'Failed to update username');
    }
  },

  // ─── Linked Devices / Sessions ───────────────────────────────────

  async getAuthorizations() {
    const client = TelegramClientService.getClient();
    if (!client) return [];
    try {
      const result = await client.invoke(new Api.account.GetAuthorizations());
      return result.authorizations || [];
    } catch (error) {
      console.error('[Telegram] Failed to get authorizations:', error);
      return [];
    }
  },

  async terminateSession(hash: bigInt.BigInteger) {
    const client = TelegramClientService.getClient();
    if (!client) return false;
    try {
      await client.invoke(new Api.account.ResetAuthorization({ hash }));
      toast.success('Session terminated');
      return true;
    } catch (error: any) {
      console.error('[Telegram] Failed to terminate session:', error);
      toast.error(error.errorMessage || 'Failed to terminate session');
      return false;
    }
  },

  async terminateAllOtherSessions() {
    const client = TelegramClientService.getClient();
    if (!client) return false;
    try {
      await client.invoke(new Api.auth.ResetAuthorizations());
      toast.success('All other sessions terminated');
      return true;
    } catch (error: any) {
      console.error('[Telegram] Failed to terminate all sessions:', error);
      toast.error(error.errorMessage || 'Failed to terminate sessions');
      return false;
    }
  },

  // ─── Privacy ─────────────────────────────────────────────────────

  async getPrivacy(key: Api.TypeInputPrivacyKey) {
    const client = TelegramClientService.getClient();
    if (!client) return null;
    try {
      return await client.invoke(new Api.account.GetPrivacy({ key }));
    } catch (error) {
      console.error('[Telegram] Failed to get privacy:', error);
      return null;
    }
  },

  async setPrivacy(key: Api.TypeInputPrivacyKey, rules: Api.TypeInputPrivacyRule[]) {
    const client = TelegramClientService.getClient();
    if (!client) return false;
    try {
      await client.invoke(new Api.account.SetPrivacy({ key, rules }));
      return true;
    } catch (error: any) {
      console.error('[Telegram] Failed to set privacy:', error);
      toast.error(error.errorMessage || 'Failed to update privacy');
      return false;
    }
  },

  // ─── Blocked Users ───────────────────────────────────────────────

  async getBlockedUsers(offset = 0, limit = 100) {
    const client = TelegramClientService.getClient();
    if (!client) return { users: [], count: 0 };
    try {
      const result = await client.invoke(new Api.contacts.GetBlocked({ offset, limit }));
      const users = (result as any).users || [];
      const blocked = (result as any).blocked || [];
      return { users, blocked, count: blocked.length };
    } catch (error) {
      console.error('[Telegram] Failed to get blocked users:', error);
      return { users: [], blocked: [], count: 0 };
    }
  },

  async blockUser(userId: string) {
    const client = TelegramClientService.getClient();
    if (!client) return false;
    try {
      const peer = await this._resolvePeer(userId);
      if (!peer) return false;
      await client.invoke(new Api.contacts.Block({ id: peer as Api.TypeInputPeer }));
      toast.success('User blocked');
      return true;
    } catch (error: any) {
      console.error('[Telegram] Failed to block user:', error);
      toast.error(error.errorMessage || 'Failed to block user');
      return false;
    }
  },

  async unblockUser(userId: string) {
    const client = TelegramClientService.getClient();
    if (!client) return false;
    try {
      const peer = await this._resolvePeer(userId);
      if (!peer) return false;
      await client.invoke(new Api.contacts.Unblock({ id: peer as Api.TypeInputPeer }));
      toast.success('User unblocked');
      return true;
    } catch (error: any) {
      console.error('[Telegram] Failed to unblock user:', error);
      toast.error(error.errorMessage || 'Failed to unblock user');
      return false;
    }
  },
};
