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
        <ContextMenuItem disabled={!isUnread} onSelect={onMarkAsRead}>
          Mark as Read
        </ContextMenuItem>
      )}
      {!isVoice && <ContextMenuSeparator />}
      {isVoice ? (
        <ContextMenuItem onSelect={onJoinVoice}>Join Voice Channel</ContextMenuItem>
      ) : (
        <ContextMenuItem onSelect={onGoToChannel}>Go to Channel</ContextMenuItem>
      )}
      <ContextMenuItem onSelect={onCopyLink}>Copy Link</ContextMenuItem>

      {canManageChannels && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onEditChannel}>Edit Channel</ContextMenuItem>
          <ContextMenuItem onSelect={onDeleteChannel} className="text-red-500 hover:bg-red-600/20">
            Delete Channel
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onCopyId}>Copy Channel ID</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onDebugInfo}>Debug Info</ContextMenuItem>
    </ContextMenuContent>
  );
};

export default ChannelItemContextMenu;
