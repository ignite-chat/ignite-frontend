import {
  Bell,
  Chats,
  Hash,
  MagnifyingGlass,
  PushPin,
  Question,
  SpeakerHigh,
  Tray,
  Users,
} from '@phosphor-icons/react';
import { useState } from 'react';
import SearchModal from '../Modals/SearchModal';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext } from '../../contexts/ChannelContext';
import useStore from '@/hooks/useStore';
import { ChannelType } from '@/constants/ChannelType';
import Avatar from '../Avatar';

const Tooltip = ({ text = 'Hello' }) => {
  return (
    <div className="pointer-events-none absolute top-full z-50 mt-1 hidden flex-col items-center group-hover:flex">
      <div className="-mb-2 size-3 rotate-45 bg-black"></div>
      <div className="relative min-w-max rounded bg-black px-3 py-1.5 text-sm text-gray-100 shadow-lg">
        {text}
      </div>
    </div>
  );
};

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
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-6 items-center justify-center"
    >
      {iconEl}
      <Tooltip text={tooltipText} />
    </button>
  );
};

const ChannelBar = ({ channel, onJumpToMessage }) => {
  const { guildId } = useGuildContext();
  const { memberListOpen, setMemberListOpen } = useChannelContext();
  const currentUser = useStore((s) => s.user);
  const otherRecipient =
    channel?.type === ChannelType.DM
      ? (channel.recipients || []).find((r) => r.id !== currentUser?.id)
      : {};

  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <div className="relative flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <div className="relative flex min-w-0 flex-auto items-center overflow-hidden">
            {channel?.type === ChannelType.DM ? (
              <>
                <Avatar user={otherRecipient} className="mr-2 size-8" />
                <h1 className="truncate text-sm font-semibold text-gray-100 sm:text-base">
                  {otherRecipient?.name}
                </h1>
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
            {channel?.type !== ChannelType.DM && channel?.type !== ChannelType.GUILD_VOICE && (
              <IconButton
                icon="users"
                tooltipText="Show Member List"
                onClick={() => setMemberListOpen(!memberListOpen)}
              />
            )}
            {channel?.type !== ChannelType.GUILD_VOICE && (
              <IconButton icon="search" tooltipText="Search" onClick={() => setSearchOpen(true)} />
            )}
          </div>
        </div>
      </div>

      <SearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        channel={channel}
        onPick={onJumpToMessage}
      />
    </>
  );
};

export default ChannelBar;
