import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { ChannelsService } from '@/services/channels.service';
import { FriendsService } from '@/services/friends.service';
import { useChannelsStore } from '@/store/channels.store';

const FriendsList = ({ friends, filter }) => {
    const navigate = useNavigate();
    const { channels } = useChannelsStore();

    const messageUser = (userId) => {
        const existingChannel = channels.find(c => c.type === 1 && c.recipients.some(r => r.id === userId));
        if (existingChannel) {
            navigate(`/channels/@me/${existingChannel.channel_id}`);
        } else {
            ChannelsService.createPrivateChannel([userId])
                .then(channel => navigate(`/channels/@me/${channel.channel_id}`))
                .catch(() => toast.error('Failed to create DM channel'));
        }
    };

    const deleteFriend = (id) => {
        // Assuming a delete method exists in service, logic extracted from original context
        FriendsService.removeFriend(id)
            .then(() => toast.success("Friend removed"))
            .catch(() => toast.error("Failed to remove friend"));
    };

    return (
        <div className="space-y-1">
            <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
                {filter} - {friends.length}
            </div>
            {friends.map(friend => (
                <div key={friend.id} className="group flex items-center justify-between border-t border-gray-600/30 px-2 py-3 hover:bg-gray-600/30 hover:rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Avatar user={friend} className="size-8 rounded-full" />
                        <div>
                            <div className="text-sm font-bold text-white">
                                {friend.username}
                                <span className="hidden text-xs text-gray-400 ml-1 group-hover:inline">#{friend.discriminator || '0000'}</span>
                            </div>
                            <div className="text-xs text-gray-400">Online</div>
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => messageUser(friend.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700">
                            <MessageSquare size={18} />
                        </button>
                        <button onClick={() => deleteFriend(friend.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-red-400 hover:bg-gray-700">
                            <UserMinus size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FriendsList;