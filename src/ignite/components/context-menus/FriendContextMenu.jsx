import { User, ChatCircle, UserMinus } from '@phosphor-icons/react';
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
      <ContextMenuItem className="justify-between" onSelect={onViewProfile}>
        View Profile
        <User className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuItem className="justify-between" onSelect={onMessage}>
        Message
        <ChatCircle className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={onCopyUserId}>
        Copy User ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={onRemoveFriend}
        className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
      >
        Remove Friend
        <UserMinus className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default FriendContextMenu;
