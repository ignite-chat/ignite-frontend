import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useContextMenuStore } from '@/store/context-menu.store';
import Avatar from '../Avatar';
import GuildMemberContextMenu from '../context-menus/GuildMemberContextMenu';
import GuildMemberPopoverContent from '../popovers/GuildMemberPopoverContent';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { useModalStore } from '../../store/modal.store';

const MessageAvatar = ({ user, guildId }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openContextMenu = useContextMenuStore((s) => s.open);

  const handleViewProfile = () => {
    setPopoverOpen(false);
    useModalStore.getState().push(UserProfileModal, { userId: user.id, guildId });
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onContextMenu={(e) => openContextMenu(GuildMemberContextMenu, { user, onViewProfile: handleViewProfile }, e)}
        >
          <Avatar user={user} size={40} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0 shadow-none"
        align="start"
        alignOffset={0}
      >
        <GuildMemberPopoverContent
          userId={user.id}
          onOpenProfile={handleViewProfile}
        />
      </PopoverContent>
    </Popover>
  );
};

export default MessageAvatar;
