import {
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';

const GuildSidebarContextMenu = ({ canManageChannels, onCreateChannel, onCreateCategory }) => {
  return (
    <ContextMenuContent className="w-52">
      {canManageChannels && (
        <ContextMenuItem onSelect={onCreateChannel}>Create Channel</ContextMenuItem>
      )}
      {canManageChannels && (
        <ContextMenuItem onSelect={onCreateCategory}>Create Category</ContextMenuItem>
      )}
    </ContextMenuContent>
  );
};

export default GuildSidebarContextMenu;
