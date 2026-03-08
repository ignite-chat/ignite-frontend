import { toast } from 'sonner';
import { ArrowBendUpLeft, PencilSimple, Copy, Link, Trash, ImageSquare, DownloadSimple, ArrowSquareOut } from '@phosphor-icons/react';
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
      <ContextMenuItem className="justify-between" onSelect={onReply}>
        Reply
        <ArrowBendUpLeft className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuSeparator />
      {canEdit && (
        <>
          <ContextMenuItem className="justify-between" onSelect={onEdit}>
            Edit Message
            <PencilSimple className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      <ContextMenuItem className="justify-between" onSelect={handleCopyText}>
        Copy Text
        <Copy className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuItem className="justify-between" onSelect={handleCopyLink}>
        Copy Message Link
        <Link className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy Message ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
      </ContextMenuItem>
      {imageUrl && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem className="justify-between" onSelect={() => copyImageToClipboard(imageUrl)}>
            Copy Image
            <ImageSquare className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
          <ContextMenuItem className="justify-between" onSelect={() => downloadImage(imageUrl)}>
            Save Image
            <DownloadSimple className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
          <ContextMenuItem className="justify-between" onSelect={handleCopyImageUrl}>
            Copy Image URL
            <Link className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
          <ContextMenuItem className="justify-between" onSelect={handleOpenImageUrl}>
            Open Image URL
            <ArrowSquareOut className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
        </>
      )}
      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onDelete} className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white">
            Delete Message
            <Trash className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default MessageContextMenu;
