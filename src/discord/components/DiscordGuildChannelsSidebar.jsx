import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Hash, SpeakerHigh, CaretDown, CaretRight, Megaphone, BookBookmark, MicrophoneStage, ChatsTeardrop, CheckSquare, LockKey, MicrophoneSlash, SpeakerSlash, VideoCamera } from '@phosphor-icons/react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { useDiscordPreferencesStore } from '../store/discord-preferences.store';
import { useDiscordVoiceStatesStore } from '../store/discord-voice-states.store';
import { useDiscordVoiceStore } from '../store/discord-voice.store';
import { DiscordVoiceService } from '../services/discord-voice.service';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { snowflakeToTimestamp } from '../utils/snowflake';
import { useModalStore } from '@/store/modal.store';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import DiscordUserContextMenu from './context-menus/DiscordUserContextMenu';
import { useContextMenuStore } from '@/store/context-menu.store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { openAttachmentViewModal } from '@/components/modals/AttachmentViewModal';
import AvatarStack from '@/components/ui/avatar-stack';
import TypingDots from '@/components/ui/typing-dots';


const VerifiedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 15.2" className="shrink-0">
    <path
      d="M16,7.6c0-0.79-0.38-1.5-0.97-1.95a3.05,3.05,0,0,0,.09-2.17,3.06,3.06,0,0,0-1.56-1.56,3.05,3.05,0,0,0-2.17.09C10.93.38,10.22,0,9.43,0A2.58,2.58,0,0,0,7.6.97,2.58,2.58,0,0,0,5.77,0c-0.79,0-1.5.38-1.95.97a3.05,3.05,0,0,0-2.17-.09A3.06,3.06,0,0,0,.09,2.44a3.05,3.05,0,0,0,.09,2.17C.38,5.07,0,5.78,0,6.57A2.58,2.58,0,0,0,.97,8.4,2.58,2.58,0,0,0,0,10.23c0,0.79.38,1.5.97,1.95a3.05,3.05,0,0,0-.09,2.17,3.06,3.06,0,0,0,1.56,1.56,3.05,3.05,0,0,0,2.17-.09A2.58,2.58,0,0,0,6.57,16.8a2.58,2.58,0,0,0,1.83-.97A2.58,2.58,0,0,0,10.23,16.8c0.79,0,1.5-.38,1.95-.97a3.05,3.05,0,0,0,2.17.09,3.06,3.06,0,0,0,1.56-1.56,3.05,3.05,0,0,0-.09-2.17c0.59-.45.97-1.16.97-1.95A2.58,2.58,0,0,0,16,8.4,2.58,2.58,0,0,0,16,7.6Z"
      fill="#23a559"
    />
    <path
      d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z"
      fill="white"
    />
  </svg>
);

const PartneredIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 15.2" className="shrink-0">
    <path
      d="M16,7.6c0-0.79-0.38-1.5-0.97-1.95a3.05,3.05,0,0,0,.09-2.17,3.06,3.06,0,0,0-1.56-1.56,3.05,3.05,0,0,0-2.17.09C10.93.38,10.22,0,9.43,0A2.58,2.58,0,0,0,7.6.97,2.58,2.58,0,0,0,5.77,0c-0.79,0-1.5.38-1.95.97a3.05,3.05,0,0,0-2.17-.09A3.06,3.06,0,0,0,.09,2.44a3.05,3.05,0,0,0,.09,2.17C.38,5.07,0,5.78,0,6.57A2.58,2.58,0,0,0,.97,8.4,2.58,2.58,0,0,0,0,10.23c0,0.79.38,1.5.97,1.95a3.05,3.05,0,0,0-.09,2.17,3.06,3.06,0,0,0,1.56,1.56,3.05,3.05,0,0,0,2.17-.09A2.58,2.58,0,0,0,6.57,16.8a2.58,2.58,0,0,0,1.83-.97A2.58,2.58,0,0,0,10.23,16.8c0.79,0,1.5-.38,1.95-.97a3.05,3.05,0,0,0,2.17.09,3.06,3.06,0,0,0,1.56-1.56,3.05,3.05,0,0,0-.09-2.17c0.59-.45.97-1.16.97-1.95A2.58,2.58,0,0,0,16,8.4,2.58,2.58,0,0,0,16,7.6Z"
      fill="#5865f2"
    />
    <path
      d="M10.5,6.5L8,9.5L5.5,7.5"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const DiscordGuildHeader = memo(({ guild }) => {
  const showGuildBanners = useDiscordPreferencesStore((s) => s.showGuildBanners);
  const props = guild?.properties || guild || {};
  const name = props.name || 'Discord Server';
  const features = props.features || guild?.features || [];
  const isVerified = features.includes('VERIFIED');
  const isPartnered = features.includes('PARTNERED');
  const premiumFeatures = props.premium_features?.features || [];
  const hasBannerFeature = premiumFeatures.includes('BANNER');
  const bannerHash = hasBannerFeature ? (props.banner || props.splash) : null;
  const bannerUrl = showGuildBanners && bannerHash
    ? `https://cdn.discordapp.com/banners/${guild?.id}/${bannerHash}.${bannerHash.startsWith('a_') ? 'gif' : 'png'}?size=480`
    : null;

  return (
    <div className="group/header relative shrink-0">
      {bannerUrl ? (
        <>
          <div className="relative h-32 overflow-hidden">
            <img
              src={bannerUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable="false"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
          </div>
          {/* Header bar overlaid on top of banner */}
          <button
            type="button"
            className="absolute inset-x-0 top-0 flex h-12 items-center justify-between gap-2 px-4 transition-all duration-200 group-hover/header:border-b group-hover/header:border-white/10 group-hover/header:backdrop-blur-sm group-hover/header:backdrop-brightness-50"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {isVerified && <VerifiedIcon />}
              {!isVerified && isPartnered && <PartneredIcon />}
              <span className="truncate text-[16px] font-medium text-white drop-shadow-sm">
                {name}
              </span>
            </div>
            <CaretDown size={12} weight="bold" className="shrink-0 text-white" />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between gap-2 border-b border-white/5 px-4 transition-colors hover:bg-white/5"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {isVerified && <VerifiedIcon />}
            {!isVerified && isPartnered && <PartneredIcon />}
            <span className="truncate text-[16px] font-medium text-white">
              {name}
            </span>
          </div>
          <CaretDown size={12} weight="bold" className="shrink-0 text-white" />
        </button>
      )}
    </div>
  );
});

DiscordGuildHeader.displayName = 'DiscordGuildHeader';

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

const isVoiceType = (type) =>
  type === DiscordChannelType.GUILD_VOICE || type === DiscordChannelType.GUILD_STAGE_VOICE;

const ChannelIcon = ({ type, isRules, isLocked, className }) => {
  // if (isRules) return <CheckSquare className={className} weight='fill' />;
  switch (type) {
    case DiscordChannelType.GUILD_VOICE:
      return <SpeakerHigh className={className} weight='fill' />;
    case DiscordChannelType.GUILD_STAGE_VOICE:
      return <MicrophoneStage className={className} weight='fill' />;
    // case DiscordChannelType.GUILD_ANNOUNCEMENT:
    //   return <Megaphone className={`${className} -scale-x-100`} weight='fill' />;
    case DiscordChannelType.GUILD_FORUM:
      return <ChatsTeardrop className={className} weight='fill' />;
    default:
      return <Hash className={className} weight="bold" />;
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

const VoiceMemberRow = memo(({ vs, guildId, channelId, user, memberData, displayName, avatarUrl, openProfile }) => {
  const isMuted = vs.self_mute || vs.mute || vs.self_deaf || vs.deaf || vs.suppress;
  const isSpeaking = useDiscordVoiceStore((s) => s.speakingUsers.has(vs.user_id)) && !isMuted;
  const [hovered, setHovered] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const hoverTimerRef = useRef(null);

  const fetchPreview = useCallback(() => {
    const streamKey = encodeURIComponent(`guild:${guildId}:${channelId}:${vs.user_id}`);
    const url = `https://discord.com/api/v9/streams/${streamKey}/preview?version=${Date.now()}`;
    const token = useDiscordStore.getState().token;

    setLoading(true);
    fetch(url, { headers: { Authorization: token } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data?.url) setPreviewUrl(data.url);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [guildId, channelId, vs.user_id]);

  const leaveTimerRef = useRef(null);

  const enterHover = () => {
    clearTimeout(leaveTimerRef.current);
    if (!vs.self_stream || hovered) return;
    hoverTimerRef.current = setTimeout(() => {
      setHovered(true);
      fetchPreview();
      intervalRef.current = setInterval(fetchPreview, 5000);
    }, 300);
  };

  const leaveHover = () => {
    clearTimeout(hoverTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setHovered(false);
    }, 100);
  };

  const handlePopoverEnter = () => {
    clearTimeout(leaveTimerRef.current);
  };

  const handlePopoverLeave = () => {
    leaveHover();
  };

  useEffect(() => () => {
    clearTimeout(hoverTimerRef.current);
    clearTimeout(leaveTimerRef.current);
    clearInterval(intervalRef.current);
  }, []);

  const handleContextMenu = (e) => {
    useContextMenuStore.getState().open(DiscordUserContextMenu, {
      author: user || { id: vs.user_id, username: displayName },
      guildId,
      onViewProfile: openProfile,
    }, e);
  };

  return (
    <Popover open={!!vs.self_stream && hovered}>
      <PopoverTrigger asChild>
        <div
          onClick={openProfile}
          onContextMenu={handleContextMenu}
          onMouseEnter={enterHover}
          onMouseLeave={leaveHover}
          className="ml-8 mr-2 flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1 text-gray-500 font-medium outline-none hover:bg-white/5 hover:text-white"
        >
          <img src={avatarUrl} alt="" className={`size-6 rounded-full ${isSpeaking ? 'ring-2 ring-green-500' : ''}`} />
          <span className="flex-1 truncate text-[13px]">{displayName}</span>
          <span className="flex items-center gap-1.5">
            {vs.self_video && <VoiceStatusIcon icon={VideoCamera} color="text-gray-500" label="Video" />}
            {vs.suppress && <VoiceStatusIcon icon={MicrophoneSlash} color="text-red-500" label="Suppressed" />}
            {vs.self_mute && !vs.mute && <VoiceStatusIcon icon={MicrophoneSlash} color="text-gray-500" label="Muted" />}
            {vs.mute && <VoiceStatusIcon icon={MicrophoneSlash} color="text-red-500" label="Server Muted" />}
            {vs.self_deaf && !vs.deaf && <VoiceStatusIcon icon={SpeakerSlash} color="text-gray-500" label="Deafened" />}
            {vs.deaf && <VoiceStatusIcon icon={SpeakerSlash} color="text-red-500" label="Server Deafened" />}
            {vs.self_stream && (
              <span className="rounded bg-[#ed4245] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                LIVE
              </span>
            )}
          </span>
        </div>
      </PopoverTrigger>
      {vs.self_stream && (
        <PopoverContent
          side="right"
          align="start"
          alignOffset={-10}
          className="w-auto overflow-hidden rounded-lg border-none bg-[#111214] p-0 shadow-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Stream preview"
              className="block h-auto w-[280px] cursor-pointer rounded-lg"
              draggable={false}
              onClick={() => openAttachmentViewModal(previewUrl)}
            />
          ) : (
            <div className="flex h-[160px] w-[280px] items-center justify-center text-xs text-gray-500">
              {loading ? 'Loading preview...' : 'No preview available'}
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
});

const TextChannelRow = memo(({ channel, isActive, joinedAtMs, rulesChannelId }) => {
  const canView = channel._canView !== false;
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const entry = readStates[channel.id];
  const typingUsers = useDiscordTypingStore((s) => s.typing[channel.id] || []);

  const isUnread =
    canView &&
    !isActive &&
    !!channel.last_message_id &&
    (() => {
      if (entry?.last_message_id) {
        return BigInt(channel.last_message_id) > BigInt(entry.last_message_id);
      }
      if (!joinedAtMs) return false;
      return snowflakeToTimestamp(channel.last_message_id) > joinedAtMs;
    })();
  const mentionCount = canView ? (entry?.mention_count ?? 0) : 0;
  const showTyping = canView && typingUsers.length > 0 && !mentionCount;

  const Wrapper = canView ? Link : 'div';
  const wrapperProps = canView
    ? { to: `/discord/${channel.guild_id}/${channel.id}`, draggable: 'false' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${!canView
          ? 'cursor-not-allowed text-gray-600 opacity-50'
          : isActive
            ? 'bg-white/[0.11] text-gray-100'
            : isUnread
              ? 'text-white hover:bg-white/5'
              : 'cursor-pointer text-gray-500 hover:bg-white/5 hover:text-gray-100'
        }`}
    >
      {isUnread && (
        <div className="absolute -left-1 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}
      <ChannelIcon
        type={channel.type}
        isRules={channel.id === rulesChannelId}
        isLocked={!canView}
        className={`size-5 shrink-0 ${!canView ? 'text-gray-600' : isActive ? 'text-gray-200' : isUnread ? 'text-white' : 'text-gray-500'}`}
      />
      <p
        className={`ml-1 select-none truncate text-base font-medium ${showTyping ? '' : 'flex-1'} ${!canView ? '' : isActive ? 'text-white' : isUnread ? '' : ''}`}
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
    </Wrapper>
  );
});

const formatElapsed = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const useElapsedTime = (unixSeconds) => {
  const sinceMs = unixSeconds ? unixSeconds * 1000 : null;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!sinceMs) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sinceMs]);
  if (!sinceMs) return null;
  return formatElapsed(now - sinceMs);
};

const VoiceChannelRow = memo(({ channel, guildName }) => {
  const navigate = useNavigate();
  const canView = channel._canView !== false;
  const canConnect = useDiscordHasPermission(channel.guild_id, channel, CONNECT);
  const guildVoiceStates = useDiscordVoiceStatesStore((s) => s.voiceStates[channel.guild_id] || {});
  const voiceConnectedChannelId = useDiscordVoiceStore((s) => s.channelId);
  const isVoiceConnected = voiceConnectedChannelId === channel.id;
  const startTime = useDiscordChannelsStore(
    (s) => s.channels.find((c) => c.id === channel.id)?.voice_start_time,
  );
  const voiceUserCount = useMemo(() => {
    return Object.values(guildVoiceStates).filter((vs) => vs.channel_id === channel.id).length;
  }, [guildVoiceStates, channel.id]);
  const elapsed = useElapsedTime(voiceUserCount > 0 ? startTime : null);

  const handleVoiceClick = () => {
    if (!canView) return;
    // Navigate to the voice channel view
    navigate(`/discord/${channel.guild_id}/${channel.id}`);
  };

  const isClickable = canView;

  return (
    <div
      onClick={handleVoiceClick}
      role="button"
      className={`group relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${!isClickable
          ? 'cursor-not-allowed text-gray-600 opacity-50'
          : isVoiceConnected
            ? 'bg-white/[0.11] text-gray-100'
            : 'cursor-pointer text-gray-500 hover:bg-white/5 hover:text-gray-100'
        }`}
    >
      <ChannelIcon
        type={channel.type}
        isLocked={!canView || !canConnect}
        className={`size-5 shrink-0 ${!canView ? 'text-gray-600' : voiceUserCount > 0 ? 'text-[#57d163]' : 'text-gray-500'}`}
      />
      <p className="ml-1 flex-1 select-none truncate text-base font-medium">{channel.name}</p>
      {elapsed && (
        <span className="ml-auto mr-1 text-[11px] tabular-nums text-gray-500">{elapsed}</span>
      )}
      {!!channel.user_limit && (
        <span className={`${elapsed ? '' : 'ml-auto'} flex items-center overflow-hidden rounded-full text-[11px] font-medium leading-none`}>
          <span
            className={`px-1.5 py-1 ${voiceUserCount >= channel.user_limit ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}`}
          >
            {String(voiceUserCount).padStart(2, '0')}
          </span>
          <span className="bg-white/5 px-1.5 py-1 text-gray-500">
            {String(channel.user_limit).padStart(2, '0')}
          </span>
        </span>
      )}
    </div>
  );
});

const DiscordChannelRow = memo(({ channel, isActive, joinedAtMs, rulesChannelId, guildName }) => {
  if (isVoiceType(channel.type)) {
    return <VoiceChannelRow channel={channel} guildName={guildName} />;
  }
  return (
    <TextChannelRow
      channel={channel}
      isActive={isActive}
      joinedAtMs={joinedAtMs}
      rulesChannelId={rulesChannelId}
    />
  );
});

// Item height estimates for the virtualizer
const CATEGORY_HEADER_HEIGHT = 36;
const CHANNEL_ROW_HEIGHT = 32;
const VOICE_MEMBER_HEIGHT = 30;

const resolveVoiceMemberName = (vs, users, memberStore) => {
  const memberUser = vs.member?.user;
  return (
    vs.member?.nick ||
    memberStore[vs.user_id]?.nick ||
    users[vs.user_id]?.global_name ||
    memberUser?.global_name ||
    users[vs.user_id]?.username ||
    memberUser?.username ||
    ''
  ).toLowerCase();
};

const sortVoiceMembers = (members, users, memberStore) => {
  return [...members].sort((a, b) => {
    const aLive = a.self_stream ? 0 : 1;
    const bLive = b.self_stream ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return resolveVoiceMemberName(a, users, memberStore).localeCompare(
      resolveVoiceMemberName(b, users, memberStore),
    );
  });
};

const sortChannels = (channels) => {
  return [...channels].sort((a, b) => {
    const aVoice = isVoiceType(a.type) ? 1 : 0;
    const bVoice = isVoiceType(b.type) ? 1 : 0;
    if (aVoice !== bVoice) return aVoice - bVoice;
    return (a.position ?? 0) - (b.position ?? 0);
  });
};

const DiscordGuildChannelsSidebar = ({ guild }) => {
  const { channelId } = useParams();
  const { channels } = useDiscordChannelsStore();
  const guildMembers = useDiscordGuildsStore((s) => s.guildMembers);
  const currentUser = useDiscordStore((s) => s.user);
  const sidebarRef = useRef();
  const showHiddenChannels = useDiscordPreferencesStore((s) => s.showHiddenChannels);
  const guildVoiceStates = useDiscordVoiceStatesStore((s) => s.voiceStates[guild?.id] || {});
  const users = useDiscordUsersStore((s) => s.users);
  const memberStore = useDiscordMembersStore((s) => s.members[guild?.id] || {});

  // Track collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const toggleCategory = useCallback((categoryId) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

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

  // Build voice members lookup: channelId -> voiceState[]
  const voiceMembersByChannel = useMemo(() => {
    const map = {};
    for (const vs of Object.values(guildVoiceStates)) {
      if (!vs.channel_id) continue;
      if (!map[vs.channel_id]) map[vs.channel_id] = [];
      map[vs.channel_id].push(vs);
    }
    return map;
  }, [guildVoiceStates]);

  // Request member info for unknown voice users
  useEffect(() => {
    const allVoiceMembers = Object.values(guildVoiceStates);
    if (allVoiceMembers.length === 0 || !guildId) return;
    const unknownIds = allVoiceMembers
      .filter((vs) => !vs.member?.user && !users[vs.user_id])
      .map((vs) => vs.user_id);
    if (unknownIds.length > 0) {
      DiscordGatewayService.requestGuildMembers(guildId, unknownIds);
    }
  }, [guildVoiceStates, users, guildId]);

  const categories = useMemo(() => {
    return guildChannels
      .filter((c) => c.type === DiscordChannelType.GUILD_CATEGORY)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [guildChannels]);

  const rootChannels = useMemo(() => {
    return guildChannels.filter(
      (c) => !c.parent_id && c.type !== DiscordChannelType.GUILD_CATEGORY
    );
  }, [guildChannels]);

  // Flatten everything into a virtual list of items
  const flatItems = useMemo(() => {
    const items = [];

    // Root channels (no category)
    const sortedRoot = sortChannels(rootChannels);
    for (const channel of sortedRoot) {
      if (!showHiddenChannels && channel._canView === false) continue;
      items.push({ type: 'channel', channel });
      if (isVoiceType(channel.type)) {
        const voiceMembers = sortVoiceMembers(voiceMembersByChannel[channel.id] || [], users, memberStore);
        for (const vs of voiceMembers) {
          items.push({ type: 'voice-member', vs, channelId: channel.id });
        }
      }
    }

    // Categories + their children
    for (const category of categories) {
      const categoryChannels = guildChannels.filter(
        (c) => c.parent_id === category.id && c.type !== DiscordChannelType.GUILD_CATEGORY
      );
      const visibleCategoryChannels = showHiddenChannels
        ? categoryChannels
        : categoryChannels.filter((c) => c._canView !== false);
      if (visibleCategoryChannels.length === 0) continue;

      const isCollapsed = collapsedCategories.has(category.id);
      items.push({ type: 'category-header', category, isCollapsed });

      if (!isCollapsed) {
        const sorted = sortChannels(categoryChannels);
        for (const channel of sorted) {
          if (!showHiddenChannels && channel._canView === false) continue;
          items.push({ type: 'channel', channel });
          if (isVoiceType(channel.type)) {
            const voiceMembers = sortVoiceMembers(voiceMembersByChannel[channel.id] || [], users, memberStore);
            for (const vs of voiceMembers) {
              items.push({ type: 'voice-member', vs, channelId: channel.id });
            }
          }
        }
      }
    }

    return items;
  }, [rootChannels, categories, guildChannels, collapsedCategories, voiceMembersByChannel, showHiddenChannels, users, memberStore]);

  const estimateSize = useCallback((index) => {
    const item = flatItems[index];
    if (item.type === 'category-header') return CATEGORY_HEADER_HEIGHT;
    if (item.type === 'voice-member') return VOICE_MEMBER_HEIGHT;
    return CHANNEL_ROW_HEIGHT;
  }, [flatItems]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => sidebarRef.current,
    estimateSize,
    overscan: 10,
  });

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
  const guildName = guild?.properties?.name || 'Discord Server';
  const iconUrl = DiscordService.getGuildIconUrl(guild?.id, guild?.properties?.icon, 64);

  return (
    <div className="relative top-0 flex h-full w-full flex-col bg-[#121214] text-gray-100">
      <DiscordGuildHeader guild={guild} />

      <div
        className="scrollbar-hover min-h-0 flex-1 overflow-y-auto pb-24"
        ref={sidebarRef}
        onScroll={onSidebarScroll}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = flatItems[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === 'category-header' && (
                  <button
                    type="button"
                    className="mb-1 flex w-full items-center pt-4 text-gray-600 hover:text-gray-300"
                    onClick={() => toggleCategory(item.category.id)}
                  >
                    <div className="flex w-6 items-center justify-center">
                      {item.isCollapsed ? (
                        <CaretRight className="size-2" />
                      ) : (
                        <CaretDown className="size-2" />
                      )}
                    </div>
                    <span className="text-xs font-bold">{item.category.name}</span>
                  </button>
                )}
                {item.type === 'channel' && (
                  <DiscordChannelRow
                    channel={item.channel}
                    isActive={item.channel.id === channelId}
                    joinedAtMs={joinedAtMs}
                    rulesChannelId={rulesChannelId}
                    guildName={guildName}
                  />
                )}
                {item.type === 'voice-member' && (
                  <VoiceMemberItem
                    vs={item.vs}
                    guildId={guildId}
                    channelId={item.channelId}
                    users={users}
                    memberStore={memberStore}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const VoiceMemberItem = memo(({ vs, guildId, channelId, users, memberStore }) => {
  const memberData = memberStore[vs.user_id];
  const user = vs.member?.user || users[vs.user_id];
  const displayName = vs.member?.nick || memberData?.nick || user?.global_name || user?.username || 'Unknown';
  const avatarUrl = DiscordService.getUserAvatarUrl(vs.user_id, user?.avatar, 32);
  const openProfile = useCallback(() => {
    if (!user) return;
    useModalStore.getState().push(DiscordUserProfileModal, {
      author: user,
      member: memberData || vs.member,
      guildId,
    });
  }, [user, memberData, vs.member, guildId]);

  return (
    <VoiceMemberRow
      vs={vs}
      guildId={guildId}
      channelId={channelId}
      user={user}
      memberData={memberData}
      displayName={displayName}
      avatarUrl={avatarUrl}
      openProfile={openProfile}
    />
  );
});

export default DiscordGuildChannelsSidebar;
