import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { useChannelsStore } from '../../store/channels.store';
import { ChannelsService } from '@/services/channels.service';
import { UnreadsService } from '@/services/unreads.service';
import { useUnreadsStore } from '../../store/unreads.store';
import { isMessageRead } from '@/utils/unreads.utils';
import MessageList from '../Message/MessageList';

const ChannelMessages = ({ channel, messageId }) => {
  const { guildId } = useGuildContext();
  const { editingId, setEditingId, setReplyingId } = useChannelContext();
  const channelMessages = useChannelsStore((s) => s.channelMessages);
  const channelPendingMessages = useChannelsStore((s) => s.channelPendingMessages);

  const [atTop, setAtTop] = useState(false);
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesRef = useRef();
  const messages = useMemo(
    () => channelMessages[channel?.channel_id] || [],
    [channelMessages, channel?.channel_id]
  );
  const pendingMessages = useMemo(
    () => channelPendingMessages[channel?.channel_id] || [],
    [channelPendingMessages, channel?.channel_id]
  );

  const onLoadMore = useCallback(async () => {
    const oldestMessage = messages.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )[0];
    console.log('Loading more messages before ID:', oldestMessage.id);
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    if (channel?.channel_id && channelMessages[channel?.channel_id] == null) {
      setIsLoading(true);
      ChannelsService.loadChannelMessages(channel?.channel_id)
        .then(() => {
          setHasMore(channelMessages[channel?.channel_id]?.length === 50);
          setTimeout(() => setForceScrollDown(true), 0);
        })
        .finally(() => setIsLoading(false));
    }

    if (!messagesRef.current) return;
    if (!messageId) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
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
      if (nearBottom && messages.length > 0) {
        const lastMessageId = messages[messages.length - 1]?.id;

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

  // Handle scroll position
  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={messagesRef} onScroll={onScroll}>
      <MessageList
        messages={messages}
        pendingMessages={pendingMessages}
        editingId={editingId}
        setEditingId={setEditingId}
        highlightId={highlightId}
        guildId={guildId}
        isLoading={isLoading}
        hasMore={hasMore}
        atTop={atTop}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
      />
    </div>
  );
};

export default ChannelMessages;
