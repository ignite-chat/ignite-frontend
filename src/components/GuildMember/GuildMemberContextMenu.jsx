import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useStore from '../../hooks/useStore';
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
import { RolesService } from '../../services/roles.service';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';

const intToHex = (intColor) => {
  return `#${intColor.toString(16).padStart(6, '0')}`;
};

const GuildMemberContextMenu = ({ user }) => {
  const store = useStore();
  const navigate = useNavigate();
  const { friends, requests } = useFriendsStore();
  const { guildRoles } = useRolesStore();
  const { guildId } = useGuildContext();
  const { guildMembers } = useGuildsStore();

  const availableRoles = useMemo(() => {
    return guildRoles[guildId] || [];
  }, [guildRoles, store.currentGuild]);

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

  const canKickMember = useMemo(() => {
    // Cannot kick yourself
    if (user.id === store.user.id) return false;

    const currentMember = guildMembers[guildId]?.find((m) => m.user_id === store.user.id);
    if (!currentMember) return false;

    if (!PermissionsService.hasPermission(guildId, null, Permissions.KICK_MEMBERS)) {
      return false;
    }

    // TODO: Check role hierarchy here
    return true;
  }, [guildMembers, guildId, store.user.id, availableRoles, userRoles]);

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
      if (author.id === store.user.id) {
        toast.info('You cannot DM yourself.');
        return;
      }
      try {
        await api.post('@me/channels', { recipients: [author.id] });
        navigate('/channels/@me');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not create direct message.');
      }
    },
    [navigate, store.user.id]
  );

  // Handler shortcuts
  const handleFriendsAction = (action, username) => {
    action(friendRequestId || username)
      .then(() => toast.success(`Action successful for ${username}`))
      .catch(() => toast.error(`Failed action for ${username}`));
  };

  return (
    <>
      <ContextMenuItem onSelect={() => toast.info('Profile feature coming soon.')}>
        View Profile
      </ContextMenuItem>

      {user.id !== store.user.id && (
        <ContextMenuItem onSelect={() => onSendMessage(user)}>Send Message</ContextMenuItem>
      )}

      {user.id !== store.user.id && (
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
            className="text-red-500"
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
          {availableRoles.map((role) => (
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
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: intToHex(role.color) }}
                />
                {role.name}
              </div>
            </ContextMenuCheckboxItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      {canKickMember && (
        <ContextMenuItem
          className="text-red-500"
          onSelect={() => toast.info('Block feature coming soon.')}
        >
          Kick {user.username}
        </ContextMenuItem>
      )}

      {/* <ContextMenuItem className="text-red-500" onSelect={() => toast.info('Block feature coming soon.')}>
        Ban {user.username}
      </ContextMenuItem> */}
    </>
  );
};

export default GuildMemberContextMenu;
