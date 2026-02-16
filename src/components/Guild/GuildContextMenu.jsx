import { Copy, Check, SignOut } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '../ui/context-menu';
import { UnreadsService } from '../../services/unreads.service';
import { ChannelsService } from '../../services/channels.service';
import { useChannelsStore } from '../../store/channels.store';
import { useUnreadsStore } from '../../store/unreads.store';
import { isChannelUnread } from '../../utils/unreads.utils';

const GuildContextMenu = ({ guild, onLeave }) => {
  const { channels } = useChannelsStore();
  const { channelUnreads } = useUnreadsStore();

  const handleMarkAsRead = () => {
    const guildChannels = channels.filter((c) => c.guild_id === guild.id);
    
    // Filter channels that are actually unread
    const unreadChannels = guildChannels.filter((c) => 
      isChannelUnread(c, channelUnreads, true)
    );

    if (unreadChannels.length === 0) {
        toast.info('Server is already read.');
        return;
    }

    // Mark all as read
    unreadChannels.forEach((c) => {
      if (c.last_message_id) {
        // Update local store immediately
        UnreadsService.setLastReadMessageId(c.channel_id, c.last_message_id);
        // Send ack to server
        ChannelsService.acknowledgeChannelMessage(c.channel_id, c.last_message_id);
      }
    });
    
    toast.success('Marked server as read');
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(guild.id);
    toast.success('Copied Server ID');
  };

  const handleLeaveServer = () => {
    onLeave && onLeave();
  };

  return (
    <ContextMenuContent className="w-56">
      <ContextMenuItem onClick={handleMarkAsRead} className="cursor-pointer">
        <Check className="mr-2 size-4" />
        Mark As Read
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleCopyId} className="cursor-pointer">
        <Copy className="mr-2 size-4" />
        Copy Server ID
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem 
        onClick={handleLeaveServer} 
        className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
      >
        <SignOut className="mr-2 size-4" />
        Leave Server
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default GuildContextMenu;
