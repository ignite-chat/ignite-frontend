import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMinus } from 'lucide-react';
import { ChatCircle, DiscordLogo } from '@phosphor-icons/react';
import { toast } from 'sonner';
import Avatar from '@/ignite/components/Avatar';
import { ChannelsService } from '@/ignite/services/channels.service';
import RemoveFriendModal from '@/ignite/components/modals/RemoveFriendModal';
import { useChannelsStore } from '@/ignite/store/channels.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { useModalStore } from '@/ignite/store/modal.store';
import { useUsersStore } from '@/ignite/store/users.store';
import type { Friend } from '@/ignite/store/friends.store';
import type { DiscordUser } from '@/discord/store/discord-users.store';
import { DiscordService } from '@/discord/services/discord.service';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

type FriendRowProps = {
  friend: Friend;
};

const FriendRow = ({ friend }: FriendRowProps) => {
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
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={messageUser}
          className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
        >
          <div className="flex items-center gap-3">
            <Avatar user={user} size={32} showStatus showOffline />
            <div>
              <div className="text-sm font-bold text-white">
                {user.name}
                <span className="ml-1 hidden text-xs text-gray-400 group-hover:inline">
                  {user.username}
                </span>
              </div>
              <div className="text-xs text-gray-400">{friend.status}</div>
            </div>
          </div>
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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => useModalStore.getState().push(UserProfileModal, { userId: friend.id })}>
          View Profile
        </ContextMenuItem>
        <ContextMenuItem onSelect={messageUser}>
          Message
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="justify-between" onSelect={handleCopyUserId}>
          Copy User ID
          <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={deleteFriend}
          className="text-red-500 hover:bg-red-600/20"
        >
          Remove Friend
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

type DiscordFriendRowProps = {
  user: DiscordUser;
};

const DiscordFriendRow = ({ user }: DiscordFriendRowProps) => {
  const navigate = useNavigate();
  const channels = useDiscordChannelsStore((s) => s.channels);
  const status = user.status || 'offline';
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 64);

  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-500',
  };

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
      className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={avatarUrl}
            alt={user.global_name || user.username}
            className="size-8 rounded-full object-cover"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#1a1a1e] ${statusColors[status] || statusColors.offline}`} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            {user.global_name || user.username}
            {user.global_name && (
              <span className="hidden text-xs text-gray-400 group-hover:inline">
                {user.username}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <DiscordLogo size={14} weight="fill" className="shrink-0 text-[#5865f2]" />
              </TooltipTrigger>
              <TooltipContent side="top">Discord</TooltipContent>
            </Tooltip>
          </div>
          <div className="text-xs capitalize text-gray-400">{status}</div>
        </div>
      </div>
      <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); messageUser(); }}
          className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <ChatCircle size={18} weight="fill" />
        </button>
      </div>
    </div>
  );
};

type MergedFriend =
  | { source: 'ignite'; data: Friend; sortName: string }
  | { source: 'discord'; data: DiscordUser; sortName: string };

type FriendsListProps = {
  friends: Friend[];
  discordFriends: DiscordUser[];
  filter: string;
  searchQuery: string;
};

const FriendsList = ({ friends, discordFriends, filter, searchQuery }: FriendsListProps) => {
  const merged = useMemo(() => {
    const igniteFiltered = filter === 'online' ? friends.filter((f) => f.status !== 'offline') : friends;

    let discordFiltered = discordFriends;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      discordFiltered = discordFiltered.filter(
        (u) => u.username?.toLowerCase().includes(query) || u.global_name?.toLowerCase().includes(query)
      );
    }
    if (filter === 'online') {
      discordFiltered = discordFiltered.filter((u) => (u.status || 'offline') !== 'offline');
    }

    const items: MergedFriend[] = [
      ...igniteFiltered.map((f): MergedFriend => ({
        source: 'ignite',
        data: f,
        sortName: (f.name || f.username || '').toLowerCase(),
      })),
      ...discordFiltered.map((u): MergedFriend => ({
        source: 'discord',
        data: u,
        sortName: (u.global_name || u.username || '').toLowerCase(),
      })),
    ];

    return items.sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [friends, discordFriends, filter, searchQuery]);

  return (
    <div className="space-y-1">
      <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
        {filter} — {merged.length}
      </div>
      {merged.map((item) =>
        item.source === 'ignite' ? (
          <FriendRow key={item.data.id} friend={item.data} />
        ) : (
          <DiscordFriendRow key={`discord-${item.data.id}`} user={item.data} />
        )
      )}
    </div>
  );
};

export default FriendsList;
