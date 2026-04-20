import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMinus } from 'lucide-react';
import { ChatCircle } from '@phosphor-icons/react';
import AccountBadge from '@/components/AccountBadge';
import { toast } from 'sonner';
import Avatar from '@/ignite/components/Avatar';
import { ChannelsService } from '@/ignite/services/channels.service';
import RemoveFriendModal from '@/ignite/components/modals/RemoveFriendModal';
import { useChannelsStore } from '@/ignite/store/channels.store';
import { useContextMenuStore } from '@/store/context-menu.store';
import FriendContextMenu from '@/ignite/components/context-menus/FriendContextMenu';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { useModalStore } from '@/ignite/store/modal.store';
import { useUsersStore } from '@/ignite/store/users.store';
import type { Friend } from '@/ignite/store/friends.store';
import type { DiscordUser } from '@/discord/store/discord-users.store';
import { DiscordService } from '@/discord/services/discord.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordRelationshipsStore } from '@/discord/store/discord-relationships.store';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useDiscordActivitiesStore, ActivityType } from '@/discord/store/discord-activities.store';
import DiscordClanTag from '@/discord/components/DiscordClanTag';
import DiscordStatusIndicator from '@/discord/components/DiscordStatusIndicator';
import { timeAgo } from './timeAgo';

function formatExactDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function getDiscordStatusText(activities: any[] | undefined): string | null {
  if (!activities || activities.length === 0) return null;
  const custom = activities.find((a: any) => a.type === ActivityType.CUSTOM);
  if (custom?.state) return custom.state;
  const activity = activities.find((a: any) => a.type !== ActivityType.CUSTOM);
  if (activity) return activity.name;
  return null;
}

type FriendRowProps = {
  friend: Friend;
  showAccountBadge?: boolean;
};

const FriendRow = ({ friend, showAccountBadge }: FriendRowProps) => {
  const navigate = useNavigate();
  const { channels } = useChannelsStore();
  const getUser = useUsersStore((s) => s.getUser);
  const user = getUser(friend.id) ?? friend;

  const messageUser = () => {
    const existingChannel = channels.find(
      (c) => c.type === 1 && c.recipients?.some((r) => r.id === friend.id)
    );
    if (existingChannel) {
      navigate(`/channels/@me/${existingChannel.channel_id}`);
    } else {
      ChannelsService.createPrivateChannel([friend.id])
        .then((channel) => navigate(`/channels/@me/${channel.channel_id}`))
        .catch(() => toast.error('Failed to create DM channel'));
    }
  };

  const deleteFriend = () => {
    useModalStore.getState().push(RemoveFriendModal, { userId: friend.id, username: user.username });
  };

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(friend.id);
    toast.success('User ID copied to clipboard.');
  };

  return (
    <div
      onClick={messageUser}
      onContextMenu={(e) => {
        useContextMenuStore.getState().open(FriendContextMenu, {
          onViewProfile: () => useModalStore.getState().push(UserProfileModal, { userId: friend.id }),
          onMessage: messageUser,
          onCopyUserId: handleCopyUserId,
          onRemoveFriend: deleteFriend,
        }, e);
      }}
      className="group flex cursor-pointer items-center justify-between px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0">
          <Avatar user={user} size={32} showStatus showOffline />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="truncate">{user.name}</span>
            <span className="hidden shrink-0 text-xs text-gray-400 group-hover:inline">
              {user.username}
            </span>
          </div>
          <div className="truncate text-xs text-gray-400">{friend.status}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AccountBadge source="ignite" show={!!showAccountBadge} />
        <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); messageUser(); }}
            className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <ChatCircle size={18} weight="fill" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteFriend(); }}
            className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-red-400"
          >
            <UserMinus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

type DiscordFriendRowProps = {
  user: DiscordUser;
  accountId?: string;
  showAccountBadge?: boolean;
};

const DiscordFriendRow = ({ user, accountId, showAccountBadge }: DiscordFriendRowProps) => {
  const navigate = useNavigate();
  const channels = useDiscordChannelsStore((s) => s.channels);
  const storeActivities = useDiscordActivitiesStore((s) => s.activities[user.id]);
  const relationship = useDiscordRelationshipsStore((s) => s.relationships.find((r) => r.id === user.id));
  const status = user.status || 'offline';
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 64);
  const activities = storeActivities || user.activities;

  const friendsSinceAgo = relationship?.since ? timeAgo(relationship.since) : null;
  const friendsSinceExact = relationship?.since ? formatExactDate(relationship.since) : null;


  const messageUser = () => {
    const existingChannel = channels.find(
      (c) => c.type === 1 && c.recipient_ids?.includes(user.id)
    );
    if (existingChannel) {
      navigate(`/channels/@me/${existingChannel.id}`);
    }
  };

  return (
    <div
      onClick={messageUser}
      className="group flex cursor-pointer items-center justify-between px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={user.global_name || user.username}
            className="size-8 rounded-full object-cover"
          />
          <DiscordStatusIndicator
            status={status}
            clientStatus={user.client_status}
            processedAt={user.processed_at_timestamp}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="truncate">{user.global_name || user.username}</span>
            {user.bot && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium text-white">
                {user.verified_bot !== false && (
                  <svg width="10" height="10" viewBox="0 0 16 15.2" fill="currentColor">
                    <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" />
                  </svg>
                )}
                {user.id === '643945264868098049' ? 'OFFICIAL' : 'APP'}
              </span>
            )}
            {user.global_name && (
              <span className="hidden shrink-0 text-xs text-gray-400 group-hover:inline">
                {user.username}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-gray-400">
            {(() => {
              const activityText = status !== 'offline' ? getDiscordStatusText(activities) : null;
              if (activityText) {
                return activityText.split(/(\*\*.*?\*\*)/).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <span key={i} className="font-semibold text-gray-300">{part.slice(2, -2)}</span>
                    : part
                );
              }
              if (friendsSinceAgo) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">Friends since {friendsSinceAgo}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{friendsSinceExact}</TooltipContent>
                  </Tooltip>
                );
              }
              return status === 'offline' ? 'Offline' : 'Online';
            })()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AccountBadge source="discord" accountId={accountId} show={!!showAccountBadge} />
        <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); messageUser(); }}
            className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <ChatCircle size={18} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
};

type MergedFriend =
  | { source: 'ignite'; data: Friend; sortName: string }
  | { source: 'discord'; data: DiscordUser; accountId?: string; sortName: string };

const FriendRowSkeleton = () => (
  <div className="flex items-center justify-between px-2 py-3">
    <div className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div>
        <Skeleton className="mb-1.5 h-3.5 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="size-9 rounded-full" />
    </div>
  </div>
);

type FriendsListProps = {
  friends: Friend[];
  discordFriends: { user: DiscordUser; accountId?: string }[];
  filter: string;
  searchQuery: string;
  loading?: boolean;
  showAccountBadges?: boolean;
};

const FriendsList = ({ friends, discordFriends, filter, searchQuery, loading, showAccountBadges }: FriendsListProps) => {
  const merged = useMemo(() => {
    const igniteFiltered = filter === 'online' ? friends.filter((f) => f.status !== 'offline') : friends;

    let discordFiltered = discordFriends;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      discordFiltered = discordFiltered.filter(
        ({ user: u }) => u.username?.toLowerCase().includes(query) || u.global_name?.toLowerCase().includes(query)
      );
    }
    if (filter === 'online') {
      discordFiltered = discordFiltered.filter(({ user: u }) => (u.status || 'offline') !== 'offline');
    }

    const items: MergedFriend[] = [
      ...igniteFiltered.map((f): MergedFriend => ({
        source: 'ignite',
        data: f,
        sortName: (f.name || f.username || '').toLowerCase(),
      })),
      ...discordFiltered.map(({ user: u, accountId }): MergedFriend => ({
        source: 'discord',
        data: u,
        accountId,
        sortName: (u.global_name || u.username || '').toLowerCase(),
      })),
    ];

    return items.sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [friends, discordFriends, filter, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-1">
        <Skeleton className="mb-4 h-3 w-20 rounded" />
        {Array.from({ length: 8 }).map((_, i) => (
          <FriendRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
        {filter} — {merged.length}
      </div>
      {merged.length === 0 && searchQuery.trim() && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500">No one with that name can be found.</p>
        </div>
      )}
      <div className="[&>*+*]:border-t [&>*+*]:border-white/5/30">
        {merged.map((item) =>
          item.source === 'ignite' ? (
            <FriendRow key={item.data.id} friend={item.data} showAccountBadge={showAccountBadges} />
          ) : (
            <DiscordFriendRow
              key={`discord-${item.accountId ?? 'x'}-${item.data.id}`}
              user={item.data}
              accountId={item.accountId}
              showAccountBadge={showAccountBadges}
            />
          )
        )}
      </div>
    </div>
  );
};

export default FriendsList;
