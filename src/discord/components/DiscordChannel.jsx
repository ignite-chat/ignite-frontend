import { useMemo, useCallback, useState } from 'react';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { DiscordService } from '../services/discord.service';
import { GUILD_FORUM, DM, GROUP_DM } from '../constants/channel-types';
import DiscordChannelMessages from './DiscordChannelMessages';
import DiscordChannelInput from './DiscordChannelInput';
import DiscordForumView from './DiscordForumView';

const DiscordChannel = ({ channel }) => {
  const currentUser = useDiscordStore((s) => s.user);
  const usersMap = useDiscordUsersStore((s) => s.users);

  const isForum = channel?.type === GUILD_FORUM;
  const isDM = channel?.type === DM || channel?.type === GROUP_DM;

  const dmInfo = useMemo(() => {
    if (!isDM || !channel) return null;
    const recipientIds = channel.recipient_ids || [];
    const recipients = recipientIds.map((id) => usersMap[id]).filter(Boolean);

    if (channel.type === GROUP_DM) {
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

  const [messageSentCount, setMessageSentCount] = useState(0);
  const onMessageSent = useCallback(() => setMessageSentCount((c) => c + 1), []);

  if (!channel) return null;

  if (isForum) {
    return <DiscordForumView channel={channel} />;
  }

  const displayName = isDM ? dmInfo?.name : channel.name;
  const placeholderName = isDM ? `@${dmInfo?.name}` : `#${channel.name}`;

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <DiscordChannelMessages channel={channel} messageSentCount={messageSentCount} />

      {/* Input */}
      <DiscordChannelInput channel={channel} channelName={placeholderName} onMessageSent={onMessageSent} />
    </div>
  );
};

export default DiscordChannel;
