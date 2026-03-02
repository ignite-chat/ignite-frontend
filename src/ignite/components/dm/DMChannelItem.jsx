import { useState } from 'react';
import Avatar from '@/ignite/components/Avatar';
import { useChannelsStore } from '@/ignite/store/channels.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PushPin } from '@phosphor-icons/react';
import { isChannelUnread } from '@/ignite/utils/unreads.utils';

const DMChannelItem = ({
  channel,
  isActive,
  onClick,
  channelUnreads,
  channelUnreadsLoaded,
}) => {
  const { togglePin } = useChannelsStore();
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const unreadState = isChannelUnread(channel, channelUnreads, channelUnreadsLoaded);

  const highlightJson = (obj) => {
    const raw = JSON.stringify(obj, null, 2);
    const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-emerald-400'; // number
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-blue-400' : 'text-amber-300';
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-400';
        } else if (/null/.test(match)) {
          cls = 'text-red-400';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  return (
    <>
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
            <Avatar user={channel.user} size={32} showStatus showOffline />
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
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setShowDebugInfo(true)}>
          Debug Info
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <Dialog open={showDebugInfo} onOpenChange={setShowDebugInfo}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Channel Debug Info</DialogTitle>
          <DialogDescription>{channel.user?.name || channel.name}</DialogDescription>
        </DialogHeader>
        <pre
          className="min-h-0 flex-1 overflow-auto rounded-md bg-black/40 p-4 text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightJson(channel) }}
        />
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DMChannelItem;
