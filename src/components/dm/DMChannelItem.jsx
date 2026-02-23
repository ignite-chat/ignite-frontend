import Avatar from '@/components/Avatar';
import { useChannelsStore } from '@/store/channels.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '../ui/context-menu';
import { PushPin } from '@phosphor-icons/react';
import { isChannelUnread } from '@/utils/unreads.utils';

const DMChannelItem = ({
  channel,
  isActive,
  onClick,
  channelUnreads,
  channelUnreadsLoaded,
}) => {
  const { togglePin } = useChannelsStore();

  const unreadState = isChannelUnread(channel, channelUnreads, channelUnreadsLoaded);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          onClick={onClick}
          className={`group relative flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm transition-all ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'} ${!isActive && unreadState ? 'text-gray-100' : ''} `}
        >
          {!isActive && unreadState && (
            <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all group-hover:h-4" />
          )}

          <div className="relative">
            <Avatar user={channel.user} className="size-8 rounded-full" />
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between">
            <span
              className={`truncate ${!isActive && unreadState ? 'font-bold text-gray-100' : 'font-medium'}`}
            >
              {channel.user.name}
            </span>
            {channel.isPinned && (
              <PushPin size={12} weight="fill" className="rotate-45 text-gray-500" />
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={() => togglePin(channel.channel_id)}>
          <div className="flex w-full items-center justify-between">
            {channel.isPinned ? 'Unpin' : 'Pin'}
            <PushPin size={14} className={channel.isPinned ? '' : 'rotate-45'} />
          </div>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="justify-between"
          onSelect={() => {
            navigator.clipboard.writeText(channel.user.id);
            toast.success('Copied User ID');
          }}
        >
          Copy User ID
          <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default DMChannelItem;
