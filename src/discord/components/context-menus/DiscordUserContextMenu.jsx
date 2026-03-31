import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  User,
  UserMinus,
  Gavel,
  ChatText,
  PencilSimple,
  UserPlus,
  Prohibit,
  Timer,
  SpeakerHigh,
  SpeakerSlash,
  BellSlash,
  Check,
  Copy,
  PushPin,
} from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { DiscordApiService } from '../../services/discord-api.service';
import { useDiscordStore } from '../../store/discord.store';
import { useDiscordRelationshipsStore, RelationshipType } from '../../store/discord-relationships.store';
import { useDiscordMembersStore } from '../../store/discord-members.store';
import { useDiscordReadStatesStore } from '../../store/discord-readstates.store';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordVoiceStore } from '../../store/discord-voice.store';
import { useDiscordVoiceStatesStore } from '../../store/discord-voice-states.store';
import { useDiscordUserVolumeStore } from '../../store/discord-user-volume.store';
import { DiscordVoiceService } from '../../services/discord-voice.service';
import { useModalStore } from '@/store/modal.store';
import DiscordTimeoutModal from '../modals/DiscordTimeoutModal';
import DiscordUserProfileModal from '../DiscordUserProfileModal';

const DiscordUserContextMenu = ({
  author,
  guildId,
  channelId,
  canKick,
  canBan,
  canManageNicknames,
  canTimeout,
  isOwnMessage,
  onViewProfile,
  isPinned,
  onTogglePin,
}) => {
  const navigate = useNavigate();
  const currentUser = useDiscordStore((s) => s.user);
  const relationships = useDiscordRelationshipsStore((s) => s.relationships);
  const storeMember = useDiscordMembersStore((s) =>
    guildId && author?.id ? s.members[guildId]?.[author.id] : undefined
  );
  const displayName = author.global_name || author.username;
  const isSelf = currentUser?.id === author.id;

  // Check if this user is in voice with us
  const connectedGuildId = useDiscordVoiceStore((s) => s.guildId);
  const connectedChannelId = useDiscordVoiceStore((s) => s.channelId);
  const guildVoiceStates = useDiscordVoiceStatesStore((s) => connectedGuildId ? s.voiceStates[connectedGuildId] || {} : {});
  const isInVoiceWithUs = !isSelf && connectedChannelId && guildVoiceStates[author.id]?.channel_id === connectedChannelId;

  const userVolume = useDiscordUserVolumeStore((s) => s.getUserVolume(author.id));
  const userMuted = useDiscordUserVolumeStore((s) => s.isUserMuted(author.id));
  const [localVolume, setLocalVolume] = useState(userVolume);

  const relationship = relationships.find((r) => r.id === author.id);
  const isFriend = relationship?.type === RelationshipType.FRIEND;
  const isBlocked = relationship?.type === RelationshipType.BLOCKED;

  const isTimedOut = (() => {
    const until = storeMember?.communication_disabled_until;
    if (!until) return false;
    return new Date(until) > new Date();
  })();

  const handleCopyId = () => {
    navigator.clipboard.writeText(author.id);
    toast.success('Copied User ID');
  };

  const handleMessage = async () => {
    try {
      const channel = await DiscordApiService.createDMChannel(author.id);
      navigate(`/channels/@me/${channel.id}`);
    } catch {
      toast.error('Failed to open DM');
    }
  };

  const handleChangeNickname = async () => {
    const nickname = prompt(`Enter new nickname for ${displayName} (leave empty to reset):`);
    if (nickname === null) return;
    try {
      await DiscordApiService.modifyGuildMember(guildId, author.id, { nick: nickname || null });
      toast.success(nickname ? `Changed nickname to ${nickname}` : 'Reset nickname');
    } catch {
      toast.error('Failed to change nickname');
    }
  };

  const handleAddFriend = async () => {
    try {
      await DiscordApiService.sendFriendRequest(author.id);
      toast.success(`Sent friend request to ${displayName}`);
    } catch {
      toast.error('Failed to send friend request');
    }
  };

  const handleBlock = async () => {
    try {
      await DiscordApiService.blockUser(author.id);
      toast.success(`Blocked ${displayName}`);
    } catch {
      toast.error(`Failed to block ${displayName}`);
    }
  };

  const handleUnblock = async () => {
    try {
      await DiscordApiService.deleteRelationship(author.id);
      toast.success(`Unblocked ${displayName}`);
    } catch {
      toast.error(`Failed to unblock ${displayName}`);
    }
  };

  const handleKick = async () => {
    try {
      await DiscordApiService.kickMember(guildId, author.id);
      toast.success(`Kicked ${displayName}`);
    } catch {
      toast.error(`Failed to kick ${displayName}`);
    }
  };

  const handleBan = async () => {
    try {
      await DiscordApiService.banMember(guildId, author.id);
      toast.success(`Banned ${displayName}`);
    } catch {
      toast.error(`Failed to ban ${displayName}`);
    }
  };

  const handleOpenTimeoutModal = () => {
    useModalStore.getState().push(DiscordTimeoutModal, { author, guildId });
  };

  const handleRemoveTimeout = async () => {
    try {
      await DiscordApiService.modifyGuildMember(guildId, author.id, {
        communication_disabled_until: null,
      });
      toast.success(`Removed timeout from ${displayName}`);
    } catch {
      toast.error('Failed to remove timeout');
    }
  };

  // Channel-specific state
  const channel = useDiscordChannelsStore((s) => channelId ? s.channels.find((c) => c.id === channelId) : undefined);
  const isMuted = channel?.muted ?? false;

  const handleMarkAsRead = async () => {
    if (!channelId || !channel?.last_message_id) return;
    useDiscordReadStatesStore.getState().ackChannel(channelId, channel.last_message_id);
    DiscordApiService.ackMessage(channelId, channel.last_message_id).catch(() => {});
  };

  const handleToggleMute = async () => {
    if (!channelId) return;
    try {
      await DiscordApiService.updateChannelOverrides(channelId, { muted: !isMuted, mute_config: !isMuted ? { selected_time_window: -1, end_time: null } : null });
      useDiscordChannelsStore.getState().updateChannel(channelId, { muted: !isMuted });
      toast.success(isMuted ? 'Unmuted channel' : 'Muted channel');
    } catch {
      toast.error('Failed to update mute');
    }
  };

  const handleCopyChannelId = () => {
    navigator.clipboard.writeText(channelId);
    toast.success('Copied Channel ID');
  };

  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem className="justify-between" onSelect={() => {
        if (onViewProfile) {
          onViewProfile();
        } else {
          useModalStore.getState().push(DiscordUserProfileModal, { userId: author.id, guildId });
        }
      }}>
        View Profile
        <User className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>

      {!isSelf && (
        <ContextMenuItem className="justify-between" onSelect={handleMessage}>
          Message
          <ChatText className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}

      {onTogglePin && (
        <ContextMenuItem className="justify-between" onSelect={onTogglePin}>
          {isPinned ? 'Unpin' : 'Pin'}
          <PushPin className={`ml-auto size-[18px] ${isPinned ? '' : 'rotate-45'}`} weight="fill" />
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />

      {canManageNicknames && (
        <ContextMenuItem className="justify-between" onSelect={handleChangeNickname}>
          Change Nickname
          <PencilSimple className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}

      {!isSelf && !isFriend && !isBlocked && (
        <ContextMenuItem className="justify-between" onSelect={handleAddFriend}>
          Add Friend
          <UserPlus className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}

      {!isSelf && !isBlocked && (
        <ContextMenuItem
          className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          onSelect={handleBlock}
        >
          Block
          <Prohibit className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}

      {!isSelf && isBlocked && (
        <ContextMenuItem className="justify-between" onSelect={handleUnblock}>
          Unblock
          <Prohibit className="ml-auto size-[18px]" />
        </ContextMenuItem>
      )}

      {guildId && (canTimeout || canKick || canBan) && (
        <>
          <ContextMenuSeparator />

          {canTimeout && !isTimedOut && (
            <ContextMenuItem className="text-[#f23f42] focus:bg-[#da373c] justify-between" onSelect={handleOpenTimeoutModal}>
              Timeout
              <Timer className="ml-auto size-[18px]" weight="fill" />
            </ContextMenuItem>
          )}

          {canTimeout && isTimedOut && (
            <ContextMenuItem className="text-[#f23f42] focus:bg-[#da373c] justify-between" onSelect={handleRemoveTimeout}>
              Remove Timeout
              <Timer className="ml-auto size-[18px]" />
            </ContextMenuItem>
          )}

          {canKick && (
            <ContextMenuItem
              onSelect={handleKick}
              className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
            >
              Kick {displayName}
              <UserMinus className="ml-auto size-[18px]" weight="fill" />
            </ContextMenuItem>
          )}
          {canBan && (
            <ContextMenuItem
              onSelect={handleBan}
              className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
            >
              Ban {displayName}
              <Gavel className="ml-auto size-[18px]" weight="fill" />
            </ContextMenuItem>
          )}
        </>
      )}

      {isInVoiceWithUs && (
        <>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={userMuted}
            onCheckedChange={(checked) => {
              useDiscordUserVolumeStore.getState().setUserMuted(author.id, checked);
              DiscordVoiceService.applyUserVolume(author.id);
            }}
            onSelect={(e) => e.preventDefault()}
          >
            Mute
          </ContextMenuCheckboxItem>
          <div className="px-2 py-1.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">User Volume</span>
              <span className="text-xs tabular-nums text-gray-500">{localVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={(e) => {
                e.stopPropagation();
                const val = Number(e.target.value);
                setLocalVolume(val);
                useDiscordUserVolumeStore.getState().setUserVolume(author.id, val);
                DiscordVoiceService.applyUserVolume(author.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#4e5058] accent-[#5865f2] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>
        </>
      )}

      {channelId && (
        <>
          <ContextMenuSeparator />

          <ContextMenuItem className="justify-between" onSelect={handleMarkAsRead}>
            Mark as Read
            <Check className="ml-auto size-[18px]" weight="bold" />
          </ContextMenuItem>

          <ContextMenuItem className="justify-between" onSelect={handleToggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
            <BellSlash className="ml-auto size-[18px]" weight={isMuted ? 'regular' : 'fill'} />
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />

      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy User ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>

      {channelId && (
        <ContextMenuItem className="justify-between" onSelect={handleCopyChannelId}>
          Copy Channel ID
          <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
            ID
          </span>
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
};

export default DiscordUserContextMenu;
