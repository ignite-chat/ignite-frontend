import { PushPin } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const DMChannelContextMenu = ({ channel, onTogglePin, onShowDebugInfo }) => {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onSelect={onTogglePin}>
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
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onShowDebugInfo}>Debug Info</ContextMenuItem>
    </ContextMenuContent>
  );
};

export default DMChannelContextMenu;
