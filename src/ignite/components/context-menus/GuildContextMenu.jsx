import { useState } from 'react';
import { Copy, Check, UserPlus, Gear } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ContextMenuContent } from '@/components/ui/context-menu';
import { Separator } from '@/components/ui/separator';
import { useContextMenuStore } from '@/store/context-menu.store';
import { UnreadsService } from '../../services/unreads.service';
import { ChannelsService } from '../../services/channels.service';
import { useChannelsStore } from '../../store/channels.store';
import { useUnreadsStore } from '../../store/unreads.store';
import { isChannelUnread } from '../../utils/unreads.utils';
import { useHasPermission } from '../../hooks/useHasPermission';
import { Permissions } from '../../constants/Permissions';
import { useModalStore } from '../../store/modal.store';
import ServerSettingsModal from '../settings/ServerSettings';
import GuildMenuContent from '../guild/GuildMenuContent';

const GuildContextMenu = ({ guild, onLeave, onInvite }) => {
  const { channels } = useChannelsStore();
  const { channelUnreads } = useUnreadsStore();
  const [view, setView] = useState('main');
  const canManageGuild = useHasPermission(guild?.id, null, Permissions.MANAGE_GUILD);

  const close = () => useContextMenuStore.getState().close();

  const guildChannels = channels.filter((c) => c.guild_id === guild.id);
  const hasUnread = guildChannels.some((c) => isChannelUnread(c, channelUnreads, true));

  const handleMarkAsRead = () => {
    close();
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
    close();
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
              disabled={!hasUnread}
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
              onClick={handleMarkAsRead}
            >
              <span>Mark As Read</span>
              <Check className="ml-2 size-[18px]" />
            </button>

            <Separator className="my-1 bg-white/5" />

            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
              onClick={() => { close(); onInvite(); }}
            >
              <span>Invite People</span>
              <UserPlus className="ml-2 size-[18px]" />
            </button>

            {canManageGuild && (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
                onClick={() => {
                  close();
                  useModalStore.getState().push(ServerSettingsModal, { guild });
                }}
              >
                <span>Server Settings</span>
                <Gear className="ml-2 size-[18px]" />
              </button>
            )}

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
              <Copy className="ml-2 size-[18px]" />
            </button>
          </>
        }
      />
    </ContextMenuContent>
  );
};

export default GuildContextMenu;
