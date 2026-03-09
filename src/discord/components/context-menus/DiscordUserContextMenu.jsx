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
} from '@phosphor-icons/react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { DiscordApiService } from '../../services/discord-api.service';
import { useDiscordStore } from '../../store/discord.store';
import { useDiscordRelationshipsStore, RelationshipType } from '../../store/discord-relationships.store';
import { useDiscordMembersStore } from '../../store/discord-members.store';
import { useModalStore } from '@/store/modal.store';
import DiscordTimeoutModal from '../modals/DiscordTimeoutModal';

const DiscordUserContextMenu = ({
  author,
  guildId,
  canKick,
  canBan,
  canManageNicknames,
  canTimeout,
  isOwnMessage,
  onViewProfile,
}) => {
  const navigate = useNavigate();
  const currentUser = useDiscordStore((s) => s.user);
  const relationships = useDiscordRelationshipsStore((s) => s.relationships);
  const storeMember = useDiscordMembersStore((s) =>
    guildId && author?.id ? s.members[guildId]?.[author.id] : undefined
  );
  const displayName = author.global_name || author.username;
  const isSelf = currentUser?.id === author.id;

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
      navigate(`/discord/dm/${channel.id}`);
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

  return (
    <>
      <ContextMenuItem className="justify-between" onSelect={onViewProfile}>
        View Profile
        <User className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>

      {!isSelf && (
        <ContextMenuItem className="justify-between" onSelect={handleMessage}>
          Message
          <ChatText className="ml-auto size-[18px]" weight="fill" />
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

      <ContextMenuSeparator />

      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy User ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>
    </>
  );
};

export default DiscordUserContextMenu;
