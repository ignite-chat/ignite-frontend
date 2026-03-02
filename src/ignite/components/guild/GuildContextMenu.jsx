import { useState } from 'react';
import { Copy, Check, UserPlus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ContextMenuContent } from '@/components/ui/context-menu';
import { Separator } from '@/components/ui/separator';
import { UnreadsService } from '../../services/unreads.service';
import { ChannelsService } from '../../services/channels.service';
import { useChannelsStore } from '../../store/channels.store';
import { useUnreadsStore } from '../../store/unreads.store';
import { isChannelUnread } from '../../utils/unreads.utils';
import GuildMenuContent from './GuildMenuContent';

const GuildContextMenu = ({ guild, onLeave, onInvite }) => {
  const { channels } = useChannelsStore();
  const { channelUnreads } = useUnreadsStore();
  const [view, setView] = useState('main');

  const handleMarkAsRead = () => {
    const guildChannels = channels.filter((c) => c.guild_id === guild.id);

    const unreadChannels = guildChannels.filter((c) =>
      isChannelUnread(c, channelUnreads, true)
    );

    if (unreadChannels.length === 0) {
      toast.info('Server is already read.');
      return;
    }

    unreadChannels.forEach((c) => {
      if (c.last_message_id) {
        UnreadsService.setLastReadMessageId(c.channel_id, c.last_message_id);
        ChannelsService.acknowledgeChannelMessage(c.channel_id, c.last_message_id);
      }
    });

    toast.success('Marked server as read');
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(guild.id);
    toast.success('Copied Server ID');
  };

  return (
    <ContextMenuContent
      className="w-56"
      onCloseAutoFocus={() => setView('main')}
    >
      <GuildMenuContent
        guild={guild}
        view={view}
        setView={setView}
        onLeave={onLeave}
        topContent={
          <>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
              onClick={handleMarkAsRead}
            >
              <span>Mark As Read</span>
              <Check className="ml-2 size-4" />
            </button>

            <Separator className="my-1 bg-white/5" />

            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
              onClick={onInvite}
            >
              <span>Invite People</span>
              <UserPlus className="ml-2 size-4" />
            </button>

            <Separator className="my-1 bg-white/5" />
          </>
        }
        bottomContent={
          <>
            <Separator className="my-1 bg-white/5" />

            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
              onClick={handleCopyId}
            >
              <span>Copy Server ID</span>
              <Copy className="ml-2 size-4" />
            </button>
          </>
        }
      />
    </ContextMenuContent>
  );
};

export default GuildContextMenu;
