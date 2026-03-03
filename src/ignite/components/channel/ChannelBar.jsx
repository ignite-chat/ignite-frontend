import {
  Bell,
  Chats,
  Hash,
  MagnifyingGlass,
  PushPin,
  Question,
  SpeakerHigh,
  Tray,
  User,
  Users,
} from '@phosphor-icons/react';
import SearchModal from '../modals/SearchModal';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext } from '../../contexts/ChannelContext';
import { ChannelType } from '@/ignite/constants/ChannelType';
import Avatar from '../Avatar';
import { useUsersStore } from '@/ignite/store/users.store';
import { useModalStore } from '../../store/modal.store';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import UserProfileModal from '../modals/UserProfileModal';

const IconButton = ({ icon, tooltipText, onClick }) => {
  const iconClassName = 'size-6 cursor-pointer text-gray-400 hover:text-gray-200';

  let iconEl;

  switch (icon) {
    case 'bell':
      iconEl = <Bell className={iconClassName} />;
      break;
    case 'threads':
      iconEl = <Chats className={iconClassName} />;
      break;
    case 'hashtag':
      iconEl = <Hash className={iconClassName} />;
      break;
    case 'pin':
      iconEl = <PushPin className={iconClassName} />;
      break;
    case 'question':
      iconEl = <Question className={iconClassName} />;
      break;
    case 'inbox':
      iconEl = <Tray className={iconClassName} />;
      break;
    case 'user-profile':
      iconEl = <User className={iconClassName} weight="fill" />;
      break;
    case 'users':
      iconEl = <Users className={iconClassName} />;
      break;
    case 'search':
      iconEl = <MagnifyingGlass className={iconClassName} />;
      break;
    default:
      break;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex h-6 items-center justify-center"
        >
          {iconEl}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};

const ChannelBar = ({ channel, onJumpToMessage }) => {
  const { guildId } = useGuildContext();
  const { memberListOpen, setMemberListOpen } = useChannelContext();
  const currentUser = useUsersStore().getCurrentUser();
  const otherRecipient =
    channel?.type === ChannelType.DM
      ? (channel.recipients || []).find((r) => r.id !== currentUser?.id)
      : {};

  const openRecipientProfile = () => {
    if (otherRecipient?.id) {
      useModalStore.getState().push(UserProfileModal, { userId: otherRecipient.id });
    }
  };

  return (
    <>
      <div className="relative">
        <div className="relative flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <div className="relative flex min-w-0 flex-auto items-center overflow-hidden">
            {channel?.type === ChannelType.DM ? (
              <>
                <Avatar user={otherRecipient} className="mr-2" size={24} showStatus showOffline />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1
                      onClick={openRecipientProfile}
                      className="cursor-pointer truncate text-sm font-semibold text-gray-100 sm:text-base"
                    >
                      {otherRecipient?.name}
                    </h1>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{otherRecipient?.username}</TooltipContent>
                </Tooltip>
              </>
            ) : channel?.type === ChannelType.GUILD_VOICE ? (
              <>
                <SpeakerHigh className="mr-2 size-5 text-gray-500 sm:size-6" />
                <h1 className="truncate text-sm font-semibold text-gray-100 sm:text-base">
                  {channel?.name}
                </h1>
              </>
            ) : (
              <>
                <Hash className="mr-2 size-5 text-gray-500 sm:size-6" />
                <h1 className="truncate text-sm font-semibold text-gray-100 sm:text-base">
                  {channel?.name}
                </h1>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {channel?.type !== ChannelType.GUILD_VOICE && (
              <IconButton
                icon={channel?.type === ChannelType.DM ? 'user-profile' : 'users'}
                tooltipText={channel?.type === ChannelType.DM ? 'Show User Profile' : 'Show Member List'}
                onClick={() => setMemberListOpen(!memberListOpen)}
              />
            )}
            {channel?.type !== ChannelType.GUILD_VOICE && (
              <IconButton icon="search" tooltipText="Search" onClick={() => useModalStore.getState().push(SearchModal, { channel, onPick: onJumpToMessage })} />
            )}
          </div>
        </div>
      </div>

    </>
  );
};

export default ChannelBar;
