import { useMemo, useCallback, useState } from 'react';
import { UserStarIcon, MailIcon } from 'lucide-react';
import { DiscordLogo, TelegramLogo, GameController, MusicNote, Broadcast, Eye, Trophy, Check } from '@phosphor-icons/react';
import { useDiscordActivitiesStore, ActivityType } from '@/discord/store/discord-activities.store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useChannelsStore } from '@/ignite/store/channels.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { useUnreadsStore } from '@/ignite/store/unreads.store';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useDiscordReadStatesStore } from '@/discord/store/discord-readstates.store';
import { useDiscordRelationshipsStore, RelationshipType } from '@/discord/store/discord-relationships.store';
import { DiscordService } from '@/discord/services/discord.service';
import { DiscordApiService } from '@/discord/services/discord-api.service';
import DiscordStatusIndicator from '@/discord/components/DiscordStatusIndicator';
import DiscordClanTag from '@/discord/components/DiscordClanTag';
import DiscordUserContextMenu from '@/discord/components/context-menus/DiscordUserContextMenu';
import { useContextMenuStore } from '@/store/context-menu.store';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscordPreferencesStore } from '@/discord/store/discord-preferences.store';
import DMChannelItem from './DMChannelItem';
import DMRowBase from './DMRowBase';
import NewDMModal from '@/ignite/components/modals/NewDMModal';
import { useModalStore } from '@/ignite/store/modal.store';
import { DISCORD_EPOCH } from '@/discord/utils/snowflake';
import { PushPin } from '@phosphor-icons/react';
import { useAuthStore } from '@/ignite/store/auth.store';
import { useTelegramStore } from '@/telegram/store/telegram.store';
import { useTelegramChatsStore } from '@/telegram/store/telegram-chats.store';
import Avatar from '@/ignite/components/Avatar';

const AccountBadge = ({ source }) => {
  const discordUser = useDiscordStore((s) => s.user);
  const igniteUser = useUsersStore((s) => s.getCurrentUser());

  if (source === 'discord') {
    const avatarUrl = discordUser
      ? DiscordService.getUserAvatarUrl(discordUser.id, discordUser.avatar, 32)
      : null;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="ml-auto flex shrink-0 items-center self-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <DiscordLogo size={18} weight="fill" className="text-[#5865f2]" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{discordUser?.global_name || discordUser?.username || 'Discord'}</TooltipContent>
      </Tooltip>
    );
  }

  if (source === 'ignite') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="ml-auto flex shrink-0 items-center self-center">
            {igniteUser?.avatar_url ? (
              <img src={igniteUser.avatar_url} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full bg-orange-500/20 text-[9px] font-bold text-orange-400">
                {igniteUser?.username?.slice(0, 1).toUpperCase() || 'I'}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{igniteUser?.username || 'Ignite'}</TooltipContent>
      </Tooltip>
    );
  }

  return null;
};

const IGNITE_EPOCH = 1444521600000; // Oct 10, 2015

const snowflakeToTimestamp = (id, epoch) =>
  Number(BigInt(id) >> 22n) + epoch;

const sortByLastMessage = (a, b) => {
  if (!a.last_message_id) return 1;
  if (!b.last_message_id) return -1;
  return BigInt(a.last_message_id) < BigInt(b.last_message_id) ? 1 : -1;
};

const getDMDisplayInfo = (channel, currentUserId, usersMap) => {
  const recipientIds = channel.recipient_ids || [];
  const recipients = recipientIds.map((id) => usersMap[id]).filter(Boolean);

  if (channel.type === 3) {
    const name = channel.name || recipients.map((r) => r.global_name || r.username).join(', ');
    const icon = channel.icon
      ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64`
      : null;
    return { name, icon, isGroup: true, recipientCount: recipientIds.length };
  }

  const other = recipients.find((r) => r.id !== currentUserId) || recipients[0];
  if (!other) return { name: 'Unknown User', icon: null, isGroup: false };

  return {
    name: other.global_name || other.username,
    icon: DiscordService.getUserAvatarUrl(other.id, other.avatar, 64),
    isGroup: false,
    user: other,
  };
};

const DMActivityIcon = ({ type, size = 12 }) => {
  const style = { color: '#22c55e' }; // green-500, overrides DMRowBase SVG color
  switch (type) {
    case ActivityType.PLAYING: return <GameController size={size} weight="fill" style={style} />;
    case ActivityType.STREAMING: return <Broadcast size={size} weight="fill" style={style} />;
    case ActivityType.LISTENING: return <MusicNote size={size} weight="fill" style={style} />;
    case ActivityType.WATCHING: return <Eye size={size} weight="fill" style={style} />;
    case ActivityType.COMPETING: return <Trophy size={size} weight="fill" style={style} />;
    default: return null;
  }
};

const DiscordDMChannelRow = ({ channel, isActive, currentUserId, usersMap, onClick, onClose, isPinned, onTogglePin }) => {
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const entry = readStates[channel.id];

  const isUnread =
    !isActive &&
    !!channel.last_message_id &&
    (!entry?.last_message_id || channel.last_message_id > entry.last_message_id);
  const mentionCount = entry?.mention_count ?? 0;

  const info = useMemo(
    () => getDMDisplayInfo(channel, currentUserId, usersMap),
    [channel, currentUserId, usersMap]
  );

  const activities = useDiscordActivitiesStore((s) => info.user ? s.activities[info.user.id] : undefined);

  const nonCustomActivities = useMemo(
    () => {
      const activityPriority = { [ActivityType.PLAYING]: 0, [ActivityType.STREAMING]: 1, [ActivityType.COMPETING]: 2, [ActivityType.LISTENING]: 3, [ActivityType.WATCHING]: 4 };
      return (activities || [])
        .filter((a) => a.type !== ActivityType.CUSTOM && a.type !== 6)
        .sort((a, b) => (activityPriority[a.type] ?? 99) - (activityPriority[b.type] ?? 99));
    },
    [activities]
  );
  const customStatus = useMemo(
    () => (activities || []).find((a) => a.type === ActivityType.CUSTOM),
    [activities]
  );

  const primaryActivity = nonCustomActivities[0];
  const extraCount = nonCustomActivities.length - 1;

  const handleContextMenu = (e) => {
    if (!info.user || info.isGroup) return;
    useContextMenuStore.getState().open(DiscordUserContextMenu, {
      author: info.user,
      channelId: channel.id,
      isPinned,
      onTogglePin,
    }, e);
  };

  return (
    <DMRowBase
      isActive={isActive}
      isUnread={isUnread}
      onClick={onClick}
      onClose={onClose}
      onContextMenu={handleContextMenu}
    >
      <div className="relative shrink-0">
        {info.icon ? (
          <img src={info.icon} alt={info.name} className="size-8 rounded-full object-cover" />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-sm font-medium text-white">
            {info.isGroup ? info.recipientCount : info.name.charAt(0).toUpperCase()}
          </div>
        )}
        {!info.isGroup && info.user && !info.user.bot && info.user.id !== '643945264868098049' && (
          <DiscordStatusIndicator
            status={info.user.status}
            clientStatus={info.user.client_status}
            processedAt={info.user.processed_at_timestamp}
            invisible={info.user.invisible}
            size="xs"
            borderColor="#121214"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className={cn('truncate text-[16px]', isUnread ? 'font-semibold text-gray-100' : 'font-[450]')}>
            {info.name}
          </span>
          {info.user?.id === '643945264868098049' && (
            <span className="inline-flex h-3.5 shrink-0 items-center gap-0.5 rounded bg-[#5865f2] px-1 text-[12px] font-medium leading-none text-white">
              <Check size={13} weight="bold" color="white" />
              OFFICIAL
            </span>
          )}
          {!info.isGroup && info.user && <DiscordClanTag userId={info.user.id} size="sm" />}
          {info.isGroup && (
            <span className="shrink-0 text-xs text-gray-500">({info.recipientCount})</span>
          )}
          {isPinned && (
            <PushPin size={12} weight="fill" className="shrink-0 rotate-45 text-gray-500" />
          )}
        </div>
        {info.user?.id === '643945264868098049' && (
          <div className="truncate text-left text-[12px] text-gray-400/60">Official Discord Message</div>
        )}
        {info.user?.id !== '643945264868098049' && (primaryActivity || customStatus?.state) && (
          <div className="flex items-center gap-1 truncate text-[11px] text-gray-400">
            {primaryActivity && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-green-500">
                    <DMActivityIcon type={primaryActivity.type} size={12} />
                    {extraCount > 0 && (
                      <span className="text-[10px] font-medium text-green-500">+{extraCount}</span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-2">
                  <div className="flex flex-col gap-1.5">
                    {nonCustomActivities.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="shrink-0 text-green-500">
                          <DMActivityIcon type={a.type} size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-gray-200">{a.name}</div>
                          {a.details && (
                            <div className="text-[11px] text-gray-400">{a.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {primaryActivity && (customStatus?.state || primaryActivity.details) && (
              <span className="text-gray-600">·</span>
            )}
            {primaryActivity?.type === ActivityType.LISTENING && primaryActivity.details ? (
              <span className="truncate">{primaryActivity.details}</span>
            ) : customStatus?.state ? (
              <span className="truncate">{customStatus.state}</span>
            ) : null}
          </div>
        )}
      </div>

      <AccountBadge source="discord" />
    </DMRowBase>
  );
};

const DMChannelSkeleton = () => (
  <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
    <Skeleton className="size-8 shrink-0 rounded-full" />
    <Skeleton className="h-3.5 w-24 rounded" />
  </div>
);

const DMChannelsSidebar = ({ activeChannelId, onNavigate }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser()) || { id: 'me' };
  const { channels, pinnedChannelIds, togglePin } = useChannelsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { requests } = useFriendsStore();

  // Discord state
  const { isConnected: discordConnected, user: discordUser } = useDiscordStore();
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);
  const disableMessageRequests = useDiscordPreferencesStore((s) => s.disableMessageRequests);

  // Account filter state
  const { userId: igniteUserId } = useAuthStore();
  const igniteUser = useUsersStore((s) => s.getCurrentUser());
  const telegramSession = useTelegramStore((s) => s.session);
  const telegramUser = useTelegramStore((s) => s.user);
  const telegramChats = useTelegramChatsStore((s) => s.chats);
  const [hiddenSources, setHiddenSources] = useState({});
  const toggleSource = useCallback((source) => {
    setHiddenSources((prev) => ({ ...prev, [source]: !prev[source] }));
  }, []);

  const normalizeThread = useCallback(
    (thread) => {
      if (!thread) return null;
      const otherUser =
        (thread.recipients || []).find((r) => r.id !== currentUser.id) || thread.user || {};
      const isPinned = pinnedChannelIds.includes(thread.channel_id);
      return { ...thread, user: otherUser, isPinned };
    },
    [currentUser.id, pinnedChannelIds]
  );

  // Build a single merged + sorted list of pinned DMs (Ignite + Discord) and all unpinned DMs
  const { pinnedDms, pinnedDiscordDms, mergedDms } = useMemo(() => {
    const igniteDms = channels.filter((c) => c.type === 1).map(normalizeThread);
    const pinned = igniteDms.filter((c) => c.isPinned).sort(sortByLastMessage);
    const unpinned = igniteDms.filter((c) => !c.isPinned);

    // Tag Ignite channels with real timestamps
    const igniteItems = unpinned.map((c) => ({
      _source: 'ignite',
      _id: c.channel_id,
      _timestamp: c.last_message_id ? snowflakeToTimestamp(c.last_message_id, IGNITE_EPOCH) : 0,
      data: c,
    }));

    // Tag Discord channels with real timestamps (exclude message requests unless disabled)
    const allDiscordDms = discordConnected
      ? discordChannels.filter((c) => (c.type === 1 || c.type === 3) && (disableMessageRequests || !c.is_message_request))
      : [];

    const pinnedDiscord = allDiscordDms
      .filter((c) => pinnedChannelIds.includes(c.id))
      .sort(sortByLastMessage);

    const unpinnedDiscord = allDiscordDms
      .filter((c) => !pinnedChannelIds.includes(c.id))
      .map((c) => ({
        _source: 'discord',
        _id: c.id,
        _timestamp: c.last_message_id ? snowflakeToTimestamp(c.last_message_id, DISCORD_EPOCH) : 0,
        data: c,
      }));

    // Merge and sort by timestamp descending (most recent first)
    const merged = [...igniteItems, ...unpinnedDiscord].sort((a, b) => b._timestamp - a._timestamp);

    return { pinnedDms: pinned, pinnedDiscordDms: pinnedDiscord, mergedDms: merged };
  }, [channels, normalizeThread, discordConnected, discordChannels, pinnedChannelIds]);

  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);

  const pendingCount = useMemo(() => {
    const igniteCount = requests.filter((req) => req.sender_id !== currentUser.id).length;
    const discordCount = discordConnected
      ? discordRelationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length
      : 0;
    return igniteCount + discordCount;
  }, [requests, currentUser.id, discordConnected, discordRelationships]);

  const handleCloseDiscordDM = useCallback((channelId) => {
    DiscordApiService.closeDMChannel(channelId);
    useDiscordChannelsStore.getState().removeChannel(channelId);
    if (activeChannelId === channelId) onNavigate('friends');
  }, [activeChannelId, onNavigate]);

  const handleCloseIgniteDM = useCallback((channelId) => {
    useChannelsStore.getState().removeChannel(channelId);
    if (activeChannelId === channelId) onNavigate('friends');
  }, [activeChannelId, onNavigate]);

  const messageRequestCount = useMemo(() => {
    if (!discordConnected || disableMessageRequests) return 0;
    return discordChannels.filter(
      (c) => (c.type === 1 || c.type === 3) && (c.is_message_request)
    ).length;
  }, [discordConnected, discordChannels, disableMessageRequests]);

  return (
    <>
    <aside className="flex min-h-0 w-full cursor-default select-none flex-col overflow-hidden">
      <div className="flex h-12 items-center border-b border-white/5 px-2">
        <button
          className="flex w-full items-center justify-center rounded-sm bg-[#1e1f22] px-3 py-1.5 text-[13px] text-[#fafafa] hover:bg-[#2b2d31]"
          onClick={() => useModalStore.getState().push(NewDMModal)}
        >
          <span className="truncate">Find or start a conversation</span>
        </button>
      </div>
      <div className="scrollbar-hover flex-1 overflow-y-auto p-2 pb-36">

        <DMRowBase
          isActive={activeChannelId === 'friends'}
          onClick={() => onNavigate('friends')}
          className="mb-0.5"
        >
          <UserStarIcon className="h-5 w-5 shrink-0" />
          <span className="font-medium">Friends</span>
          {pendingCount > 0 && (
            <Badge className="ml-auto h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
              {pendingCount}
            </Badge>
          )}
        </DMRowBase>

        {discordConnected && !disableMessageRequests && (
          <DMRowBase
            isActive={activeChannelId === 'message-requests'}
            onClick={() => onNavigate('message-requests')}
            className="mb-1"
          >
            <MailIcon className="h-5 w-5 shrink-0" />
            <span className="font-medium truncate">Message Requests</span>
            {messageRequestCount > 0 && (
              <Badge className="ml-auto h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
                {messageRequestCount}
              </Badge>
            )}
          </DMRowBase>
        )}

        <div className="mx-2 my-2 border-b border-white/5" />

        {/* Account filters */}
        <div className="flex items-center justify-center gap-1.5 py-1.5">
          {!!igniteUserId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleSource('ignite')}
                  className={`flex size-8 items-center justify-center rounded-full transition-all ${
                    hiddenSources.ignite
                      ? 'opacity-30 grayscale hover:opacity-50'
                      : 'ring-2 ring-transparent hover:ring-white/20'
                  }`}
                >
                  {igniteUser?.avatar_url ? (
                    <img src={igniteUser.avatar_url} alt="Ignite" className="size-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-orange-500/20 text-xs font-semibold text-orange-400">
                      {igniteUser?.username?.slice(0, 1).toUpperCase() || 'I'}
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {hiddenSources.ignite ? 'Show' : 'Hide'} {igniteUser?.username || 'Ignite'} (Ignite)
              </TooltipContent>
            </Tooltip>
          )}
          {discordConnected && discordUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleSource('discord')}
                  className={`flex size-8 items-center justify-center rounded-full transition-all ${
                    hiddenSources.discord
                      ? 'opacity-30 grayscale hover:opacity-50'
                      : 'ring-2 ring-transparent hover:ring-white/20'
                  }`}
                >
                  {discordUser.avatar ? (
                    <img
                      src={DiscordService.getUserAvatarUrl(discordUser.id, discordUser.avatar, 64)}
                      alt="Discord"
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-white">
                      <DiscordLogo size={16} weight="fill" />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {hiddenSources.discord ? 'Show' : 'Hide'} {discordUser.global_name || discordUser.username} (Discord)
              </TooltipContent>
            </Tooltip>
          )}
          {!!telegramSession && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleSource('telegram')}
                  className={`flex size-8 items-center justify-center rounded-full transition-all ${
                    hiddenSources.telegram
                      ? 'opacity-30 grayscale hover:opacity-50'
                      : 'ring-2 ring-transparent hover:ring-white/20'
                  }`}
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#2AABEE] text-white">
                    <TelegramLogo size={16} weight="fill" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {hiddenSources.telegram ? 'Show' : 'Hide'} {telegramUser?.firstName || 'Telegram'} (Telegram)
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Pinned */}
        {((!hiddenSources.ignite && pinnedDms.length > 0) || (!hiddenSources.discord && pinnedDiscordDms.length > 0)) && (
          <>
            <div className="mt-4 flex cursor-default select-none items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Pinned
            </div>
            <div className="mt-2 space-y-0.5">
              {!hiddenSources.ignite && pinnedDms.map((channel) => (
                <DMChannelItem
                  key={channel.channel_id}
                  channel={channel}
                  isActive={activeChannelId === channel.channel_id}
                  onClick={() => onNavigate(channel.channel_id)}
                  onClose={() => handleCloseIgniteDM(channel.channel_id)}
                  channelUnreads={channelUnreads}
                  channelUnreadsLoaded={channelUnreadsLoaded}
                  badge={<AccountBadge source="ignite" />}
                />
              ))}
              {!hiddenSources.discord && pinnedDiscordDms.map((channel) => (
                <DiscordDMChannelRow
                  key={`discord-pinned-${channel.id}`}
                  channel={channel}
                  isActive={activeChannelId === channel.id}
                  currentUserId={discordUser?.id}
                  usersMap={discordUsersMap}
                  onClick={() => onNavigate(channel.id)}
                  onClose={() => handleCloseDiscordDM(channel.id)}
                  isPinned={true}
                  onTogglePin={() => togglePin(channel.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* All DMs — merged Ignite + Discord, sorted by last message */}
        <div className="mt-2.5 flex cursor-default select-none items-center px-2 text-[13px] font-medium text-gray-500">
          Direct Messages
        </div>
        {mergedDms.length > 0 ? (
          <div className="mt-2 space-y-0.5">
            {mergedDms
              .filter((item) => !hiddenSources[item._source])
              .map((item) =>
              item._source === 'discord' ? (
                <DiscordDMChannelRow
                  key={`discord-${item._id}`}
                  channel={item.data}
                  isActive={activeChannelId === item._id}
                  currentUserId={discordUser?.id}
                  usersMap={discordUsersMap}
                  onClick={() => onNavigate(item._id)}
                  onClose={() => handleCloseDiscordDM(item._id)}
                  isPinned={false}
                  onTogglePin={() => togglePin(item._id)}
                />
              ) : (
                <DMChannelItem
                  key={item._id}
                  channel={item.data}
                  isActive={activeChannelId === item._id}
                  onClick={() => onNavigate(item._id)}
                  onClose={() => handleCloseIgniteDM(item._id)}
                  channelUnreads={channelUnreads}
                  channelUnreadsLoaded={channelUnreadsLoaded}
                  badge={<AccountBadge source="ignite" />}
                />
              )
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <DMChannelSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </aside>
    </>
  );
};

export default DMChannelsSidebar;
