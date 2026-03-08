import { toast } from 'sonner';
import { ArrowBendUpLeft, Copy, Trash } from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { DiscordApiService } from '../../services/discord-api.service';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordReplyStore } from '../../store/discord-reply.store';

const DiscordMessageContextMenu = ({ message, canDelete }) => {
  const handleReply = () => {
    useDiscordReplyStore.getState().setReplyingMessage(message.id, message);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message text copied to clipboard.');
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(message.id);
    toast.success('Message ID copied to clipboard.');
  };

  const handleDelete = async () => {
    try {
      await DiscordApiService.deleteMessage(message.channel_id, message.id);
      useDiscordChannelsStore.getState().removeMessage(message.channel_id, message.id);
      toast.success('Message deleted.');
    } catch {
      toast.error('Failed to delete message.');
    }
  };

  return (
    <ContextMenuContent className="w-52">
      <ContextMenuItem className="justify-between" onSelect={handleReply}>
        Reply
        <ArrowBendUpLeft className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuSeparator />
      {message.content && (
        <ContextMenuItem className="justify-between" onSelect={handleCopyText}>
          Copy Text
          <Copy className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}
      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy Message ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
      </ContextMenuItem>

      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={handleDelete}
            className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          >
            Delete Message
            <Trash className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default DiscordMessageContextMenu;
