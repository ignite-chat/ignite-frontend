import { useMemo, useCallback } from 'react';
import { UserStarIcon } from 'lucide-react';
import { DiscordLogo } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { DiscordService } from '@/discord/services/discord.service';
import DMChannelItem from './DMChannelItem';
import NewDMModal from '@/ignite/components/modals/NewDMModal';
import { useModalStore } from '@/ignite/store/modal.store';

const IGNITE_EPOCH = 1444521600000; // Oct 10, 2015
const DISCORD_EPOCH = 1420070400000; // Jan 1, 2015

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

const DiscordDMChannelItem = ({ channel, isActive, currentUserId, usersMap, onClick }) => {
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm transition-all',
        isActive
          ? 'bg-gray-700 text-white'
          : isUnread
            ? 'text-gray-100 hover:bg-gray-700/50 hover:text-gray-200'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
      )}
    >
      {!isActive && isUnread && (
        <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all group-hover:h-4" />
      )}

      <div className="relative shrink-0">
        {info.icon ? (
          <img src={info.icon} alt={info.name} className="size-8 rounded-full object-cover" />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-sm font-medium text-white">
            {info.isGroup ? info.recipientCount : info.name.charAt(0).toUpperCase()}
          </div>
        )}
        {!info.isGroup && info.user && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#121214]',
              { online: 'bg-green-500', idle: 'bg-yellow-500', dnd: 'bg-red-500' }[info.user.status] || 'bg-gray-500'
            )}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className={cn('truncate', isUnread ? 'font-bold text-gray-100' : 'font-medium')}>
          {info.name}
        </span>
        {info.isGroup && (
          <span className="shrink-0 text-xs text-gray-500">({info.recipientCount})</span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <DiscordLogo size={14} weight="fill" className="ml-auto shrink-0 text-[#5865f2]" />
          </TooltipTrigger>
          <TooltipContent side="top">Discord</TooltipContent>
        </Tooltip>
      </div>

      {mentionCount > 0 && (
        <div className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
          {mentionCount > 99 ? '99+' : mentionCount}
        </div>
      )}
    </button>
  );
};

const DMChannelsSidebar = ({ activeChannelId, onNavigate }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser()) || { id: 'me' };
  const { channels, pinnedChannelIds } = useChannelsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { requests } = useFriendsStore();

  // Discord state
  const { isConnected: discordConnected, user: discordUser } = useDiscordStore();
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);

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

  // Build a single merged + sorted list of pinned Ignite DMs and all unpinned DMs (Ignite + Discord)
  const { pinnedDms, mergedDms } = useMemo(() => {
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

    // Tag Discord channels with real timestamps
    const discordItems = discordConnected
      ? discordChannels
          .filter((c) => c.type === 1 || c.type === 3)
          .map((c) => ({
            _source: 'discord',
            _id: c.id,
            _timestamp: c.last_message_id ? snowflakeToTimestamp(c.last_message_id, DISCORD_EPOCH) : 0,
            data: c,
          }))
      : [];

    // Merge and sort by timestamp descending (most recent first)
    const merged = [...igniteItems, ...discordItems].sort((a, b) => b._timestamp - a._timestamp);

    return { pinnedDms: pinned, mergedDms: merged };
  }, [channels, normalizeThread, discordConnected, discordChannels]);

  const pendingCount = useMemo(
    () => requests.filter((req) => req.sender_id !== currentUser.id).length,
    [requests, currentUser.id]
  );

  return (
    <>
    <aside className="flex min-h-0 w-80 cursor-default select-none flex-col overflow-hidden bg-[#121214]">
      <div className="flex-1 overflow-y-auto p-2 pb-36">
        <button
          className="mb-2 flex w-full items-center text-white justify-center rounded-md bg-[#1e1f22] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#2b2d31]"
          onClick={() => useModalStore.getState().push(NewDMModal)}
        >
          <span>Find or start a conversation</span>
        </button>

        <div className="mx-2 my-2 border-b border-white/5" />

        <Button
          variant={activeChannelId === 'friends' ? 'secondary' : 'ghost'}
          className="mb-1 w-full justify-start gap-3"
          onClick={() => onNavigate('friends')}
        >
          <UserStarIcon className="h-5 w-5" />
          <span className="font-medium">Friends</span>
          {pendingCount > 0 && (
            <Badge className="ml-auto h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
              {pendingCount}
            </Badge>
          )}
        </Button>

        <div className="mx-2 my-2 border-b border-white/5" />

        {/* Pinned (Ignite only) */}
        {pinnedDms.length > 0 && (
          <>
            <div className="mt-4 flex cursor-default select-none items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Pinned
            </div>
            <div className="mt-2 space-y-0.5">
              {pinnedDms.map((channel) => (
                <DMChannelItem
                  key={channel.channel_id}
                  channel={channel}
                  isActive={activeChannelId === channel.channel_id}
                  onClick={() => onNavigate(channel.channel_id)}
                  channelUnreads={channelUnreads}
                  channelUnreadsLoaded={channelUnreadsLoaded}
                />
              ))}
            </div>
          </>
        )}

        {/* All DMs — merged Ignite + Discord, sorted by last message */}
        {mergedDms.length > 0 && (
          <>
            <div className="mt-4 flex cursor-default select-none items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Direct Messages
            </div>
            <div className="mt-2 space-y-0.5">
              {mergedDms.map((item) =>
                item._source === 'discord' ? (
                  <DiscordDMChannelItem
                    key={`discord-${item._id}`}
                    channel={item.data}
                    isActive={activeChannelId === item._id}
                    currentUserId={discordUser?.id}
                    usersMap={discordUsersMap}
                    onClick={() => onNavigate(item._id)}
                  />
                ) : (
                  <DMChannelItem
                    key={item._id}
                    channel={item.data}
                    isActive={activeChannelId === item._id}
                    onClick={() => onNavigate(item._id)}
                    channelUnreads={channelUnreads}
                    channelUnreadsLoaded={channelUnreadsLoaded}
                  />
                )
              )}
            </div>
          </>
        )}
      </div>
    </aside>
    </>
  );
};

export default DMChannelsSidebar;
