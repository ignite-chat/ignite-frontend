import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hash, SpeakerHigh, CaretDown, CaretRight, Megaphone } from '@phosphor-icons/react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { DiscordService } from '../services/discord.service';
import { computeChannelPermissions } from '../utils/permissions';
import { VIEW_CHANNEL } from '../constants/permissions';
import { scrollPositions } from '@/store/last-channel.store';

const DISCORD_EPOCH = 1420070400000;
const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

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

const DiscordChannelRow = ({ channel, isActive, joinedAtMs }) => {
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const entry = readStates[channel.id];

  const isUnread =
    !isActive &&
    !!channel.last_message_id &&
    (() => {
      if (entry?.last_message_id) {
        return BigInt(channel.last_message_id) > BigInt(entry.last_message_id);
      }
      // No read state — only unread if the last message came after user joined
      if (!joinedAtMs) return false;
      return snowflakeToTimestamp(channel.last_message_id) > joinedAtMs;
    })();
  const mentionCount = entry?.mention_count ?? 0;

  return (
    <Link
      to={`/discord/${channel.guild_id}/${channel.id}`}
      className={`group relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${
        isActive
          ? 'bg-white/[0.11] text-gray-100'
          : isUnread
            ? 'text-white hover:bg-white/5'
            : 'text-gray-500 hover:bg-white/5 hover:text-gray-100'
      }`}
      draggable="false"
    >
      {/* Unread pill on the left edge */}
      {isUnread && (
        <div className="absolute -left-1 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}
      <ChannelIcon
        type={channel.type}
        className={`size-5 shrink-0 ${isActive ? 'text-gray-200' : isUnread ? 'text-white' : 'text-gray-500'}`}
      />
      <p
        className={`ml-1 flex-1 select-none truncate text-base ${
          isActive ? 'font-semibold text-white' : isUnread ? 'font-semibold' : 'font-medium'
        }`}
      >
        {channel.name}
      </p>
      {mentionCount > 0 && (
        <div className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
          {mentionCount > 99 ? '99+' : mentionCount}
        </div>
      )}
    </Link>
  );
};

const DiscordCategory = ({ category, channels, activeChannelId, joinedAtMs }) => {
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
            joinedAtMs={joinedAtMs}
          />
        </div>
      ))}
    </div>
  );
};

const DiscordGuildChannelsSidebar = ({ guild }) => {
  const { channelId } = useParams();
  const { channels } = useDiscordChannelsStore();
  const guildMembers = useDiscordGuildsStore((s) => s.guildMembers);
  const currentUser = useDiscordStore((s) => s.user);
  const sidebarRef = useRef();

  const guildId = guild?.id;
  const guildRoles = guild?.roles || [];
  const guildOwnerId = guild?.owner_id || guild?.properties?.owner_id;
  const userId = currentUser?.id;

  const myMember = useMemo(() => {
    const members = guildMembers[guildId] || [];
    return members.find((m) => m.user?.id === userId || m.user_id === userId);
  }, [guildMembers, guildId, userId]);

  const memberRoleIds = myMember?.roles || [];
  const joinedAtMs = useMemo(() => {
    // guild.joined_at comes directly from the READY / GUILD_CREATE payload
    const raw = guild?.joined_at || myMember?.joined_at;
    return raw ? new Date(raw).getTime() : null;
  }, [guild?.joined_at, myMember?.joined_at]);

  const guildChannels = useMemo(() => {
    const allGuildChannels = channels.filter((c) => c.guild_id === guildId);
    if (!userId || guildRoles.length === 0) return allGuildChannels;

    return allGuildChannels.filter((c) => {
      if (c.type === DiscordChannelType.GUILD_CATEGORY) return true;
      const perms = computeChannelPermissions(c, memberRoleIds, guildRoles, guildId, guildOwnerId, userId);
      return (perms & VIEW_CHANNEL) === VIEW_CHANNEL;
    });
  }, [channels, guildId, userId, memberRoleIds, guildRoles, guildOwnerId]);

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

  // Save sidebar scroll position on every scroll
  const onSidebarScroll = useCallback(() => {
    if (guildId && sidebarRef.current) {
      scrollPositions.saveSidebar(guildId, sidebarRef.current.scrollTop);
    }
  }, [guildId]);

  // Restore sidebar scroll position when guild changes
  useEffect(() => {
    if (!guildId) return;
    const saved = scrollPositions.getSidebar(guildId);
    if (saved != null) {
      requestAnimationFrame(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = saved;
        }
      });
    }
  }, [guildId]);

  const iconUrl = DiscordService.getGuildIconUrl(guild?.id, guild?.properties?.icon, 64);

  return (
    <div className="relative top-0 flex h-full min-w-[240px] flex-col bg-[#121214] text-gray-100">
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto" ref={sidebarRef} onScroll={onSidebarScroll}>
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
              {guild?.properties?.name || 'Discord Server'}
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
                  joinedAtMs={joinedAtMs}
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
            joinedAtMs={joinedAtMs}
          />
        ))}
      </div>
    </div>
  );
};

export default DiscordGuildChannelsSidebar;
