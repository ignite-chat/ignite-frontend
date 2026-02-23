import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { ChannelsService } from '@/services/channels.service';
import { FriendsService } from '@/services/friends.service';
import { useChannelsStore } from '@/store/channels.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import UserProfileModal from '@/components/UserProfileModal';

const FriendsList = ({ friends, filter }) => {
  const navigate = useNavigate();
  const { channels } = useChannelsStore();
  const [profileUserId, setProfileUserId] = useState(null);

  const messageUser = (userId) => {
    const existingChannel = channels.find(
      (c) => c.type === 1 && c.recipients.some((r) => r.id === userId)
    );
    if (existingChannel) {
      navigate(`/channels/@me/${existingChannel.channel_id}`);
    } else {
      ChannelsService.createPrivateChannel([userId])
        .then((channel) => navigate(`/channels/@me/${channel.channel_id}`))
        .catch(() => toast.error('Failed to create DM channel'));
    }
  };

  const deleteFriend = (id) => {
    FriendsService.removeFriend(id)
      .then(() => toast.success('Friend removed'))
      .catch(() => toast.error('Failed to remove friend'));
  };

  const handleCopyUserId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success('User ID copied to clipboard.');
  };

  const filteredFriends =
    filter === 'online' ? friends.filter((f) => f.status !== 'offline') : friends;

  return (
    <>
      <div className="space-y-1">
        <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
          {filter} — {filteredFriends.length}
        </div>
        {filteredFriends.map((friend) => (
          <ContextMenu key={friend.id}>
            <ContextMenuTrigger>
              <div className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30">
                <div className="flex items-center gap-3">
                  <Avatar user={friend} className="size-8 rounded-full" />
                  <div>
                    <div className="text-sm font-bold text-white">
                      {friend.name}
                      <span className="ml-1 hidden text-xs text-gray-400 group-hover:inline">
                        {friend.username}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{friend.status}</div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => messageUser(friend.id)}
                    className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <MessageSquare size={18} />
                  </button>
                  <button
                    onClick={() => deleteFriend(friend.id)}
                    className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-red-400"
                  >
                    <UserMinus size={18} />
                  </button>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              <ContextMenuItem onSelect={() => setProfileUserId(friend.id)}>
                View Profile
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => messageUser(friend.id)}>
                Message
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem className="justify-between" onSelect={() => handleCopyUserId(friend.id)}>
                Copy User ID
                <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => deleteFriend(friend.id)}
                className="text-red-500 hover:bg-red-600/20"
              >
                Remove Friend
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onOpenChange={(open) => { if (!open) setProfileUserId(null); }}
      />
    </>
  );
};

export default FriendsList;
