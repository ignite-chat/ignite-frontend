import { toast } from 'sonner';
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '../ui/context-menu';

const MessageContextMenu = ({
  message,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onReply,
  guildId,
  channelId,
}) => {
  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message text copied to clipboard.');
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(message.id);
    toast.success('Message ID copied to clipboard.');
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    const gPart = guildId || '@me';
    const link = `${origin}/channels/${gPart}/${channelId}/${message.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Message link copied to clipboard.');
  };

  return (
    <ContextMenuContent className="w-52">
      <ContextMenuItem onSelect={onReply}>Reply</ContextMenuItem>
      <ContextMenuSeparator />
      {canEdit && (
        <>
          <ContextMenuItem onSelect={onEdit}>Edit Message</ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      <ContextMenuItem onSelect={handleCopyText}>Copy Text</ContextMenuItem>
      <ContextMenuItem onSelect={handleCopyLink}>Copy Message Link</ContextMenuItem>
      <ContextMenuItem onSelect={handleCopyId}>Copy Message ID</ContextMenuItem>
      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onDelete} className="text-red-500 hover:bg-red-600/20">
            Delete Message
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default MessageContextMenu;
