import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const CategoryContextMenu = ({ anyChannelUnread, canManageChannels, onMarkAsRead, onEditCategory, onDeleteCategory }) => {
  return (
    <ContextMenuContent className="w-52">
      <ContextMenuItem disabled={!anyChannelUnread} onSelect={onMarkAsRead}>
        Mark as Read
      </ContextMenuItem>

      {canManageChannels && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onEditCategory}>Edit Category</ContextMenuItem>
          <ContextMenuItem
            onSelect={onDeleteCategory}
            className="text-red-500 hover:bg-red-600/20"
          >
            Delete Category
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default CategoryContextMenu;
