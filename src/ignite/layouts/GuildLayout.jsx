import { useCallback } from 'react';
import { toast } from 'sonner';
import SharedGuildLayout from '@/layouts/GuildLayout';
import EditGuildChannelModal from '../components/modals/EditGuildChannelModal';
import { useChannelsStore } from '@/ignite/store/channels.store';
import GuildChannelsSidebar from '@/ignite/components/guild/GuildChannelsSidebar';
import CreateGuildChannelModal from '@/ignite/components/modals/CreateGuildChannelModal';
import CreateGuildCategoryModal from '@/ignite/components/modals/CreateGuildCategoryModal';
import { Permissions } from '@/ignite/constants/Permissions';
import { useHasPermission } from '@/ignite/hooks/useHasPermission';
import { useModalStore } from '@/ignite/store/modal.store';

const GuildLayout = ({ children, guild }) => {
  const canManageChannels = useHasPermission(guild?.id, null, Permissions.MANAGE_CHANNELS);

  const openEditChannelModal = useCallback(
    ({ channelId = null } = {}) => {
      if (!canManageChannels) {
        toast.error('You do not have permission to edit channels.');
        return;
      }
      const { channels } = useChannelsStore.getState();
      const channel = channels.find((c) => String(c.channel_id) === String(channelId));
      useModalStore.getState().push(EditGuildChannelModal, { guild, channel });
    },
    [canManageChannels, guild]
  );

  const sidebar = (
    <GuildChannelsSidebar
      guild={guild}
      onEditChannel={(channel) => {
        openEditChannelModal({ channelId: channel.channel_id || channel.id });
      }}
      onCreateChannel={(categoryId) => {
        useModalStore.getState().push(CreateGuildChannelModal, { guild, categoryId });
      }}
      onCreateCategory={() => {
        useModalStore.getState().push(CreateGuildCategoryModal, { guild });
      }}
      canManageChannels={canManageChannels}
    />
  );

  return (
    <SharedGuildLayout guild={guild} sidebar={sidebar}>
      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex h-full min-w-0 flex-1 flex-col bg-[#1a1a1e]">{children}</main>
      </div>
    </SharedGuildLayout>
  );
};

export default GuildLayout;
