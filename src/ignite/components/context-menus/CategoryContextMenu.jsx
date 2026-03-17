import { Check, PencilSimple, Trash } from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const CategoryContextMenu = ({ anyChannelUnread, canManageChannels, onMarkAsRead, onEditCategory, onDeleteCategory }) => {
  return (
    <ContextMenuContent className="w-52">
      <ContextMenuItem className="justify-between" disabled={!anyChannelUnread} onSelect={onMarkAsRead}>
        Mark as Read
        <Check className="ml-auto size-[18px]" />
      </ContextMenuItem>

      {canManageChannels && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem className="justify-between" onSelect={onEditCategory}>
            Edit Category
            <PencilSimple className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={onDeleteCategory}
            className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          >
            Delete Category
            <Trash className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default CategoryContextMenu;
