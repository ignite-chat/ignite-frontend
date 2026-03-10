import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Gear,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  PhoneDisconnect,
  WifiHigh,
  WifiMedium,
  WifiLow,
  WifiSlash,
  VideoCamera,
  VideoCameraSlash,
  Monitor,
  Waveform,
  DiscordLogo,
  UserCircle,
  Check,
} from '@phosphor-icons/react';
import { useAuthStore } from '@/ignite/store/auth.store';
import UserSettingsModal from '@/ignite/components/modals/UserSettingsModal';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { LogOut } from 'lucide-react';
import Avatar from './Avatar';
import { useVoiceStore } from '@/ignite/store/voice.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { VoiceService } from '@/ignite/services/voice.service';
import { useModalStore } from '@/ignite/store/modal.store';
import { useModalStore as useSharedModalStore } from '@/store/modal.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { DiscordService } from '@/discord/services/discord.service';
import DiscordUserProfileModal from '@/discord/components/DiscordUserProfileModal';
import VoiceSettingsModal from '@/ignite/components/modals/VoiceSettingsModal';
import ScreenShareModal from '@/ignite/components/modals/ScreenShareModal';

function getPingInfo(ping) {
  if (ping === null || ping == 0) return { Icon: WifiHigh, color: 'text-gray-400', label: 'Measuring...' };
  if (ping < 100) return { Icon: WifiHigh, color: 'text-green-500', label: `${Math.round(ping)} ms` };
  if (ping < 200) return { Icon: WifiMedium, color: 'text-yellow-500', label: `${Math.round(ping)} ms` };
  if (ping < 400) return { Icon: WifiLow, color: 'text-orange-500', label: `${Math.round(ping)} ms` };
  return { Icon: WifiSlash, color: 'text-red-500', label: `${Math.round(ping)} ms` };
}

const DISCORD_STATUS = {
  online: { color: 'bg-green-500', label: 'Online' },
  idle: { color: 'bg-yellow-500', label: 'Idle' },
  dnd: { color: 'bg-red-500', label: 'Do Not Disturb' },
  offline: { color: 'bg-gray-500', label: 'Invisible' },
};

const DiscordAvatarWithStatus = ({ avatarUrl, name, status, size = 36 }) => {
  const dotSize = Math.round(size * 0.33);
  const statusInfo = DISCORD_STATUS[status] || DISCORD_STATUS.online;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover select-none"
        style={{ width: size, height: size }}
      />
      <div
        className={`absolute bottom-0 right-0 rounded-full border-2 border-[#1a1a1d] ${statusInfo.color}`}
        style={{ width: dotSize, height: dotSize }}
      />
    </div>
  );
};

const useDiscordStatus = (userId) => {
  const storedUser = useDiscordUsersStore((s) => userId ? s.users[userId] : undefined);
  const isConnected = useDiscordStore((s) => s.isConnected);
  // The user's status from presence data, default to 'online' when connected
  return storedUser?.status || (isConnected ? 'online' : 'offline');
};

const UserProfilePopoverMenu = ({ igniteUser, activeDisplay, onSwitch }) => {
  const discordUser = useDiscordStore((s) => s.user);
  const isDiscordConnected = useDiscordStore((s) => s.isConnected);
  const discordStatus = useDiscordStatus(discordUser?.id);

  const discordAvatarUrl = discordUser
    ? DiscordService.getUserAvatarUrl(discordUser.id, discordUser.avatar, 64)
    : null;

  return (
    <div className="flex flex-col gap-0.5">
      {/* Ignite user */}
      <button
        type="button"
        onClick={() => onSwitch('ignite')}
        className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors ${
          activeDisplay === 'ignite'
            ? 'bg-white/5 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="relative shrink-0">
          {igniteUser?.avatar_url ? (
            <img src={igniteUser.avatar_url} alt="" className="size-7 rounded-full" />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-[#2b2d31] text-xs font-semibold text-gray-300">
              {igniteUser?.username?.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#1a1a1d] ${
              igniteUser?.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
            }`}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-sm font-medium">{igniteUser?.name || 'Ignite User'}</span>
          <span className="truncate text-[11px] text-gray-500">Ignite - {igniteUser?.status === 'online' ? 'Online' : 'Offline'}</span>
        </div>
        {activeDisplay === 'ignite' && <Check size={14} weight="bold" className="shrink-0 text-primary" />}
      </button>

      {/* Discord user */}
      {isDiscordConnected && discordUser && (
        <button
          type="button"
          onClick={() => onSwitch('discord')}
          className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors ${
            activeDisplay === 'discord'
              ? 'bg-white/5 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className="shrink-0">
            {discordAvatarUrl ? (
              <DiscordAvatarWithStatus avatarUrl={discordAvatarUrl} name="" status={discordStatus} size={28} />
            ) : (
              <div className="flex size-7 items-center justify-center rounded-full bg-[#5865f2]">
                <DiscordLogo size={16} weight="fill" className="text-white" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-sm font-medium">{discordUser.global_name || discordUser.username}</span>
            <span className="truncate text-[11px] text-gray-500">Discord - {DISCORD_STATUS[discordStatus]?.label || 'Online'}</span>
          </div>
          {activeDisplay === 'discord' && <Check size={14} weight="bold" className="shrink-0 text-primary" />}
        </button>
      )}

      <div className="my-0.5 h-px bg-white/5" />
      <button
        type="button"
        onClick={() => {
          if (activeDisplay === 'discord' && discordUser) {
            useSharedModalStore.getState().push(DiscordUserProfileModal, { author: discordUser });
          } else if (igniteUser?.id) {
            useModalStore.getState().push(UserProfileModal, { userId: igniteUser.id });
          }
        }}
        className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <UserCircle size={18} weight="fill" />
        View Active Profile
      </button>
    </div>
  );
};

const UserBar = () => {
  const { logout } = useAuthStore();
  const { channelName, connectionState, isMuted, isDeafened, isCameraOn, isScreenSharing, room, ping } =
    useVoiceStore();
  const user = useUsersStore((state) => state.getCurrentUser());
  const discordUser = useDiscordStore((s) => s.user);
  const isDiscordConnected = useDiscordStore((s) => s.isConnected);

  const location = useLocation();
  const [activeDisplay, setActiveDisplay] = useState('ignite');

  // Auto-switch based on current route
  useEffect(() => {
    const isOnDiscordRoute = location.pathname.startsWith('/discord/');
    if (isOnDiscordRoute && isDiscordConnected && discordUser) {
      setActiveDisplay('discord');
    } else {
      setActiveDisplay('ignite');
    }
  }, [location.pathname, isDiscordConnected, discordUser]);

  const handleSwitch = (mode) => {
    setActiveDisplay(mode);
  };

  const discordStatus = useDiscordStatus(discordUser?.id);

  const showDiscord = activeDisplay === 'discord' && isDiscordConnected && discordUser;
  const displayName = showDiscord
    ? (discordUser.global_name || discordUser.username)
    : user?.name;
  const displayStatus = showDiscord
    ? (DISCORD_STATUS[discordStatus]?.label || 'Online')
    : (user?.status || 'Online');
  const discordAvatarUrl = showDiscord
    ? DiscordService.getUserAvatarUrl(discordUser.id, discordUser.avatar, 64)
    : null;

  const isConnected = connectionState !== 'disconnected';

  // Poll RTT from LiveKit room
  useEffect(() => {
    if (!room || connectionState !== 'connected') return;

    const interval = setInterval(() => {
      const rtt = room.engine?.client?.rtt;
      if (typeof rtt === 'number') {
        useVoiceStore.getState().setPing(rtt);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [room, connectionState]);

  return (
    <div className="pointer-events-auto flex flex-col gap-2 bg-gradient-to-t from-[#121214] from-70% to-transparent p-2 pt-6">
      {/* Voice Channel Panel - Only show when connected */}
      {isConnected && (
        <div className="rounded-lg bg-[#1a1a1d] px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0 cursor-default">
                  {(() => {
                    const { Icon, color } = getPingInfo(ping);
                    return <Icon className={`size-4 ${color}`} weight="bold" />;
                  })()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {ping !== null ? `${Math.round(ping)} ms` : 'Measuring...'}
              </TooltipContent>
            </Tooltip>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-xs font-semibold ${getPingInfo(ping).color}`}>
                {connectionState === 'connecting' ? 'Connecting...' : 'Voice Connected'}
              </p>
              <p className="truncate text-[11px] text-gray-400">{channelName}</p>
            </div>
          </div>

          {/* Voice Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => VoiceService.toggleCamera()}
              className={`flex flex-1 items-center justify-center gap-2 rounded py-2 px-3 text-sm font-medium transition-colors ${isCameraOn
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-[#2a2a2d] text-gray-300 hover:bg-[#35353a]'
                }`}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraOn ? (
                <VideoCamera className="size-5" weight="fill" />
              ) : (
                <VideoCameraSlash className="size-5" weight="fill" />
              )}
              <span>{isCameraOn ? 'Camera' : 'Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isScreenSharing) {
                  VoiceService.toggleScreenShare();
                } else if (window.IgniteNative?.getDesktopSources) {
                  useModalStore.getState().push(ScreenShareModal);
                } else {
                  VoiceService.toggleScreenShare();
                }
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded py-2 px-3 text-sm font-medium transition-colors ${isScreenSharing
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-[#2a2a2d] text-gray-300 hover:bg-[#35353a]'
                }`}
              title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            >
              <Monitor className="size-5" weight="fill" />
              <span>Screen</span>
            </button>

            <button
              type="button"
              onClick={() => useModalStore.getState().push(VoiceSettingsModal)}
              className="flex size-9 shrink-0 items-center justify-center rounded bg-[#2a2a2d] text-gray-300 transition-colors hover:bg-[#35353a] hover:text-gray-100"
              title="Voice Settings"
            >
              <Waveform className="size-5" weight="bold" />
            </button>

            <button
              type="button"
              onClick={() => VoiceService.leaveVoiceChannel()}
              className="flex size-9 shrink-0 items-center justify-center rounded bg-[#2a2a2d] text-gray-300 transition-colors hover:bg-red-500/20 hover:text-red-400"
              title="Disconnect"
            >
              <PhoneDisconnect className="size-5" weight="fill" />
            </button>
          </div>

        </div>
      )}

      {/* User Info Bar */}
      <div className="flex items-center rounded-lg bg-[#1a1a1d] px-2.5 py-2.5">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-0.5 py-0.5 transition-colors hover:bg-white/5 mr-2">
              <div className="shrink-0">
                {showDiscord ? (
                  <DiscordAvatarWithStatus
                    avatarUrl={discordAvatarUrl}
                    name={displayName}
                    status={discordStatus}
                    size={36}
                  />
                ) : (
                  <Avatar user={user} size={36} showStatus showOffline />
                )}
              </div>
              <div className="flex min-w-0 flex-col text-left">
                <span className="truncate text-base font-semibold leading-tight text-gray-100">
                  {displayName}
                </span>
                <span className="truncate text-xs text-gray-500">
                  {displayStatus}
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-56 border-white/10 bg-[#1a1a1d] p-1">
            <UserProfilePopoverMenu
              igniteUser={user}
              activeDisplay={activeDisplay}
              onSwitch={handleSwitch}
            />
          </PopoverContent>
        </Popover>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => VoiceService.toggleMute()}
            className={`flex size-9 items-center justify-center rounded transition-colors ${isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'hover:bg-white/5'
              }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicrophoneSlash className="size-5 text-red-400" weight="fill" />
            ) : (
              <Microphone className="size-5 text-gray-400 hover:text-gray-200" weight="fill" />
            )}
          </button>

          <button
            type="button"
            onClick={() => VoiceService.toggleDeafen()}
            className={`flex size-9 items-center justify-center rounded transition-colors ${isDeafened
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'hover:bg-white/5'
              }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? (
              <SpeakerSlash className="size-5 text-red-400" weight="fill" />
            ) : (
              <SpeakerHigh className="size-5 text-gray-400 hover:text-gray-200" weight="fill" />
            )}
          </button>

          <button
            type="button"
            onClick={() => useModalStore.getState().push(UserSettingsModal)}
            className="flex size-9 items-center justify-center rounded hover:bg-white/5"
            title="User Settings"
          >
            <Gear className="size-5 text-gray-400 hover:text-gray-200" weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserBar;
