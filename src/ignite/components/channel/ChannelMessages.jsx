import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Check } from '@phosphor-icons/react';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { useChannelsStore } from '../../store/channels.store';
import { ChannelsService } from '@/ignite/services/channels.service';
import { UnreadsService } from '@/ignite/services/unreads.service';
import { useUnreadsStore } from '../../store/unreads.store';
import { isMessageRead } from '@/ignite/utils/unreads.utils';
import { scrollPositions } from '@/store/last-channel.store';
import MessageList from '../message/MessageList';

function getSnowflakeTimestamp(id) {
  return BigInt(id) >> 22n;
}

function formatSinceTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `today at ${time}`;
  if (isYesterday) return `yesterday at ${time}`;
  return `${date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })} at ${time}`;
}

const ChannelMessages = ({ channel, messageId }) => {
  const { guildId } = useGuildContext();
  const { editingId, setEditingId, setReplyingId } = useChannelContext();
  const channelMessages = useChannelsStore((s) => s.channelMessages);
  const channelPendingMessages = useChannelsStore((s) => s.channelPendingMessages);

  const [atTop, setAtTop] = useState(false);
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessagesSeparatorId, setNewMessagesSeparatorId] = useState(null);
  const [unreadBannerDismissed, setUnreadBannerDismissed] = useState(false);

  const messagesRef = useRef();
  const contentRef = useRef();
  const wasNearBottomRef = useRef(true);
  const messages = useMemo(
    () => channelMessages[channel?.channel_id] || [],
    [channelMessages, channel?.channel_id]
  );
  const pendingMessages = useMemo(
    () => channelPendingMessages[channel?.channel_id] || [],
    [channelPendingMessages, channel?.channel_id]
  );

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    const sorted = [...messages].sort((a, b) => b.id.localeCompare(a.id));
    const oldestMessage = sorted[sorted.length - 1];
    if (!oldestMessage) return;

    setLoadingMore(true);

    const data = await ChannelsService.loadChannelMessages(channel?.channel_id, oldestMessage.id);
    setHasMore(data.length >= 50);
    setLoadingMore(false);
  }, [messages, loadingMore, hasMore, channel?.channel_id]);

  // (Scroll position is saved continuously via onScroll handler below)

  // Load initial messages or restore scroll position
  useEffect(() => {
    if (channel?.channel_id && channelMessages[channel?.channel_id] == null) {
      setIsLoading(true);
      setHasMore(true);
      ChannelsService.loadChannelMessages(channel?.channel_id)
        .then((data) => {
          setHasMore(data.length >= 50);
          setTimeout(() => setForceScrollDown(true), 0);
        })
        .finally(() => setIsLoading(false));
    }

    if (!messagesRef.current) return;
    if (!messageId) {
      const saved = scrollPositions.getMessage(channel?.channel_id);
      if (saved != null) {
        messagesRef.current.scrollTop = saved;
      } else {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    }
  }, [channel?.channel_id, channelMessages, messageId]);

  // Snapshot last_read_message_id when switching channels to position the "NEW" separator
  useEffect(() => {
    if (!channel?.channel_id) {
      setNewMessagesSeparatorId(null);
      return;
    }
    const { channelUnreads } = useUnreadsStore.getState();
    const unread = channelUnreads.find((u) => u.channel_id === channel.channel_id);
    if (
      unread?.last_read_message_id &&
      channel.last_message_id &&
      getSnowflakeTimestamp(channel.last_message_id) > getSnowflakeTimestamp(unread.last_read_message_id)
    ) {
      setNewMessagesSeparatorId(unread.last_read_message_id);
    } else {
      setNewMessagesSeparatorId(null);
    }
  }, [channel?.channel_id]);

  // Clear the "NEW" separator when the user sends a message
  useEffect(() => {
    if (pendingMessages.length > 0) {
      setNewMessagesSeparatorId(null);
    }
  }, [pendingMessages.length]);

  const lastScrolledIdRef = useRef(null);

  // Clear highlight when navigating away from a specific message
  useEffect(() => {
    if (!messageId) {
      setHighlightId(null);
      lastScrolledIdRef.current = null;
    }
  }, [messageId]);

  // Handle message jumping
  useEffect(() => {
    if (!messageId || messages.length === 0 || lastScrolledIdRef.current === messageId) return;

    const tryScroll = (retryCount = 0) => {
      const targetMessage = messages.find((m) => m.id === messageId);
      if (!targetMessage) return;

      lastScrolledIdRef.current = messageId;
      setHighlightId(messageId);
      
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (retryCount < 5) {
        // If element not found yet, retry after a bit (DOM might be rendering)
        setTimeout(() => tryScroll(retryCount + 1), 100);
      }
    };

    tryScroll();

    // Clear highlight after 3 seconds
    const timer = setTimeout(() => {
      setHighlightId(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [messageId, messages]);

  // Handle message acknowledgment
  useEffect(() => {
    if (!messages || !channel?.channel_id) return;

    const el = messagesRef.current;
    if (!el) return;

    let lastAckTime = 0;

    function checkAndAckAtBottom() {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      const now = Date.now();
      if (nearBottom && channel.last_message_id) {
        const lastMessageId = channel.last_message_id;

        const alreadyRead = isMessageRead(
          channel.channel_id,
          lastMessageId,
          useUnreadsStore.getState().channelUnreads
        );

        if (!alreadyRead && now - lastAckTime > 10000) {
          ChannelsService.acknowledgeChannelMessage(channel.channel_id, lastMessageId);
          lastAckTime = now;
        }

        UnreadsService.setLastReadMessageId(channel.channel_id, lastMessageId);
      }
    }

    const interval = setInterval(checkAndAckAtBottom, 100);
    return () => clearInterval(interval);
  }, [channel?.channel_id, messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messagesRef.current || messageId) return;
    const nearBottom =
      messagesRef.current.scrollHeight -
        messagesRef.current.scrollTop -
        messagesRef.current.clientHeight <
      100;
    if (forceScrollDown || nearBottom) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      if (forceScrollDown) setForceScrollDown(false);
    }
  }, [messages, forceScrollDown, messageId]);

  // Always scroll to bottom when the current user sends a message (pending messages added)
  useEffect(() => {
    if (!messagesRef.current || !pendingMessages.length || messageId) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [pendingMessages, messageId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setEditingId(null);
        setReplyingId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setEditingId, setReplyingId]);

  // Handle scroll position and auto-load more
  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);

    // Save scroll position on every scroll
    if (channel?.channel_id) {
      scrollPositions.saveMessage(channel.channel_id, el.scrollTop);
    }

    wasNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    if (el.scrollTop < 200 && hasMore && !loadingMore) {
      onLoadMore();
    }
  }, [channel?.channel_id, hasMore, loadingMore, onLoadMore]);

  // Auto-scroll when content resizes (embed/image loads) and user was near bottom,
  // or preserve scroll position when content above the viewport expands
  useEffect(() => {
    const content = contentRef.current;
    const scrollEl = messagesRef.current;
    if (!content || !scrollEl) return;

    let prevScrollHeight = scrollEl.scrollHeight;
    const observer = new ResizeObserver(() => {
      const newScrollHeight = scrollEl.scrollHeight;
      const delta = newScrollHeight - prevScrollHeight;
      prevScrollHeight = newScrollHeight;

      if (wasNearBottomRef.current) {
        scrollEl.scrollTop = newScrollHeight;
      } else if (delta > 0) {
        scrollEl.scrollTop += delta;
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={messagesRef} onScroll={onScroll}>
      <div ref={contentRef}>
        <MessageList
          messages={messages}
          pendingMessages={pendingMessages}
          editingId={editingId}
          setEditingId={setEditingId}
          highlightId={highlightId}
          guildId={guildId}
          isLoading={isLoading}
          hasMore={hasMore}
          loadingMore={loadingMore}
          newMessagesSeparatorId={newMessagesSeparatorId}
        />
      </div>
    </div>
  );
};

export default ChannelMessages;
