import { GearSix, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ContextMenuContent } from '@/components/ui/context-menu';
import { Separator } from '@/components/ui/separator';
import { useModalStore } from '@/store/modal.store';
import { useDiscordGuildFoldersStore } from '../../store/discord-guild-folders.store';
import DiscordFolderSettingsModal from '../modals/DiscordFolderSettingsModal';

const DiscordFolderContextMenu = ({ folder }) => {
  const handleEditFolder = () => {
    useModalStore.getState().push(DiscordFolderSettingsModal, { folder });
  };

  const handleDeleteFolder = () => {
    useDiscordGuildFoldersStore.getState().deleteFolder(folder.id);
    toast.success('Folder ungrouped');
  };

  return (
    <ContextMenuContent className="w-52">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
        onClick={handleEditFolder}
      >
        <span>Folder Settings</span>
        <GearSix className="ml-2 size-[18px]" />
      </button>

      <Separator className="my-1 bg-white/5" />

      <button
        type="button"
        className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-red-300 hover:bg-white/5"
        onClick={handleDeleteFolder}
      >
        <span>Delete Folder</span>
        <Trash className="ml-2 size-[18px]" />
      </button>
    </ContextMenuContent>
  );
};

export default DiscordFolderContextMenu;
