import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordProfilesStore } from '../store/discord-profiles.store';
import { useDiscordRelationshipsStore, RelationshipType } from '../store/discord-relationships.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordHasPermission } from '../hooks/useDiscordPermission';
import { MANAGE_MESSAGES, KICK_MEMBERS, BAN_MEMBERS, READ_MESSAGE_HISTORY, MANAGE_NICKNAMES, MODERATE_MEMBERS, ADD_REACTIONS, SEND_MESSAGES } from '../constants/permissions';
import { scrollPositions } from '@/store/last-channel.store';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import { Check, Hash, Megaphone, SpeakerHigh, MicrophoneStage, ChatsTeardrop, At } from '@phosphor-icons/react';
import * as DiscordChannelType from '../constants/channel-types';
import DiscordMessage from './DiscordMessage';
import MessageSkeletonList from '@/components/message/MessageSkeleton';
import { useDiscordInteractionsStore } from '../store/discord-interactions.store';
import TypingDots from '@/components/ui/typing-dots';

const WelcomeIcon = ({ type }) => {
  const cls = 'size-10 text-white';
  switch (type) {
    case DiscordChannelType.GUILD_VOICE:
      return <SpeakerHigh className={cls} weight="fill" />;
    case DiscordChannelType.GUILD_STAGE_VOICE:
      return <MicrophoneStage className={cls} weight="fill" />;
    case DiscordChannelType.GUILD_ANNOUNCEMENT:
      return <Megaphone className={`${cls} -scale-x-100`} weight="fill" />;
    case DiscordChannelType.GUILD_FORUM:
      return <ChatsTeardrop className={cls} weight="fill" />;
    case DiscordChannelType.DM:
    case DiscordChannelType.GROUP_DM:
      return <At className={cls} weight="bold" />;
    default:
      return <Hash className={cls} weight="bold" />;
  }
};

const ChannelWelcome = ({ channel }) => {
  const isDM = channel.type === DiscordChannelType.DM || channel.type === DiscordChannelType.GROUP_DM;
  const currentUser = useDiscordStore((s) => s.user);
  const usersMap = useDiscordUsersStore((s) => s.users);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const [mutualGuilds, setMutualGuilds] = useState([]);

  const dmUser = useMemo(() => {
    if (!isDM) return null;
    const recipientIds = channel.recipient_ids || [];
    if (channel.type === DiscordChannelType.GROUP_DM) return null;
    const otherId = recipientIds.find((id) => id !== currentUser?.id) || recipientIds[0];
    return otherId ? usersMap[otherId] : null;
  }, [isDM, channel, currentUser?.id, usersMap]);

  const relationships = useDiscordRelationshipsStore((s) => s.relationships);
  const relationship = useMemo(
    () => dmUser ? relationships.find((r) => r.id === dmUser.id) : null,
    [dmUser, relationships]
  );
  const isFriend = relationship?.type === RelationshipType.FRIEND;
  const isBlocked = relationship?.type === RelationshipType.BLOCKED;

  const handleAddFriend = async () => {
    if (!dmUser) return;
    try {
      await DiscordApiService.sendFriendRequest(dmUser.id);
    } catch {}
  };

  const handleBlock = async () => {
    if (!dmUser) return;
    try {
      await DiscordApiService.blockUser(dmUser.id);
    } catch {}
  };

  // Fetch profile for mutual guilds
  useEffect(() => {
    if (!dmUser?.id) return;
    const { fetchProfile } = useDiscordProfilesStore.getState();
    fetchProfile(dmUser.id).then((profile) => {
      if (profile?.mutual_guilds) setMutualGuilds(profile.mutual_guilds);
    });
  }, [dmUser?.id]);

  const name = isDM
    ? channel.type === DiscordChannelType.GROUP_DM
      ? channel.name || (channel.recipient_ids || []).map((id) => usersMap[id]?.global_name || usersMap[id]?.username).filter(Boolean).join(', ')
      : dmUser?.global_name || dmUser?.username || 'Unknown User'
    : channel.name;

  const avatarUrl = dmUser ? DiscordService.getUserAvatarUrl(dmUser.id, dmUser.avatar, 128) : null;

  const mutualGuildDetails = useMemo(
    () =>
      mutualGuilds
        .map((mg) => {
          const guild = guilds.find((g) => g.id === mg.id);
          return guild
            ? {
                id: guild.id,
                name: guild.properties?.name || guild.name,
                icon: DiscordService.getGuildIconUrl(guild.id, guild.properties?.icon || guild.icon, 32),
              }
            : null;
        })
        .filter(Boolean),
    [mutualGuilds, guilds]
  );

  return (
    <div className="px-4 pb-2 pt-16">
      {isDM && avatarUrl ? (
        <img src={avatarUrl} alt={name} className="mb-2 size-20 rounded-full object-cover" />
      ) : (
        <div className="mb-2 flex size-20 items-center justify-center rounded-full bg-white/10">
          <WelcomeIcon type={channel.type} />
        </div>
      )}
      <h1 className="text-[32px] font-bold leading-tight text-white">
        {isDM ? name : `Welcome to #${name}!`}
      </h1>
      {isDM && dmUser && (
        <p className="mt-0.5 text-[15px] text-gray-400">
          {dmUser.username}{dmUser.bot && dmUser.discriminator ? `#${dmUser.discriminator}` : ''}
        </p>
      )}
      <p className="mt-1.5 text-[15px] text-gray-400">
        {isDM
          ? `This is the beginning of your direct message history with ${name}.`
          : `This is the start of the #${name} channel. ${channel.topic ? channel.topic : ''}`}
      </p>
      {isDM && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {mutualGuildDetails.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {mutualGuildDetails.slice(0, 3).map((g) =>
                  g.icon ? (
                    <img
                      key={g.id}
                      src={g.icon}
                      alt={g.name}
                      title={g.name}
                      className="size-6 rounded-full border-2 border-[#1a1a1e] object-cover"
                    />
                  ) : (
                    <div
                      key={g.id}
                      title={g.name}
                      className="flex size-6 items-center justify-center rounded-full border-2 border-[#1a1a1e] bg-[#5865f2] text-[9px] font-medium text-white"
                    >
                      {g.name.charAt(0)}
                    </div>
                  )
                )}
              </div>
              <span className="text-sm text-gray-400">
                {mutualGuildDetails.length} Mutual Server{mutualGuildDetails.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {dmUser && !dmUser.bot && (
            <div className="flex items-center gap-2">
              {!isFriend && !isBlocked && (
                <button
                  onClick={handleAddFriend}
                  className="rounded bg-[#5865f2] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]"
                >
                  Add Friend
                </button>
              )}
              {!isBlocked && (
                <button
                  onClick={handleBlock}
                  className="rounded bg-discord-secondary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#6d6f78]"
                >
                  Block
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PendingInteractionIndicator = ({ interaction }) => {
  const botUser = useDiscordUsersStore((s) => interaction.botId ? s.users[interaction.botId] : null);
  const avatarUrl = botUser?.avatar
    ? DiscordService.getUserAvatarUrl(botUser.id, botUser.avatar, 40)
    : interaction.botAvatar
      ? DiscordService.getUserAvatarUrl(interaction.botId, interaction.botAvatar, 40)
      : interaction.appIcon
        ? `https://cdn.discordapp.com/app-icons/${interaction.appId}/${interaction.appIcon}.png?size=40`
        : interaction.botId
          ? `https://cdn.discordapp.com/embed/avatars/${(BigInt(interaction.botId) >> 22n) % 6n}.png`
          : null;

  const isSending = interaction.status === 'sending';
  const label = isSending
    ? 'Sending command...'
    : `${interaction.botName} is thinking...`;

  return (
    <div className={`mt-3.5 flex items-start gap-4 px-4 py-1 ${isSending ? 'opacity-50' : ''}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={interaction.botName} className="size-10 rounded-full object-cover" />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-full bg-[#5865f2] text-sm font-bold text-white">
          /
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-white">{interaction.botName}</span>
          <span className="rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium text-white">APP</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-400">
          <TypingDots />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
};

const DISCORD_EPOCH = 1420070400000;
const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

function formatSinceTime(date) {
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

const NewMessagesSeparator = () => (
  <div className="flex items-center gap-1 pl-4 pr-3.5 mt-1.5 mb-0.5">
    <div className="flex-1 h-px bg-destructive" />
    <span className="text-[11px] font-bold text-destructive leading-none">NEW</span>
  </div>
);

const DateSeparator = ({ timestamp }) => {
  const label = new Date(timestamp).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="my-2 flex items-center gap-2 px-4">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] font-semibold text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
};

const DiscordChannelMessages = ({ channel, messageSentCount }) => {
  const channelId = channel.id;
  const guildId = channel.guild_id || null;
  const currentUser = useDiscordStore((s) => s.user);

  const hasManageMessages = useDiscordHasPermission(guildId, channel, MANAGE_MESSAGES);
  const hasKickMembers = useDiscordHasPermission(guildId, channel, KICK_MEMBERS);
  const hasBanMembers = useDiscordHasPermission(guildId, channel, BAN_MEMBERS);
  const hasManageNicknames = useDiscordHasPermission(guildId, channel, BAN_MEMBERS);
  const hasModerateMembers = useDiscordHasPermission(guildId, channel, BAN_MEMBERS);
  const hasAddReactions = useDiscordHasPermission(guildId, channel, ADD_REACTIONS);
  const hasSendMessages = useDiscordHasPermission(guildId, channel, SEND_MESSAGES);
  const _hasReadMessageHistory = useDiscordHasPermission(guildId, channel, READ_MESSAGE_HISTORY);
  const hasReadMessageHistory = !guildId || _hasReadMessageHistory;

  const messages = useDiscordChannelsStore(
    useCallback((s) => s.channelMessages[channelId] || [], [channelId])
  );
  const pendingMessages = useDiscordChannelsStore(
    useCallback((s) => s.channelPendingMessages[channelId] || [], [channelId])
  );
  const pendingInteractions = useDiscordInteractionsStore(
    useCallback((s) => s.getForChannel(channelId), [channelId])
  );
  const channels = useDiscordChannelsStore((s) => s.channels);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const scrollTopOnRenderRef = useRef(false);
  const scrollToUnreadRef = useRef(false);
  const [newMessagesSeparatorId, setNewMessagesSeparatorId] = useState(null);

  const messagesRef = useRef();
  const contentRef = useRef();
  const ackTimerRef = useRef(null);
  const lastAckedRef = useRef(null);
  const wasNearBottomRef = useRef(true);
  const unreadCountRef = useRef(0);

  const lastMessageId = useMemo(
    () => channels.find((c) => c.id === channelId)?.last_message_id,
    [channels, channelId]
  );

  const readStateLastMessageId = useDiscordReadStatesStore(
    (s) => s.readStates[channelId]?.last_message_id
  );

  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const guildMembers = useDiscordGuildsStore((s) => s.guildMembers);
  const joinedAtMs = useMemo(() => {
    if (!guildId) return null;
    const guild = guilds.find((g) => g.id === guildId);
    const members = guildMembers[guildId] || [];
    const myMember = members.find((m) => m.user?.id === currentUser?.id || m.user_id === currentUser?.id);
    const raw = guild?.joined_at || myMember?.joined_at;
    return raw ? new Date(raw).getTime() : null;
  }, [guildId, guilds, guildMembers, currentUser?.id]);

  const unreadBarData = useMemo(() => {
    if (messages.length === 0) return null;

    const oldestLoadedId = messages[0].id;
    if (!readStateLastMessageId) {
      // No read state — use join date as the "last read" point
      if (!joinedAtMs) return null;

      const unreadCount = messages.filter(
        (m) => snowflakeToTimestamp(m.id) > joinedAtMs
      ).length;
      if (unreadCount === 0) return null;

      return {
        count: unreadCount,
        isExact: !hasMore || snowflakeToTimestamp(oldestLoadedId) <= joinedAtMs,
        sinceText: formatSinceTime(new Date(joinedAtMs)),
      };
    }

    const unreadCount = messages.filter((m) => m.id > readStateLastMessageId).length;
    if (unreadCount === 0) return null;

    const isExact = !hasMore || oldestLoadedId <= readStateLastMessageId;

    const sinceText = formatSinceTime(new Date(snowflakeToTimestamp(readStateLastMessageId)));

    return { count: unreadCount, isExact, sinceText };
  }, [messages, readStateLastMessageId, hasMore, joinedAtMs]);

  // Separator check: use read state ID when available, fall back to join date
  const isAfterSeparator = useCallback(
    (msgId) => {
      if (newMessagesSeparatorId) return msgId > newMessagesSeparatorId;
      if (!readStateLastMessageId && joinedAtMs) {
        return snowflakeToTimestamp(msgId) > joinedAtMs;
      }
      return false;
    },
    [newMessagesSeparatorId, readStateLastMessageId, joinedAtMs]
  );

  unreadCountRef.current = unreadBarData?.count ?? 0;

  const handleMarkAsRead = useCallback(() => {
    if (!lastMessageId) return;
    useDiscordReadStatesStore.getState().ackChannel(channelId, lastMessageId);
    DiscordApiService.ackMessage(channelId, lastMessageId).catch(() => {});
    setNewMessagesSeparatorId(null);
  }, [channelId, lastMessageId]);

  // Ack the channel's last_message_id if scrolled to the bottom
  const ackIfAtBottom = useCallback(() => {
    if (!lastMessageId || lastAckedRef.current === lastMessageId) return;
    return;

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

  // Clear cached messages for other channels when switching to save memory
  useEffect(() => {
    if (channelId) {
      useDiscordChannelsStore.getState().clearInactiveMessages(channelId);
    }
  }, [channelId]);

  // Load initial messages or restore scroll position (only on channel switch)
  useEffect(() => {
    if (!channelId || !hasReadMessageHistory) return;

    // Read imperatively — avoids re-running this effect when messages populate mid-load
    const cached = useDiscordChannelsStore.getState().channelMessages[channelId];
    if (cached != null) {
      // Already loaded — restore saved scroll position or scroll to unread
      if (messagesRef.current) {
        const saved = scrollPositions.getMessage(channelId);
        if (saved != null) {
          messagesRef.current.scrollTop = saved;
        } else {
          scrollToUnreadRef.current = true;
          scrollTopOnRenderRef.current = true;
        }
      }
      return;
    }

    setIsLoading(true);
    setHasMore(true);
    scrollToUnreadRef.current = true;
    scrollTopOnRenderRef.current = true;
    DiscordService.loadChannelMessages(channelId)
      .then((data) => {
        setHasMore(data.length >= 50);
      })
      .finally(() => setIsLoading(false));
  }, [channelId, hasReadMessageHistory]);

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

  // Scroll to first unread message after initial load, or bottom if all read.
  // Also auto-scroll on new messages when user is near the bottom.
  useEffect(() => {
    if (!messagesRef.current || isLoading) return;
    if (scrollTopOnRenderRef.current && messages.length > 0) {
      scrollTopOnRenderRef.current = false;

      if (scrollToUnreadRef.current) {
        scrollToUnreadRef.current = false;

        // Find the first unread message element using the separator ID
        const separatorId = newMessagesSeparatorId;
        if (separatorId) {
          // Find the first message after the read state
          const firstUnreadMsg = messages.find((m) => m.id > separatorId);
          if (firstUnreadMsg) {
            const el = messagesRef.current.querySelector(
              `[data-message-id="${firstUnreadMsg.id}"]`,
            );
            if (el) {
              // Scroll so the unread message is near the top of the viewport
              el.scrollIntoView({ block: 'start' });
              // Offset slightly so the "NEW" separator is visible above
              messagesRef.current.scrollTop = Math.max(
                0,
                messagesRef.current.scrollTop - 200,
              );
              wasNearBottomRef.current = false;
              return;
            }
          }
        }

        // No unread messages — scroll to bottom
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        wasNearBottomRef.current = true;
        ackIfAtBottom();
        return;
      }

      // Fallback: scroll to bottom
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      wasNearBottomRef.current = true;
      return;
    }
    const el = messagesRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (forceScrollDown || nearBottom) {
      el.scrollTop = el.scrollHeight;
      if (forceScrollDown) setForceScrollDown(false);
      ackIfAtBottom();
    }
  }, [messages, forceScrollDown, ackIfAtBottom, isLoading, newMessagesSeparatorId]);

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
      if (scrollTopOnRenderRef.current) return;
      // Don't adjust scroll while user is selecting text — it breaks the selection
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

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
    <div className="relative min-h-0 flex-1 overflow-y-auto" ref={messagesRef} onScroll={onScroll}>
      {hasReadMessageHistory && unreadBarData && (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#5865f2] px-4 py-0.5 text-sm">
          <span className="font-medium text-white">
            {unreadBarData.count}{!unreadBarData.isExact && '+'} new message{unreadBarData.count !== 1 ? 's' : ''} since {unreadBarData.sinceText}
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
      <div ref={contentRef} className="flex min-h-full flex-col justify-end">
        {!hasReadMessageHistory && (
          <div className="px-4 pb-4 pt-8">
            <p className="text-sm text-gray-400">
              You do not have permission to view the message history of #{channel.name}
            </p>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="size-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
          </div>
        )}

        {isLoading ? (
          <MessageSkeletonList />
        ) : (
          <ol className="list-none pb-4">
            {!hasMore && (
              <li>
                <ChannelWelcome channel={channel} />
              </li>
            )}
            {messages.map((msg, i) => {
              const prevMessage = i > 0 ? messages[i - 1] : null;
              const showNewSeparator = unreadBarData &&
                isAfterSeparator(msg.id) &&
                (!prevMessage || !isAfterSeparator(prevMessage.id));

              const msgTs = snowflakeToTimestamp(msg.id);
              const prevTs = prevMessage ? snowflakeToTimestamp(prevMessage.id) : null;
              const showDateSeparator = prevTs == null ||
                new Date(msgTs).toDateString() !== new Date(prevTs).toDateString();

              return (
                <li key={msg.id} data-message-id={msg.id}>
                  {showDateSeparator && <DateSeparator timestamp={msgTs} />}
                  {showNewSeparator && <NewMessagesSeparator />}
                  <DiscordMessage
                    message={msg}
                    prevMessage={prevMessage}
                    currentUserId={currentUser?.id}
                    channelId={channelId}
                    guildId={guildId}
                    hasManageMessages={hasManageMessages}
                    hasKickMembers={hasKickMembers}
                    hasBanMembers={hasBanMembers}
                    hasManageNicknames={true}
                    hasModerateMembers={true}
                    hasAddReactions={hasAddReactions}
                    hasSendMessages={hasSendMessages}
                  />
                </li>
              );
            })}
            {pendingMessages.map((msg, i) => {
              const prevMessage = i === 0
                ? messages[messages.length - 1] || null
                : pendingMessages[i - 1];
              return (
                <li key={msg.nonce}>
                  <DiscordMessage
                    message={msg}
                    prevMessage={prevMessage}
                    currentUserId={currentUser?.id}
                    channelId={channelId}
                    guildId={guildId}
                    pending
                  />
                </li>
              );
            })}
            {pendingInteractions.map((pi) => (
              <li key={pi.nonce}>
                <PendingInteractionIndicator interaction={pi} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default DiscordChannelMessages;
