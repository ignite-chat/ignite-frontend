import { toast } from 'sonner';
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { downloadImage, copyImageToClipboard } from '@/ignite/utils/image.utils';

const MessageContextMenu = ({
  message,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onReply,
  guildId,
  channelId,
  imageUrl,
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
    const gPart = guildId || '@me';
    const link = `${window.location.origin}/channels/${gPart}/${channelId}/${message.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Message link copied to clipboard.');
  };

  const handleCopyImageUrl = () => {
    navigator.clipboard.writeText(imageUrl);
    toast.success('Image URL copied to clipboard.');
  };

  const handleOpenImageUrl = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
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
      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy Message ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
      </ContextMenuItem>
      {imageUrl && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => copyImageToClipboard(imageUrl)}>Copy Image</ContextMenuItem>
          <ContextMenuItem onSelect={() => downloadImage(imageUrl)}>Save Image</ContextMenuItem>
          <ContextMenuItem onSelect={handleCopyImageUrl}>Copy Image URL</ContextMenuItem>
          <ContextMenuItem onSelect={handleOpenImageUrl}>Open Image URL</ContextMenuItem>
        </>
      )}
      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onDelete} className="text-[#f23f42] focus:bg-[#da373c] focus:text-white">
            Delete Message
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default MessageContextMenu;
