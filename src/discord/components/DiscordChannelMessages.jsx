import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordHasPermission } from '../hooks/useDiscordPermission';
import { MANAGE_MESSAGES, KICK_MEMBERS, BAN_MEMBERS } from '../constants/permissions';
import { scrollPositions } from '@/store/last-channel.store';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import DiscordMessage from './DiscordMessage';

const NewMessagesSeparator = () => (
  <div className="flex items-center gap-1 pl-4 pr-3.5 mt-1.5 mb-0.5">
    <div className="flex-1 h-px bg-destructive" />
    <span className="text-[11px] font-bold text-destructive leading-none">NEW</span>
  </div>
);

const DiscordChannelMessages = ({ channel, messageSentCount }) => {
  const channelId = channel.id;
  const guildId = channel.guild_id || null;
  const currentUser = useDiscordStore((s) => s.user);

  const hasManageMessages = useDiscordHasPermission(guildId, channel, MANAGE_MESSAGES);
  const hasKickMembers = useDiscordHasPermission(guildId, channel, KICK_MEMBERS);
  const hasBanMembers = useDiscordHasPermission(guildId, channel, BAN_MEMBERS);

  const channelMessages = useDiscordChannelsStore((s) => s.channelMessages);
  const channels = useDiscordChannelsStore((s) => s.channels);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [newMessagesSeparatorId, setNewMessagesSeparatorId] = useState(null);

  const messagesRef = useRef();
  const contentRef = useRef();
  const ackTimerRef = useRef(null);
  const lastAckedRef = useRef(null);
  const wasNearBottomRef = useRef(true);

  const channelPendingMessages = useDiscordChannelsStore((s) => s.channelPendingMessages);

  const messages = useMemo(
    () => channelMessages[channelId] || [],
    [channelMessages, channelId]
  );

  const pendingMessages = useMemo(
    () => channelPendingMessages[channelId] || [],
    [channelPendingMessages, channelId]
  );

  const lastMessageId = useMemo(
    () => channels.find((c) => c.id === channelId)?.last_message_id,
    [channels, channelId]
  );

  // Ack the channel's last_message_id if scrolled to the bottom
  const ackIfAtBottom = useCallback(() => {
    if (!lastMessageId || lastAckedRef.current === lastMessageId) return;

    // Debounce: clear any pending ack and schedule a new one
    if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
    ackTimerRef.current = setTimeout(() => {
      lastAckedRef.current = lastMessageId;
      useDiscordReadStatesStore.getState().ackChannel(channelId, lastMessageId);
      DiscordApiService.ackMessage(channelId, lastMessageId).catch(() => {});
    }, 500);
  }, [channelId, lastMessageId]);

  // Reset ack state on channel switch, clear pending timers on unmount
  useEffect(() => {
    lastAckedRef.current = null;
    return () => {
      if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
    };
  }, [channelId]);

  // Snapshot read state on channel switch to position the "NEW" separator
  useEffect(() => {
    if (!channelId) {
      setNewMessagesSeparatorId(null);
      return;
    }
    const entry = useDiscordReadStatesStore.getState().readStates[channelId];
    if (
      entry?.last_message_id &&
      lastMessageId &&
      lastMessageId > entry.last_message_id
    ) {
      setNewMessagesSeparatorId(entry.last_message_id);
    } else {
      setNewMessagesSeparatorId(null);
    }
  }, [channelId]);

  // Load initial messages or restore scroll position
  useEffect(() => {
    if (!channelId) return;
    if (channelMessages[channelId] != null) {
      // Already loaded — restore saved scroll position or stay at bottom
      if (messagesRef.current) {
        const saved = scrollPositions.getMessage(channelId);
        if (saved != null) {
          messagesRef.current.scrollTop = saved;
        } else {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
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

    const data = await DiscordService.loadChannelMessages(channelId, oldestMessage.id);
    setHasMore(data.length >= 50);
    setLoadingMore(false);
  }, [messages, loadingMore, hasMore, channelId]);

  // Clear "NEW" separator when the current user sends a message
  useEffect(() => {
    if (messageSentCount > 0) {
      setNewMessagesSeparatorId(null);
    }
  }, [messageSentCount]);

  // Auto-scroll on new messages when near bottom
  useEffect(() => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (forceScrollDown || nearBottom) {
      el.scrollTop = el.scrollHeight;
      if (forceScrollDown) setForceScrollDown(false);
      ackIfAtBottom();
    }
  }, [messages, forceScrollDown, ackIfAtBottom]);

  // Always scroll to bottom when pending messages appear (user just sent a message)
  useEffect(() => {
    if (!messagesRef.current || !pendingMessages.length) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [pendingMessages]);

  // Handle scroll position and auto-load more
  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;

    // Save scroll position on every scroll
    scrollPositions.saveMessage(channelId, el.scrollTop);

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    wasNearBottomRef.current = nearBottom;

    if (el.scrollTop < 200 && hasMore && !loadingMore) {
      onLoadMore();
    }

    // Ack when scrolled to the bottom
    if (nearBottom) {
      ackIfAtBottom();
    }
  }, [channelId, hasMore, loadingMore, onLoadMore, ackIfAtBottom]);

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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={messagesRef} onScroll={onScroll}>
      <div ref={contentRef}>
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
            {messages.map((msg, i) => {
              const prevMessage = i > 0 ? messages[i - 1] : null;
              const showNewSeparator = newMessagesSeparatorId &&
                msg.id > newMessagesSeparatorId &&
                (!prevMessage || prevMessage.id <= newMessagesSeparatorId);
              return (
                <div key={msg.id}>
                  {showNewSeparator && <NewMessagesSeparator />}
                  <DiscordMessage
                    message={msg}
                    prevMessage={prevMessage}
                    currentUserId={currentUser?.id}
                    guildId={guildId}
                    hasManageMessages={hasManageMessages}
                    hasKickMembers={hasKickMembers}
                    hasBanMembers={hasBanMembers}
                  />
                </div>
              );
            })}
            {pendingMessages.map((msg, i) => {
              const prevMessage = i === 0
                ? messages[messages.length - 1] || null
                : pendingMessages[i - 1];
              return (
                <DiscordMessage
                  key={msg.nonce}
                  message={msg}
                  prevMessage={prevMessage}
                  currentUserId={currentUser?.id}
                  guildId={guildId}
                  pending
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscordChannelMessages;
