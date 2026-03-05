import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import Avatar from '../Avatar';
import GuildMemberContextMenu from '../guild-member/GuildMemberContextMenu';
import GuildMemberPopoverContent from '../popovers/GuildMemberPopoverContent';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { useModalStore } from '../../store/modal.store';

const MessageAvatar = ({ user, guildId }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleViewProfile = () => {
    setPopoverOpen(false);
    useModalStore.getState().push(UserProfileModal, { userId: user.id, guildId });
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <ContextMenu>
        <ContextMenuTrigger>
          <PopoverTrigger asChild>
            <button type="button">
              <Avatar user={user} size={40} />
            </button>
          </PopoverTrigger>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <GuildMemberContextMenu user={user} onViewProfile={handleViewProfile} />
        </ContextMenuContent>
      </ContextMenu>
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
