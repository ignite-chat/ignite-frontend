import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hash, SpeakerHigh, CaretDown, CaretRight, Megaphone } from '@phosphor-icons/react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { DiscordService } from '../services/discord.service';

// Discord channel types
const DiscordChannelType = {
  GUILD_TEXT: 0,
  DM: 1,
  GUILD_VOICE: 2,
  GROUP_DM: 3,
  GUILD_CATEGORY: 4,
  GUILD_ANNOUNCEMENT: 5,
  GUILD_STAGE_VOICE: 13,
  GUILD_FORUM: 15,
};

const ChannelIcon = ({ type, className }) => {
  switch (type) {
    case DiscordChannelType.GUILD_VOICE:
    case DiscordChannelType.GUILD_STAGE_VOICE:
      return <SpeakerHigh className={className} />;
    case DiscordChannelType.GUILD_ANNOUNCEMENT:
      return <Megaphone className={className} />;
    default:
      return <Hash className={className} />;
  }
};

const DiscordChannelRow = ({ channel, isActive }) => {
  const isVoice =
    channel.type === DiscordChannelType.GUILD_VOICE ||
    channel.type === DiscordChannelType.GUILD_STAGE_VOICE;

  return (
    <Link
      to={`/discord/${channel.guild_id}/${channel.id}`}
      className={`group relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${
        isActive
          ? 'bg-white/[0.11] text-gray-100'
          : 'text-gray-500 hover:bg-white/5 hover:text-gray-100'
      }`}
      draggable="false"
    >
      <ChannelIcon
        type={channel.type}
        className={`size-5 shrink-0 ${isActive ? 'text-gray-200' : 'text-gray-500'}`}
      />
      <p
        className={`ml-1 flex-1 select-none truncate text-base ${
          isActive ? 'font-semibold text-white' : 'font-medium'
        }`}
      >
        {channel.name}
      </p>
    </Link>
  );
};

const DiscordCategory = ({ category, channels, activeChannelId }) => {
  const [expanded, setExpanded] = useState(true);

  const sortedChannels = useMemo(() => {
    return [...channels]
      .filter(
        (c) =>
          c.parent_id === category?.id &&
          c.type !== DiscordChannelType.GUILD_CATEGORY
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels, category?.id]);

  if (sortedChannels.length === 0) return null;

  return (
    <div className="flex w-full flex-col">
      {category && (
        <button
          type="button"
          className="mb-1 flex items-center pt-4 text-gray-400 hover:text-gray-100"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex w-6 items-center justify-center">
            {expanded ? (
              <CaretDown className="size-2" />
            ) : (
              <CaretRight className="size-2" />
            )}
          </div>
          <span className="text-xs font-bold uppercase">{category.name}</span>
        </button>
      )}

      {sortedChannels.map((channel) => (
        <div
          key={channel.id}
          className={!expanded && channel.id !== activeChannelId ? 'hidden' : ''}
        >
          <DiscordChannelRow
            channel={channel}
            isActive={channel.id === activeChannelId}
          />
        </div>
      ))}
    </div>
  );
};

const DiscordGuildSidebar = ({ guild }) => {
  const { channelId } = useParams();
  const { channels } = useDiscordChannelsStore();

  const guildChannels = useMemo(() => {
    return channels.filter((c) => c.guild_id === guild?.id);
  }, [channels, guild?.id]);

  const categories = useMemo(() => {
    return guildChannels
      .filter((c) => c.type === DiscordChannelType.GUILD_CATEGORY)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [guildChannels]);

  // Channels without a category
  const rootChannels = useMemo(() => {
    return guildChannels.filter(
      (c) =>
        !c.parent_id &&
        c.type !== DiscordChannelType.GUILD_CATEGORY
    );
  }, [guildChannels]);

  const iconUrl = DiscordService.getGuildIconUrl(guild?.id, guild?.icon, 64);

  return (
    <div className="relative top-0 flex h-full min-w-[240px] flex-col bg-[#121214] text-gray-100">
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
        {/* Guild Header */}
        <div className="w-full p-2">
          <div className="flex w-full items-center gap-2 rounded-md px-2 py-1">
            {iconUrl && (
              <img
                src={iconUrl}
                alt=""
                className="size-6 rounded-full"
              />
            )}
            <div className="flex-1 truncate text-base font-semibold">
              {guild?.name || 'Discord Server'}
            </div>
          </div>
        </div>

        <hr className="m-0 w-full border border-t-0 border-white/5 bg-[#121214] p-0" />

        {/* Root channels (no category) */}
        {rootChannels.length > 0 && (
          <div className="flex w-full flex-col">
            {rootChannels
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((channel) => (
                <DiscordChannelRow
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === channelId}
                />
              ))}
          </div>
        )}

        {/* Categorized channels */}
        {categories.map((category) => (
          <DiscordCategory
            key={category.id}
            category={category}
            channels={guildChannels}
            activeChannelId={channelId}
          />
        ))}
      </div>
    </div>
  );
};

export default DiscordGuildSidebar;
