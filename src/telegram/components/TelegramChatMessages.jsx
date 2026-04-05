import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Check } from '@phosphor-icons/react';
import { useTelegramMessagesStore } from '../store/telegram-messages.store';
import { useTelegramTypingStore } from '../store/telegram-typing.store';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { useTelegramStore } from '../store/telegram.store';
import { useTelegramPreferencesStore } from '../store/telegram-preferences.store';
import { TelegramService } from '../services/telegram.service';
import TelegramMessage from './TelegramMessage';
import MessageSkeletonList from '@/components/message/MessageSkeleton';
import TypingDots from '@/components/ui/typing-dots';

const TelegramChatMessages = ({ chatId, chatType, messageSentCount }) => {
  const isGroupChat = chatType === 'group' || chatType === 'supergroup';
  const messages = useTelegramMessagesStore((s) => chatId ? s.chatMessages[chatId] || [] : []);
  const pendingMessages = useTelegramMessagesStore((s) => chatId ? s.chatPendingMessages[chatId] || [] : []);
  const typingUsers = useTelegramTypingStore((s) => chatId ? s.typing[chatId] || [] : []);
  const unreadCount = useTelegramChatsStore((s) => {
    const chat = s.chats.find((c) => c.id === chatId);
    return chat?.unreadCount || 0;
  });
  const showUnreadBanner = useTelegramPreferencesStore((s) => s.showUnreadBanner);

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const loadedChatRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Use refs so the scroll handler always sees current values
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  isLoadingRef.current = isLoading;
  hasMoreRef.current = hasMore;

  // Track if user is at bottom
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  // Reset state when chat changes
  useEffect(() => {
    if (!chatId) return;
    if (loadedChatRef.current === chatId) return;
    loadedChatRef.current = chatId;
    setInitialLoad(true);
    setHasMore(true);
    setIsLoading(false);

    TelegramService.loadChatMessages(chatId).then((result) => {
      setInitialLoad(false);
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView();
      });
    });
  }, [chatId]);

  // Auto-scroll to bottom on new messages if already at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages.length, pendingMessages.length, messageSentCount]);

  // Load older messages — uses refs to avoid stale closures
  const loadOlder = useCallback(async () => {
    if (!chatId || isLoadingRef.current || !hasMoreRef.current) return;

    const currentMessages = useTelegramMessagesStore.getState().chatMessages[chatId] || [];
    if (currentMessages.length === 0) return;

    const oldestId = currentMessages[0]?.id;
    if (!oldestId) return;

    const el = containerRef.current;
    const prevHeight = el?.scrollHeight || 0;

    setIsLoading(true);
    isLoadingRef.current = true;

    try {
      const result = await TelegramService.loadChatMessages(chatId, oldestId, 50);
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }

    // Maintain scroll position after prepending older messages
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevHeight;
      }
    });
  }, [chatId]);

  const handleScrollContainer = useCallback(
    (e) => {
      handleScroll();
      // Trigger load when scrolled near the top
      if (e.target.scrollTop < 300 && hasMoreRef.current && !isLoadingRef.current) {
        loadOlder();
      }
    },
    [handleScroll, loadOlder],
  );

  // Mark as read when viewing messages (only when banner is disabled)
  useEffect(() => {
    if (showUnreadBanner) return;
    if (!chatId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const timer = setTimeout(() => {
      TelegramService.markAsRead(chatId, lastMsg.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatId, messages.length, showUnreadBanner]);

  const handleMarkAsRead = useCallback(() => {
    if (!chatId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    TelegramService.markAsRead(chatId, lastMsg.id);
  }, [chatId, messages]);

  // Determine which messages should show sender header (group by sender + 5min window)
  const messageGroups = useMemo(() => {
    return messages.map((msg, i) => {
      if (i === 0) return true;
      const prev = messages[i - 1];
      if (prev.senderId !== msg.senderId) return true;
      if (prev.action || msg.action) return true;
      if (msg.date - prev.date > 300) return true;
      return false;
    });
  }, [messages]);

  if (initialLoad) {
    return (
      <div className="flex-1 overflow-y-auto">
        <MessageSkeletonList />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 flex-col overflow-y-auto"
      onScroll={handleScrollContainer}
    >
      {/* Unread banner */}
      {showUnreadBanner && unreadCount > 0 && (
        <div className="sticky left-0 right-0 top-0 z-10 flex items-center justify-between bg-[#2AABEE] px-4 py-2 text-sm">
          <span className="font-medium text-white">
            {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={handleMarkAsRead}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-white transition-colors hover:text-white/80"
          >
            Mark as Read
            <Check size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Loading indicator for older messages */}
      {isLoading && (
        <div className="flex shrink-0 justify-center py-3">
          <div className="size-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <div className="flex shrink-0 items-center justify-center py-6 text-sm text-gray-500">
          Beginning of conversation
        </div>
      )}

      {/* Messages */}
      <div className="mt-auto flex flex-col py-2">
        {messages.map((msg, i) => (
          <TelegramMessage
            key={msg.id}
            message={msg}
            showSender={messageGroups[i]}
            isGroupChat={isGroupChat}
          />
        ))}

        {/* Pending messages */}
        {pendingMessages.map((msg) => (
          <TelegramMessage
            key={`pending-${msg.nonce}`}
            message={msg}
            showSender={true}
            isPending={true}
            isGroupChat={isGroupChat}
          />
        ))}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 px-4 py-1.5">
          <TypingDots />
          <span className="text-xs text-gray-400">
            {typingUsers.map((t) => t.firstName).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default TelegramChatMessages;
