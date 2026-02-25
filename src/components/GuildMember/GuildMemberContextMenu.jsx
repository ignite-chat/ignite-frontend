import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUsersStore } from '../../store/users.store';
import api from '../../api';
import { FriendsService } from '../../services/friends.service';
import { useFriendsStore } from '../../store/friends.store';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem, // Using CheckboxItem is standard for toggling roles
} from '../ui/context-menu';
import { useGuildsStore } from '../../store/guilds.store';
import { useRolesStore } from '../../store/roles.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { useModalStore } from '../../store/modal.store';
import { RolesService } from '../../services/roles.service';
import { Permissions } from '@/constants/Permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { KickBanModal } from '@/components/modals/KickBanModal';
import { MemberDebugModal } from '@/components/modals/MemberDebugModal';

const intToHex = (intColor) => {
  return `#${intColor.toString(16).padStart(6, '0')}`;
};

const GuildMemberContextMenu = ({ user, onViewProfile }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const navigate = useNavigate();
  const { friends, requests } = useFriendsStore();
  const { guildRoles } = useRolesStore();
  const { guildId } = useGuildContext();
  const { guildMembers } = useGuildsStore();

  const availableRoles = useMemo(() => {
    return guildRoles[guildId] || [];
  }, [guildRoles, guildId]);

  const member = guildMembers[guildId]?.find((m) => m.user_id === user.id);

  const userRoles = member?.roles || [];

  const memberHasRole = (roleId) => {
    return userRoles.some((r) => r.id === roleId);
  };

  const toggleRole = (roleId) => {
    if (memberHasRole(roleId)) {
      RolesService.removeRoleFromMember(guildId, user.id, roleId)
        .then(() => toast.success('Role removed successfully'))
        .catch(() => toast.error('Failed to remove role'));
    } else {
      RolesService.assignRoleToMember(guildId, user.id, roleId)
        .then(() => toast.success('Role added successfully'))
        .catch(() => toast.error('Failed to add role'));
    }
  };

  const hasManageRoles = useHasPermission(guildId, null, Permissions.MANAGE_ROLES);
  const hasKickPermission = useHasPermission(guildId, null, Permissions.KICK_MEMBERS);
  const hasBanPermission = useHasPermission(guildId, null, Permissions.BAN_MEMBERS);
  const canKickMember = user.id !== currentUser.id && hasKickPermission;
  const canBanMember = user.id !== currentUser.id && hasBanPermission;

  const isFriend = useMemo(() => friends.some((f) => f.id === user.id), [friends, user.id]);
  const hasSentRequest = useMemo(
    () => requests.some((r) => r.receiver_id === user.id),
    [requests, user.id]
  );
  const hasReceivedRequest = useMemo(
    () => requests.some((r) => r.sender_id === user.id),
    [requests, user.id]
  );

  const friendRequestId = useMemo(() => {
    const request = requests.find((r) => r.sender_id === user.id || r.receiver_id === user.id);
    return request ? request.id : null;
  }, [requests, user.id]);

  const onSendMessage = useCallback(
    async (author) => {
      if (author.id === currentUser.id) {
        toast.info('You cannot DM yourself.');
        return;
      }
      try {
        const res = await api.post('@me/channels', { recipients: [author.id] });
        const channel = res.data;
        navigate(`/channels/@me/${channel.channel_id || channel.id}`);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not create direct message.');
      }
    },
    [navigate, currentUser.id]
  );

  // Handler shortcuts
  const handleFriendsAction = (action, username) => {
    action(friendRequestId || username)
      .then(() => toast.success(`Action successful for ${username}`))
      .catch(() => toast.error(`Failed action for ${username}`));
  };

  return (
    <>
      <ContextMenuItem
        onSelect={() =>
          onViewProfile ? onViewProfile() : toast.info('Profile feature coming soon.')
        }
      >
        View Profile
      </ContextMenuItem>

      {user.id !== currentUser.id && (
        <ContextMenuItem onSelect={() => onSendMessage(user)}>Message</ContextMenuItem>
      )}

      {user.id !== currentUser.id && (
        <>
          <ContextMenuSeparator />

          <ContextMenuItem onSelect={() => toast.info('Change Nickname coming soon.')}>
            Change Nickname
          </ContextMenuItem>

          {!isFriend && !hasSentRequest && !hasReceivedRequest && (
            <ContextMenuItem
              onSelect={() => handleFriendsAction(FriendsService.sendRequest, user.username)}
            >
              Add Friend
            </ContextMenuItem>
          )}
          {isFriend && (
            <ContextMenuItem onSelect={() => handleFriendsAction(FriendsService.removeFriend)}>
              Remove Friend
            </ContextMenuItem>
          )}
          {hasSentRequest && (
            <ContextMenuItem onSelect={() => handleFriendsAction(FriendsService.cancelRequest)}>
              Cancel Friend Request
            </ContextMenuItem>
          )}
          {hasReceivedRequest && (
            <ContextMenuItem onSelect={() => handleFriendsAction(FriendsService.acceptRequest)}>
              Accept Friend Request
            </ContextMenuItem>
          )}

          <ContextMenuItem
            className="text-[#f23f42] focus:bg-[#da373c] focus:text-white"
            onSelect={() => toast.info('Block feature coming soon.')}
          >
            Block
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />

      <ContextMenuSub>
        <ContextMenuSubTrigger>Roles</ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-48">
          {availableRoles.map((role) =>
            hasManageRoles ? (
              <ContextMenuCheckboxItem
                key={role.id}
                checked={memberHasRole(role.id)}
                onSelect={(e) => {
                  e.preventDefault();
                  toggleRole(role.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: intToHex(role.color) }}
                  />
                  {role.name}
                </div>
              </ContextMenuCheckboxItem>
            ) : (
              <ContextMenuItem key={role.id} disabled={!memberHasRole(role.id)}>
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: intToHex(role.color) }}
                  />
                  {role.name}
                </div>
              </ContextMenuItem>
            )
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>

      {canKickMember && (
        <ContextMenuItem
          className="text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          onSelect={() => useModalStore.getState().push(KickBanModal, { user, guildId, action: 'kick' })}
        >
          Kick {user.username}
        </ContextMenuItem>
      )}

      {canBanMember && (
        <ContextMenuItem
          className="text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          onSelect={() => useModalStore.getState().push(KickBanModal, { user, guildId, action: 'ban' })}
        >
          Ban {user.username}
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />
      <ContextMenuItem
        className="justify-between"
        onSelect={() => {
          navigator.clipboard.writeText(user.id);
          toast.success('Copied User ID');
        }}
      >
        Copy User ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">
          ID
        </span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => setTimeout(() => useModalStore.getState().push(MemberDebugModal, { user, guildId }), 0)}>
        Debug Info
      </ContextMenuItem>
    </>
  );
};

export default GuildMemberContextMenu;
