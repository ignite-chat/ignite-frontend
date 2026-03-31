import { useState, useEffect, useCallback, useRef } from 'react';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { useTelegramMessagesStore } from '../store/telegram-messages.store';
import { TelegramService } from '../services/telegram.service';

export function useTelegramChat(chatId: string | undefined) {
  const chat = useTelegramChatsStore((s) => s.chats.find((c) => c.id === chatId));
  const messages = useTelegramMessagesStore((s) => (chatId ? s.chatMessages[chatId] || [] : []));
  const pendingMessages = useTelegramMessagesStore((s) => (chatId ? s.chatPendingMessages[chatId] || [] : []));
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadedRef = useRef<string | null>(null);

  // Load messages on mount or chat change
  useEffect(() => {
    if (!chatId || loadedRef.current === chatId) return;
    loadedRef.current = chatId;

    setIsLoading(true);
    setHasMore(true);
    TelegramService.loadChatMessages(chatId).then((result) => {
      setIsLoading(false);
      setHasMore(result.hasMore);
    });
  }, [chatId]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!chatId || isLoading || !hasMore) return;

    const currentMessages = useTelegramMessagesStore.getState().chatMessages[chatId] || [];
    if (currentMessages.length === 0) return;

    const oldestId = currentMessages[0]?.id;
    setIsLoading(true);
    const result = await TelegramService.loadChatMessages(chatId, oldestId, 50);
    setIsLoading(false);
    setHasMore(result.hasMore);
  }, [chatId, isLoading, hasMore]);

  // Send message
  const sendMessage = useCallback(
    async (text: string, replyToMsgId?: number) => {
      if (!chatId) return false;
      return TelegramService.sendMessage(chatId, text, replyToMsgId);
    },
    [chatId],
  );

  // Mark as read
  const markAsRead = useCallback(() => {
    if (!chatId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    TelegramService.markAsRead(chatId, lastMsg.id);
  }, [chatId, messages]);

  return {
    chat,
    messages,
    pendingMessages,
    isLoading,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
  };
}
