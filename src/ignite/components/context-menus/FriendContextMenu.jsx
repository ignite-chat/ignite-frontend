import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const FriendContextMenu = ({
  onViewProfile,
  onMessage,
  onCopyUserId,
  onRemoveFriend,
}) => {
  return (
    <ContextMenuContent className="w-52">
      <ContextMenuItem onSelect={onViewProfile}>View Profile</ContextMenuItem>
      <ContextMenuItem onSelect={onMessage}>Message</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={onCopyUserId}>
        Copy User ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onRemoveFriend} className="text-red-500 hover:bg-red-600/20">
        Remove Friend
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default FriendContextMenu;
