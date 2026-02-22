import { toast } from 'sonner';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordChannelsStore } from '../store/discord-channels.store';

const DiscordMessageContextMenu = ({ message, canDelete }) => {
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
      {message.content && (
        <ContextMenuItem onSelect={handleCopyText}>Copy Text</ContextMenuItem>
      )}
      <ContextMenuItem onSelect={handleCopyId}>Copy Message ID</ContextMenuItem>

      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={handleDelete}
            className="text-red-500 hover:bg-red-600/20"
          >
            Delete Message
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default DiscordMessageContextMenu;
