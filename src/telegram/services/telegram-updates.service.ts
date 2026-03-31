import { Api } from 'telegram';
import { NewMessage } from 'telegram/events';
import { EditedMessage } from 'telegram/events/EditedMessage';
import { DeletedMessage } from 'telegram/events/DeletedMessage';
import type { TelegramClient } from 'telegram';
import { useTelegramMessagesStore } from '../store/telegram-messages.store';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { useTelegramUsersStore } from '../store/telegram-users.store';
import { useTelegramTypingStore } from '../store/telegram-typing.store';
import { useTelegramReadStatesStore } from '../store/telegram-readstates.store';
import { bigIntToString, gramMessageToTelegramMessage, gramUserToTelegramUser } from '../utils/helpers';

export const TelegramUpdatesService = {
  _handlers: [] as Array<{ event: any; handler: any }>,

  /**
   * Register all event handlers on the client.
   */
  register(client: TelegramClient) {
    this.unregister(client);

    // New message
    const newMsgHandler = async (event: any) => {
      const message = event.message as Api.Message;
      if (!message) return;

      const chatId = bigIntToString(message.peerId);
      const tgMessage = gramMessageToTelegramMessage(message);

      // Add message to store
      useTelegramMessagesStore.getState().appendMessage(chatId, tgMessage);

      // Remove pending message with matching text (optimistic UI reconciliation)
      const pending = useTelegramMessagesStore.getState().chatPendingMessages[chatId] || [];
      const matchingPending = pending.find((p) => p.text === tgMessage.text && p.status === 'sending');
      if (matchingPending) {
        useTelegramMessagesStore.getState().removePendingByNonce(chatId, matchingPending.nonce);
      }

      // Update chat's last message and unread count
      const chat = useTelegramChatsStore.getState().chats.find((c) => c.id === chatId);
      if (chat) {
        useTelegramChatsStore.getState().updateChat(chatId, {
          lastMessage: tgMessage,
          unreadCount: tgMessage.out ? chat.unreadCount : chat.unreadCount + 1,
        });
      }

      // Remove typing indicator for sender
      if (tgMessage.senderId) {
        useTelegramTypingStore.getState().removeTypingUser(chatId, tgMessage.senderId);
      }

      // Store sender user data
      if (message.sender && message.sender instanceof Api.User) {
        useTelegramUsersStore.getState().addUser(gramUserToTelegramUser(message.sender));
      }
    };

    // Edited message
    const editMsgHandler = async (event: any) => {
      const message = event.message as Api.Message;
      if (!message) return;

      const chatId = bigIntToString(message.peerId);
      const tgMessage = gramMessageToTelegramMessage(message);

      useTelegramMessagesStore.getState().updateMessage(chatId, tgMessage.id, {
        text: tgMessage.text,
        editDate: tgMessage.editDate,
        entities: tgMessage.entities,
        media: tgMessage.media,
      });
    };

    // Deleted messages
    const deleteMsgHandler = async (event: any) => {
      const deletedIds: number[] = event.deletedIds || [];
      if (deletedIds.length === 0) return;

      // We need to check all chats since we don't know which chat the deleted messages belong to
      const { chatMessages } = useTelegramMessagesStore.getState();
      for (const [chatId, messages] of Object.entries(chatMessages)) {
        for (const msgId of deletedIds) {
          if (messages.some((m) => m.id === msgId)) {
            useTelegramMessagesStore.getState().removeMessage(chatId, msgId);
          }
        }
      }
    };

    client.addEventHandler(newMsgHandler, new NewMessage({}));
    client.addEventHandler(editMsgHandler, new EditedMessage({}));
    client.addEventHandler(deleteMsgHandler, new DeletedMessage({}));

    this._handlers = [
      { event: new NewMessage({}), handler: newMsgHandler },
      { event: new EditedMessage({}), handler: editMsgHandler },
      { event: new DeletedMessage({}), handler: deleteMsgHandler },
    ];

    // Raw update handler for typing, read states, user status
    const rawHandler = async (update: Api.TypeUpdate) => {
      // Typing indicator
      if (update instanceof Api.UpdateUserTyping) {
        const userId = bigIntToString(update.userId);
        const user = useTelegramUsersStore.getState().getUser(userId);
        useTelegramTypingStore.getState().addTypingUser(userId, {
          userId,
          firstName: user?.firstName || 'User',
        });
      }

      if (update instanceof Api.UpdateChatUserTyping) {
        const userId = update.fromId instanceof Api.PeerUser
          ? bigIntToString(update.fromId.userId)
          : undefined;
        if (userId) {
          const chatId = bigIntToString(update.chatId);
          const user = useTelegramUsersStore.getState().getUser(userId);
          useTelegramTypingStore.getState().addTypingUser(chatId, {
            userId,
            firstName: user?.firstName || 'User',
          });
        }
      }

      // Read history (inbox)
      if (update instanceof Api.UpdateReadHistoryInbox) {
        const chatId = bigIntToString(update.peer);
        useTelegramReadStatesStore.getState().updateReadState(chatId, {
          unreadCount: update.stillUnreadCount,
        });
        useTelegramChatsStore.getState().updateChat(chatId, {
          unreadCount: update.stillUnreadCount,
        });
      }

      // Read history (outbox)
      if (update instanceof Api.UpdateReadHistoryOutbox) {
        const chatId = bigIntToString(update.peer);
        useTelegramReadStatesStore.getState().updateReadState(chatId, {
          lastReadMessageId: update.maxId,
        });
      }

      // Read channel inbox
      if (update instanceof Api.UpdateReadChannelInbox) {
        const chatId = `-100${update.channelId}`;
        useTelegramReadStatesStore.getState().updateReadState(chatId, {
          lastReadMessageId: update.maxId,
          unreadCount: update.stillUnreadCount,
        });
        useTelegramChatsStore.getState().updateChat(chatId, {
          unreadCount: update.stillUnreadCount,
        });
      }

      // User status
      if (update instanceof Api.UpdateUserStatus) {
        const userId = bigIntToString(update.userId);
        if (update.status instanceof Api.UserStatusOnline) {
          useTelegramUsersStore.getState().updateStatus(userId, 'online');
        } else if (update.status instanceof Api.UserStatusOffline) {
          useTelegramUsersStore.getState().updateStatus(userId, 'offline', update.status.wasOnline);
        } else if (update.status instanceof Api.UserStatusRecently) {
          useTelegramUsersStore.getState().updateStatus(userId, 'recently');
        }
      }
    };

    client.addEventHandler(rawHandler);
    this._handlers.push({ event: undefined, handler: rawHandler });
  },

  /**
   * Remove all registered event handlers.
   */
  unregister(client: TelegramClient) {
    for (const { event, handler } of this._handlers) {
      try {
        if (event) {
          client.removeEventHandler(handler, event);
        } else {
          client.removeEventHandler(handler, undefined as any);
        }
      } catch {}
    }
    this._handlers = [];
  },
};
