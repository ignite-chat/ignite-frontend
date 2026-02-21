import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordStore } from '../store/discord.store';
import { DiscordService } from '../services/discord.service';

const getDMDisplayInfo = (channel, currentUserId) => {
  const recipients = channel.recipients || [];

  if (channel.type === 3) {
    // Group DM
    const name = channel.name || recipients.map((r) => r.global_name || r.username).join(', ');
    const icon = channel.icon
      ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64`
      : null;
    return { name, icon, isGroup: true, recipients };
  }

  // 1-on-1 DM — find the other user
  const other = recipients.find((r) => r.id !== currentUserId) || recipients[0];
  if (!other) return { name: 'Unknown User', icon: null, isGroup: false, recipients };

  return {
    name: other.global_name || other.username,
    icon: DiscordService.getUserAvatarUrl(other.id, other.avatar, 64),
    isGroup: false,
    recipients,
    user: other,
  };
};

const DMChannelItem = ({ channel, isActive, currentUserId }) => {
  const info = useMemo(
    () => getDMDisplayInfo(channel, currentUserId),
    [channel, currentUserId]
  );

  return (
    <Link
      to={`/discord/@me/${channel.id}`}
      className={cn(
        'flex items-center gap-3 rounded-md px-2 py-2 transition-colors',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      )}
    >
      {info.icon ? (
        <img
          src={info.icon}
          alt={info.name}
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-sm font-medium text-white">
          {info.isGroup ? info.recipients.length : info.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{info.name}</div>
        {info.isGroup && (
          <div className="truncate text-xs text-gray-500">
            {info.recipients.length} members
          </div>
        )}
      </div>
    </Link>
  );
};

const DiscordDMSidebar = () => {
  const { channelId } = useParams();
  const currentUser = useDiscordStore((s) => s.user);
  const channels = useDiscordChannelsStore((s) => s.channels);

  const dmChannels = useMemo(() => {
    return channels
      .filter((c) => c.type === 1 || c.type === 3)
      .sort((a, b) => {
        // Sort by last_message_id descending (most recent first)
        if (!a.last_message_id && !b.last_message_id) return 0;
        if (!a.last_message_id) return 1;
        if (!b.last_message_id) return -1;
        return a.last_message_id > b.last_message_id ? -1 : 1;
      });
  }, [channels]);

  return (
    <aside className="flex w-80 cursor-default select-none flex-col bg-[#121214]">
      <div className="flex h-12 shrink-0 items-center border-b border-white/5 px-4 shadow-sm">
        <span className="text-sm font-semibold text-white">Discord DMs</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-2 flex cursor-default select-none items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Direct Messages — {dmChannels.length}
        </div>

        <div className="space-y-0.5">
          {dmChannels.map((channel) => (
            <DMChannelItem
              key={channel.id}
              channel={channel}
              isActive={channelId === channel.id}
              currentUserId={currentUser?.id}
            />
          ))}
        </div>

        {dmChannels.length === 0 && (
          <div className="px-2 pt-4 text-center text-sm text-gray-500">
            No conversations yet.
          </div>
        )}
      </div>
    </aside>
  );
};

export default DiscordDMSidebar;
