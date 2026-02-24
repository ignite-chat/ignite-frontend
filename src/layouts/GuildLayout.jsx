import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DefaultLayout from './DefaultLayout';
import ServerSettings from '../components/Settings/ServerSettings';
import EditGuildChannelModal from '../components/Modals/EditGuildChannelModal';
import { useChannelsStore } from '@/store/channels.store';
import GuildChannelsSidebar from '@/components/Guild/GuildChannelsSidebar';
import CreateGuildChannelDialog from '@/components/Guild/CreateGuildChannelDialog';
import CreateGuildCategoryDialog from '@/components/Guild/CreateGuildCategoryDialog';
import { Permissions } from '@/constants/Permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { useModalStore } from '@/store/modal.store';

const GuildLayout = ({ children, guild }) => {
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('info');
  const [editChannelId, setEditChannelId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const canManageGuild = useHasPermission(guild?.id, null, Permissions.MANAGE_GUILD);
  const canManageChannels = useHasPermission(guild?.id, null, Permissions.MANAGE_CHANNELS);

  const openServerSettings = useCallback(
    ({ tab = 'info', channelId = null } = {}) => {
      if (!canManageGuild) {
        toast.error('You do not have permission to access server settings.');
        return;
      }
      setSettingsTab(tab);
      setEditChannelId(channelId);
      setIsServerSettingsOpen(true);
    },
    [canManageGuild]
  );

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

  // Open sidebar when a new guild is selected
  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

  const guildSidebar = (
    <>
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-transparent md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 shrink-0 transition-transform duration-300 ease-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <GuildChannelsSidebar
          guild={guild}
          onOpenServerSettings={() => openServerSettings({ tab: 'info', channelId: null })}
          onEditChannel={(channel) => {
            openEditChannelModal({ channelId: channel.channel_id || channel.id });
          }}
          onCreateChannel={(categoryId) => {
            useModalStore.getState().push(CreateGuildChannelDialog, { guild, categoryId });
          }}
          onCreateCategory={() => {
            useModalStore.getState().push(CreateGuildCategoryDialog, { guild });
          }}
          canOpenServerSettings={canManageGuild}
          canManageChannels={canManageChannels}
        />
      </div>
      {!isSidebarOpen && (
        <button
          type="button"
          className="border-white/5/60 fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 animate-pulse rounded-r border bg-gray-800/70 shadow-sm transition-all duration-300 hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        />
      )}
    </>
  );

  return (
    <DefaultLayout sidebar={guildSidebar}>
      <main className="relative flex h-full min-w-0 flex-1 flex-col bg-gray-700">{children}</main>
      <ServerSettings
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        guild={guild}
        initialTab={settingsTab}
        editChannelId={editChannelId}
        onEditChannelChange={setEditChannelId}
      />
    </DefaultLayout>
  );
};

export default GuildLayout;
