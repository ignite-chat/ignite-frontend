import { PlusCircle, FolderPlus } from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';

const GuildSidebarContextMenu = ({ canManageChannels, onCreateChannel, onCreateCategory }) => {
  return (
    <ContextMenuContent className="w-52">
      {canManageChannels && (
        <ContextMenuItem className="justify-between" onSelect={onCreateChannel}>
          Create Channel
          <PlusCircle className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}
      {canManageChannels && (
        <ContextMenuItem className="justify-between" onSelect={onCreateCategory}>
          Create Category
          <FolderPlus className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
};

export default GuildSidebarContextMenu;
