import { At, ChatsTeardrop, Hash } from '@phosphor-icons/react';
import { GUILD_FORUM } from '../constants/channel-types';

const DiscordChannelHeader = ({ channel, displayName, isDM, dmInfo }) => {
  const isForum = channel?.type === GUILD_FORUM;

  const icon = isDM ? (
    dmInfo?.properties?.icon ? (
      <img
        src={dmInfo.properties?.icon}
        alt={dmInfo.properties?.name}
        className="mr-2 size-6 shrink-0 rounded-full object-cover"
      />
    ) : (
      <At className="mr-1 size-5 shrink-0 text-gray-400" />
    )
  ) : isForum ? (
    <ChatsTeardrop className="mr-1 size-5 shrink-0 text-gray-400" weight="fill" />
  ) : (
    <Hash className="mr-1 size-5 shrink-0 text-gray-400" />
  );

  return (
    <div className="flex h-12 shrink-0 items-center overflow-hidden border-b border-white/5 px-4 shadow-sm">
      {icon}
      <span className="shrink-0 whitespace-nowrap font-medium text-white">{displayName || channel?.name}</span>
    </div>
  );
};

export default DiscordChannelHeader;
