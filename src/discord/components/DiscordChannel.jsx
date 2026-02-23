import { useMemo } from 'react';
import { At, Hash } from '@phosphor-icons/react';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { DiscordService } from '../services/discord.service';
import DiscordChannelMessages from './DiscordChannelMessages';
import DiscordChannelInput from './DiscordChannelInput';

const DiscordChannel = ({ channel }) => {
  const currentUser = useDiscordStore((s) => s.user);
  const usersMap = useDiscordUsersStore((s) => s.users);

  const isDM = channel?.type === 1 || channel?.type === 3;

  const dmInfo = useMemo(() => {
    if (!isDM || !channel) return null;
    const recipientIds = channel.recipient_ids || [];
    const recipients = recipientIds.map((id) => usersMap[id]).filter(Boolean);

    if (channel.type === 3) {
      // Group DM
      const name = channel.name || recipients.map((r) => r.global_name || r.username).join(', ');
      return { name, icon: null };
    }

    // 1-on-1 DM
    const other = recipients.find((r) => r.id !== currentUser?.id) || recipients[0];
    if (!other) return { name: 'Unknown User', icon: null };

    return {
      name: other.global_name || other.username,
      icon: DiscordService.getUserAvatarUrl(other.id, other.avatar, 32),
    };
  }, [channel, currentUser?.id, isDM, usersMap]);

  if (!channel) return null;

  const displayName = isDM ? dmInfo?.name : channel.name;
  const placeholderName = isDM ? `@${dmInfo?.name}` : `#${channel.name}`;

  return (
    <div className="flex h-full flex-col">
      {/* Channel header bar */}
      <div className="flex h-12 shrink-0 items-center border-b border-white/5 px-4 shadow-sm">
        {isDM ? (
          <>
            {dmInfo?.properties?.icon ? (
              <img
                src={dmInfo.properties?.icon}
                alt={dmInfo.properties?.name}
                className="mr-2 size-6 rounded-full object-cover"
              />
            ) : (
              <At className="mr-1 size-5 text-gray-400" />
            )}
          </>
        ) : (
          <Hash className="mr-1 size-5 text-gray-400" />
        )}
        <span className="font-semibold text-white">{displayName}</span>
        {!isDM && channel.topic && (
          <>
            <div className="mx-3 h-6 w-px bg-white/10" />
            <span className="truncate text-sm text-gray-400">{channel.topic}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <DiscordChannelMessages channel={channel} />

      {/* Input */}
      <DiscordChannelInput channel={channel} channelName={placeholderName} />
    </div>
  );
};

export default DiscordChannel;
