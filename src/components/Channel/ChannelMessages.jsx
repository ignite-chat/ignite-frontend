import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { useChannelsStore } from '../../store/channels.store';
import { ChannelsService } from '@/services/channels.service';
import { UnreadsService } from '@/services/unreads.service';
import { useUnreadsStore } from '../../store/unreads.store';
import { isMessageRead } from '@/utils/unreads.utils';
import { scrollPositions } from '@/store/last-channel.store';
import MessageList from '../Message/MessageList';

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

    const el = messagesRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;

    const data = await ChannelsService.loadChannelMessages(channel?.channel_id, oldestMessage.id);
    setHasMore(data.length >= 50);

    // Preserve scroll position so the view doesn't jump
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
      }
    });

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

  // Auto-scroll when content resizes (embed/image loads) and user was near bottom
  useEffect(() => {
    const content = contentRef.current;
    const scrollEl = messagesRef.current;
    if (!content || !scrollEl) return;

    const observer = new ResizeObserver(() => {
      if (wasNearBottomRef.current) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
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
        />
      </div>
    </div>
  );
};

export default ChannelMessages;
