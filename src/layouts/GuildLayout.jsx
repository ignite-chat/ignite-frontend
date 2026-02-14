import { useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import DefaultLayout from './DefaultLayout';
import ServerSettings from '../components/Settings/ServerSettings';
import useStore from '../hooks/useStore';
import EditGuildChannelModal from '../components/Modals/EditGuildChannelModal';
import { useChannelsStore } from '../store/channels.store';
import GuildSidebar from '@/components/Guild/GuildSidebar';
import CreateGuildChannelDialog from '@/components/Guild/CreateGuildChannelDialog';
import CreateGuildCategoryDialog from '@/components/Guild/CreateGuildCategoryDialog';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';

const GuildLayout = ({ children, guild }) => {
  const store = useStore();
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('info');
  const [editChannelId, setEditChannelId] = useState(null);
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { channels } = useChannelsStore();

  // Check permissions using PermissionsService instead of owner-only checks
  const canManageGuild = useMemo(() => {
    if (!guild?.id) return false;
    return PermissionsService.hasPermission(guild.id, null, Permissions.MANAGE_GUILD);
  }, [guild?.id]);

  const canManageChannels = useMemo(() => {
    if (!guild?.id) return false;
    return PermissionsService.hasPermission(guild.id, null, Permissions.MANAGE_CHANNELS);
  }, [guild?.id]);

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
      setEditChannelId(channelId);
      setIsEditChannelModalOpen(true);
    },
    [canManageChannels]
  );

  // Open sidebar when a new guild is selected
  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

  return (
    <DefaultLayout>
      <div className="flex h-screen w-screen">
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
          <GuildSidebar
            guild={guild}
            onOpenServerSettings={() => openServerSettings({ tab: 'info', channelId: null })}
            onEditChannel={(channel) => {
              openEditChannelModal({ channelId: channel.channel_id || channel.id });
            }}
            onCreateChannel={(categoryId) => {
              setCreateChannelCategoryId(categoryId);
              setIsCreateChannelDialogOpen(true);
            }}
            onCreateCategory={() => setIsCreateCategoryDialogOpen(true)}
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
        <main className="relative flex min-w-0 flex-1 flex-col bg-gray-700">{children}</main>
      </div>
      <ServerSettings
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        guild={guild}
        initialTab={settingsTab}
        editChannelId={editChannelId}
        onEditChannelChange={setEditChannelId}
      />
      <EditGuildChannelModal
        isOpen={isEditChannelModalOpen}
        setIsOpen={setIsEditChannelModalOpen}
        guild={guild}
        onClose={() => setIsEditChannelModalOpen(false)}
        channel={channels.find((c) => String(c.channel_id) === String(editChannelId))}
      />
      <CreateGuildChannelDialog
        isOpen={isCreateChannelDialogOpen}
        setIsOpen={setIsCreateChannelDialogOpen}
        guild={guild}
        categoryId={createChannelCategoryId}
      />
      <CreateGuildCategoryDialog
        isOpen={isCreateCategoryDialogOpen}
        setIsOpen={setIsCreateCategoryDialogOpen}
        guild={guild}
      />
    </DefaultLayout>
  );
};

export default GuildLayout;
