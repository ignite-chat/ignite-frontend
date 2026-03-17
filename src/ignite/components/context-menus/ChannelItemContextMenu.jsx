import {
  Check,
  Microphone,
  ArrowSquareOut,
  Link,
  PencilSimple,
  Trash,
  Bug,
} from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const ChannelItemContextMenu = ({
  isVoice,
  isUnread,
  canManageChannels,
  onMarkAsRead,
  onJoinVoice,
  onGoToChannel,
  onCopyLink,
  onEditChannel,
  onDeleteChannel,
  onCopyId,
  onDebugInfo,
}) => {
  return (
    <ContextMenuContent className="w-52">
      {!isVoice && (
        <ContextMenuItem className="justify-between" disabled={!isUnread} onSelect={onMarkAsRead}>
          Mark as Read
          <Check className="ml-auto size-[18px]" />
        </ContextMenuItem>
      )}
      {!isVoice && <ContextMenuSeparator />}
      {isVoice ? (
        <ContextMenuItem className="justify-between" onSelect={onJoinVoice}>
          Join Voice Channel
          <Microphone className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      ) : (
        <ContextMenuItem className="justify-between" onSelect={onGoToChannel}>
          Go to Channel
          <ArrowSquareOut className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}
      <ContextMenuItem className="justify-between" onSelect={onCopyLink}>
        Copy Link
        <Link className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>

      {canManageChannels && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem className="justify-between" onSelect={onEditChannel}>
            Edit Channel
            <PencilSimple className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={onDeleteChannel}
            className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          >
            Delete Channel
            <Trash className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={onCopyId}>
        Copy Channel ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={onDebugInfo}>
        Debug Info
        <Bug className="ml-auto size-[18px]" />
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default ChannelItemContextMenu;
