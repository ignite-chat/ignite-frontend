import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { ChannelsService } from '@/services/channels.service';
import RemoveFriendModal from '@/components/modals/RemoveFriendModal';
import { useChannelsStore } from '@/ignite/store/channels.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import UserProfileModal from '@/components/modals/UserProfileModal';
import { useModalStore } from '@/ignite/store/modal.store';
import { useUsersStore } from '@/ignite/store/users.store';
import type { Friend } from '@/ignite/store/friends.store';
import { ChatCircle } from '@phosphor-icons/react';

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

type FriendsListProps = {
  friends: Friend[];
  filter: string;
};

const FriendsList = ({ friends, filter }: FriendsListProps) => {
  const filteredFriends =
    filter === 'online' ? friends.filter((f) => f.status !== 'offline') : friends;

  return (
    <>
      <div className="space-y-1">
        <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
          {filter} — {filteredFriends.length}
        </div>
        {filteredFriends.map((friend) => (
          <FriendRow key={friend.id} friend={friend} />
        ))}
      </div>
    </>
  );
};

export default FriendsList;
