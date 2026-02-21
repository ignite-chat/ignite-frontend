import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { DiscordService } from '../services/discord.service';
import DiscordMessage from './DiscordMessage';

const DiscordChannelMessages = ({ channelId }) => {
  const channelMessages = useDiscordChannelsStore((s) => s.channelMessages);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forceScrollDown, setForceScrollDown] = useState(false);

  const messagesRef = useRef();
  const messages = useMemo(
    () => channelMessages[channelId] || [],
    [channelMessages, channelId]
  );

  // Load initial messages
  useEffect(() => {
    if (!channelId) return;
    if (channelMessages[channelId] != null) {
      // Already loaded, just scroll to bottom
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
      return;
    }

    setIsLoading(true);
    setHasMore(true);
    DiscordService.loadChannelMessages(channelId)
      .then((data) => {
        setHasMore(data.length >= 50);
        setTimeout(() => setForceScrollDown(true), 0);
      })
      .finally(() => setIsLoading(false));
  }, [channelId, channelMessages]);

  // Load older messages on scroll to top
  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setLoadingMore(true);

    const el = messagesRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;

    const data = await DiscordService.loadChannelMessages(channelId, oldestMessage.id);
    setHasMore(data.length >= 50);

    // Preserve scroll position so the view doesn't jump
    requestAnimationFrame(() => {
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
      }
    });

    setLoadingMore(false);
  }, [messages, loadingMore, hasMore, channelId]);

  // Auto-scroll on new messages when near bottom
  useEffect(() => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (forceScrollDown || nearBottom) {
      el.scrollTop = el.scrollHeight;
      if (forceScrollDown) setForceScrollDown(false);
    }
  }, [messages, forceScrollDown]);

  // Handle scroll position and auto-load more
  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;

    if (el.scrollTop < 200 && hasMore && !loadingMore) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={messagesRef} onScroll={onScroll}>
      {loadingMore && (
        <div className="flex justify-center py-3">
          <div className="size-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
        </div>
      )}

      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="pb-4">
          {!hasMore && messages.length > 0 && (
            <div className="px-4 pb-4 pt-8 text-sm text-gray-500">
              This is the beginning of the channel.
            </div>
          )}
          {messages.map((msg, i) => (
            <DiscordMessage
              key={msg.id}
              message={msg}
              prevMessage={i > 0 ? messages[i - 1] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscordChannelMessages;
