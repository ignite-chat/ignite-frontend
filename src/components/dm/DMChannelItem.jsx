import Avatar from '@/components/Avatar';
import { useChannelsStore } from '@/store/channels.store';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu';
import { PushPin } from '@phosphor-icons/react';

const DMChannelItem = ({ channel, isActive, onClick, channelUnreads, channelUnreadsLoaded, channelsRaw }) => {
    const { togglePin } = useChannelsStore();

    // Logic to determine if a channel is unread
    const isUnread = () => {
        if (!channelUnreadsLoaded) return false;
        const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
        if (!channelUnread) return false;

        const originalChannel = channelsRaw.find((c) => String(c.channel_id) == String(channel.channel_id));
        if (!originalChannel || !originalChannel.last_message_id) return false;

        const lastMsgTime = BigInt(originalChannel.last_message_id) >> 22n;
        const lastReadTime = BigInt(channelUnread.last_read_message_id) >> 22n;

        return lastMsgTime > lastReadTime;
    };

    const unreadState = isUnread();

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <button
                    onClick={onClick}
                    className={`
                        group relative flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm transition-all
                        ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}
                        ${!isActive && unreadState ? 'text-gray-100' : ''} 
                    `}
                >
                    {!isActive && unreadState && (
                        <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all group-hover:h-4" />
                    )}

                    <div className="relative">
                        <Avatar user={channel.user} className="size-8 rounded-full" />
                        <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-gray-800 bg-green-500" />
                    </div>

                    <div className="min-w-0 flex-1 flex items-center justify-between">
                        <span className={`truncate ${!isActive && unreadState ? 'font-bold text-gray-100' : 'font-medium'}`}>
                            {channel.user.name}
                        </span>
                        {channel.isPinned && (
                            <PushPin size={12} weight="fill" className="text-gray-500 rotate-45" />
                        )}
                    </div>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onSelect={() => togglePin(channel.channel_id)}>
                    <div className="flex items-center justify-between w-full">
                        {channel.isPinned ? 'Unpin' : 'Pin'}
                        <PushPin size={14} className={channel.isPinned ? '' : 'rotate-45'} />
                    </div>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default DMChannelItem;
