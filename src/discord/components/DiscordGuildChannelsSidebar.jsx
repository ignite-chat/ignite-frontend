import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hash, SpeakerHigh, CaretDown, CaretRight, Megaphone, BookBookmark, MicrophoneStage, ChatsTeardrop, CheckSquare, LockKey, MicrophoneSlash, SpeakerSlash, VideoCamera } from '@phosphor-icons/react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { DiscordService } from '../services/discord.service';
import { DiscordGatewayService } from '../services/discord-gateway.service';
import { computeChannelPermissions } from '../utils/permissions';
import { VIEW_CHANNEL, CONNECT } from '../constants/permissions';
import { useDiscordHasPermission } from '../hooks/useDiscordPermission';
import { scrollPositions } from '@/store/last-channel.store';
import { useDiscordTypingStore } from '../store/discord-typing.store';
import { useDiscordVoiceStatesStore } from '../store/discord-voice-states.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useModalStore } from '@/store/modal.store';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import DiscordUserContextMenu from './context-menus/DiscordUserContextMenu';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AvatarStack from '@/components/ui/avatar-stack';
import TypingDots from '@/components/ui/typing-dots';

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

const ChannelIcon = ({ type, isRules, isLocked, className }) => {
  if (isRules) return <CheckSquare className={className} weight='fill' />;
  //if (isLocked) return <LockKey className={className} weight='fill' />;
  switch (type) {
    case DiscordChannelType.GUILD_VOICE:
      return <SpeakerHigh className={className} weight='fill' />;
    case DiscordChannelType.GUILD_STAGE_VOICE:
      return <MicrophoneStage className={className} weight='fill' />;
    case DiscordChannelType.GUILD_ANNOUNCEMENT:
      return <Megaphone className={`${className} -scale-x-100`} weight='fill' />;
    case DiscordChannelType.GUILD_FORUM:
      return <ChatsTeardrop className={className} weight='fill' />;
    default:
      return <Hash className={className} />;
  }
};

const VoiceStatusIcon = ({ icon: Icon, color, label }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Icon className={`size-4 ${color}`} weight="fill" />
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
  </Tooltip>
);

const VoiceChannelMembers = ({ guildId, channelId }) => {
  const guildVoiceStates = useDiscordVoiceStatesStore((s) => s.voiceStates[guildId] || {});
  const users = useDiscordUsersStore((s) => s.users);
  const guildMembers = useDiscordMembersStore((s) => s.members[guildId] || {});
  const members = useMemo(() => {
    return Object.values(guildVoiceStates).filter((vs) => vs.channel_id === channelId);
  }, [guildVoiceStates, channelId]);

  // Request member info for unknown users
  useEffect(() => {
    if (members.length === 0) return;
    const unknownIds = members
      .filter((vs) => !vs.member?.user && !users[vs.user_id])
      .map((vs) => vs.user_id);
    if (unknownIds.length > 0) {
      DiscordGatewayService.requestGuildMembers(guildId, unknownIds);
    }
  }, [members, users, guildId]);

  if (members.length === 0) return null;

  return (
    <div className="ml-8 mr-2 flex flex-col gap-0.5">
      {members.map((vs) => {
        const memberData = guildMembers[vs.user_id];
        const user = vs.member?.user || users[vs.user_id];
        const displayName = vs.member?.nick || memberData?.nick || user?.global_name || user?.username || 'Unknown';
        const avatarUrl = DiscordService.getUserAvatarUrl(vs.user_id, user?.avatar, 32);

        const openProfile = () => {
          if (!user) return;
          useModalStore.getState().push(DiscordUserProfileModal, {
            author: user,
            member: memberData || vs.member,
            guildId,
          });
        };

        return (
          <ContextMenu key={vs.user_id}>
            <ContextMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={openProfile}
                className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1 text-gray-500 hover:bg-white/5 hover:text-white"
              >
                <img src={avatarUrl} alt="" className="size-6 rounded-full" />
                <span className="flex-1 truncate text-[13px]">{displayName}</span>
                <span className="flex items-center gap-0.5">
                  {vs.self_video && <VoiceStatusIcon icon={VideoCamera} color="text-gray-500" label="Video" />}
                  {vs.suppress && <VoiceStatusIcon icon={MicrophoneSlash} color="text-red-500" label="Suppressed" />}
                  {vs.self_mute && !vs.mute && <VoiceStatusIcon icon={MicrophoneSlash} color="text-gray-500" label="Muted" />}
                  {vs.mute && <VoiceStatusIcon icon={MicrophoneSlash} color="text-red-500" label="Server Muted" />}
                  {vs.self_deaf && !vs.deaf && <VoiceStatusIcon icon={SpeakerSlash} color="text-gray-500" label="Deafened" />}
                  {vs.deaf && <VoiceStatusIcon icon={SpeakerSlash} color="text-red-500" label="Server Deafened" />}
                </span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <DiscordUserContextMenu
                author={user || { id: vs.user_id, username: displayName }}
                guildId={guildId}
                onViewProfile={openProfile}
              />
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
};

const DiscordChannelRow = ({ channel, isActive, joinedAtMs, rulesChannelId }) => {
  const canView = channel._canView !== false;
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const entry = readStates[channel.id];
  const isVoiceChannel = channel.type === DiscordChannelType.GUILD_VOICE || channel.type === DiscordChannelType.GUILD_STAGE_VOICE;
  const canConnect = useDiscordHasPermission(channel.guild_id, isVoiceChannel ? channel : undefined, CONNECT);
  const typingUsers = useDiscordTypingStore((s) => s.typing[channel.id] || []);
  const guildVoiceStates = useDiscordVoiceStatesStore((s) => isVoiceChannel ? (s.voiceStates[channel.guild_id] || {}) : {});
  const voiceUserCount = useMemo(() => {
    if (!isVoiceChannel) return 0;
    return Object.values(guildVoiceStates).filter((vs) => vs.channel_id === channel.id).length;
  }, [isVoiceChannel, guildVoiceStates, channel.id]);

  const isUnread =
    canView &&
    !isActive &&
    !!channel.last_message_id &&
    (() => {
      if (channel.type == DiscordChannelType.GUILD_VOICE || channel.type == DiscordChannelType.GUILD_STAGE_VOICE) {
        return false;
      }

      if (entry?.last_message_id) {
        return BigInt(channel.last_message_id) > BigInt(entry.last_message_id);
      }
      // No read state — only unread if the last message came after user joined
      if (!joinedAtMs) return false;
      return snowflakeToTimestamp(channel.last_message_id) > joinedAtMs;
    })();
  const mentionCount = canView ? (entry?.mention_count ?? 0) : 0;
  const showTyping = canView && !isVoiceChannel && typingUsers.length > 0 && !mentionCount;

  const Wrapper = canView ? Link : 'div';
  const wrapperProps = canView
    ? { to: `/discord/${channel.guild_id}/${channel.id}`, draggable: 'false' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${
        !canView
          ? 'cursor-not-allowed text-gray-600 opacity-50'
          : isActive
            ? 'bg-white/[0.11] text-gray-100'
            : isUnread
              ? 'text-white hover:bg-white/5'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-100'
      }`}
    >
      {/* Unread pill on the left edge */}
      {isUnread && (
        <div className="absolute -left-1 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}
      <ChannelIcon
        type={channel.type}
        isRules={channel.id === rulesChannelId}
        isLocked={!canView || (isVoiceChannel && !canConnect)}
        className={`size-5 shrink-0 ${!canView ? 'text-gray-600' : isActive ? 'text-gray-200' : isUnread ? 'text-white' : 'text-gray-500'}`}
      />
      <p
        className={`ml-1 select-none truncate text-base ${showTyping ? '' : 'flex-1'} ${
          !canView ? 'font-medium' : isActive ? 'font-semibold text-white' : isUnread ? 'font-semibold' : 'font-medium'
        }`}
      >
        {channel.name}
      </p>
      {showTyping && (
        <span className="ml-auto flex items-center gap-1">
          <AvatarStack
            avatars={typingUsers.map((u) => ({
              key: u.user_id,
              src: DiscordService.getUserAvatarUrl(u.user_id, u.avatar, 32),
            }))}
            maxVisible={3}
            size={16}
          />
          <TypingDots />
        </span>
      )}
      {mentionCount > 0 && (
        <div className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
          {mentionCount > 99 ? '99+' : mentionCount}
        </div>
      )}
      {isVoiceChannel && !!channel.user_limit && (
        <span className="ml-auto flex items-center overflow-hidden rounded-full text-[11px] font-medium leading-none">
          <span className={`px-1.5 py-1 ${voiceUserCount >= channel.user_limit ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}`}>
            {String(voiceUserCount).padStart(2, '0')}
          </span>
          <span className="bg-white/5 px-1.5 py-1 text-gray-500">
            {String(channel.user_limit).padStart(2, '0')}
          </span>
        </span>
      )}
    </Wrapper>
  );
};

const DiscordCategory = ({ category, channels, activeChannelId, joinedAtMs, rulesChannelId }) => {
  const [expanded, setExpanded] = useState(true);

  const sortedChannels = useMemo(() => {
    const isVoice = (c) =>
      c.type === DiscordChannelType.GUILD_VOICE || c.type === DiscordChannelType.GUILD_STAGE_VOICE;

    return [...channels]
      .filter(
        (c) =>
          c.parent_id === category?.id &&
          c.type !== DiscordChannelType.GUILD_CATEGORY
      )
      .sort((a, b) => {
        const aVoice = isVoice(a) ? 1 : 0;
        const bVoice = isVoice(b) ? 1 : 0;
        if (aVoice !== bVoice) return aVoice - bVoice;
        return (a.position ?? 0) - (b.position ?? 0);
      });
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

      {sortedChannels.map((channel) => {
        const isVoice = channel.type === DiscordChannelType.GUILD_VOICE || channel.type === DiscordChannelType.GUILD_STAGE_VOICE;
        return (
          <div
            key={channel.id}
            className={!expanded && channel.id !== activeChannelId ? 'hidden' : ''}
          >
            <DiscordChannelRow
              channel={channel}
              isActive={channel.id === activeChannelId}
              joinedAtMs={joinedAtMs}
              rulesChannelId={rulesChannelId}
            />
            {isVoice && <VoiceChannelMembers guildId={channel.guild_id} channelId={channel.id} />}
          </div>
        );
      })}
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
  const guildRoles = guild?.roles || guild?.properties?.roles || [];
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

    return allGuildChannels.map((c) => {
      if (c.type === DiscordChannelType.GUILD_CATEGORY) return { ...c, _canView: true };
      const perms = computeChannelPermissions(c, memberRoleIds, guildRoles, guildId, guildOwnerId, userId);
      return { ...c, _canView: (perms & VIEW_CHANNEL) === VIEW_CHANNEL };
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

  const rulesChannelId = guild?.rules_channel_id || guild?.properties?.rules_channel_id;
  const iconUrl = DiscordService.getGuildIconUrl(guild?.id, guild?.properties?.icon, 64);

  return (
    <div className="relative top-0 flex h-full min-w-[240px] flex-col bg-[#121214] text-gray-100">
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pb-24" ref={sidebarRef} onScroll={onSidebarScroll}>
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
              .sort((a, b) => {
                const aVoice = (a.type === DiscordChannelType.GUILD_VOICE || a.type === DiscordChannelType.GUILD_STAGE_VOICE) ? 1 : 0;
                const bVoice = (b.type === DiscordChannelType.GUILD_VOICE || b.type === DiscordChannelType.GUILD_STAGE_VOICE) ? 1 : 0;
                if (aVoice !== bVoice) return aVoice - bVoice;
                return (a.position ?? 0) - (b.position ?? 0);
              })
              .map((channel) => {
                const isVoice = channel.type === DiscordChannelType.GUILD_VOICE || channel.type === DiscordChannelType.GUILD_STAGE_VOICE;
                return (
                  <div key={channel.id}>
                    <DiscordChannelRow
                      channel={channel}
                      isActive={channel.id === channelId}
                      joinedAtMs={joinedAtMs}
                      rulesChannelId={rulesChannelId}
                    />
                    {isVoice && <VoiceChannelMembers guildId={channel.guild_id} channelId={channel.id} />}
                  </div>
                );
              })}
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
            rulesChannelId={rulesChannelId}
          />
        ))}
      </div>
    </div>
  );
};

export default DiscordGuildChannelsSidebar;
