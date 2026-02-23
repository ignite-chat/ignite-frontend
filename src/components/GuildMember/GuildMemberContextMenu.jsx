import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useStore from '../../hooks/useStore';
import api from '../../api';
import { FriendsService } from '../../services/friends.service';
import { GuildsService } from '../../services/guilds.service';
import { useFriendsStore } from '../../store/friends.store';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem, // Using CheckboxItem is standard for toggling roles
} from '../ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useGuildsStore } from '../../store/guilds.store';
import { useRolesStore } from '../../store/roles.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { RolesService } from '../../services/roles.service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Permissions } from '@/constants/Permissions';
import { useHasPermission } from '@/hooks/useHasPermission';

const intToHex = (intColor) => {
  return `#${intColor.toString(16).padStart(6, '0')}`;
};

const DELETE_MESSAGE_OPTIONS = [
  { value: '0', label: "Don't delete any" },
  { value: '3600', label: 'Last hour' },
  { value: '21600', label: 'Last 6 hours' },
  { value: '43200', label: 'Last 12 hours' },
  { value: '86400', label: 'Last 24 hours' },
  { value: '259200', label: 'Last 3 days' },
  { value: '604800', label: 'Last 7 days' },
];

/**
 * Confirmation dialog for kick/ban actions.
 * Must be rendered OUTSIDE ContextMenuContent so it persists after the menu closes.
 */
export const KickBanDialog = ({ user, confirmAction, setConfirmAction }) => {
  const { guildId } = useGuildContext();
  const [reason, setReason] = useState('');
  const [deleteSeconds, setDeleteSeconds] = useState('0');
  const isBan = confirmAction === 'ban';

  if (!user) return null;

  const handleClose = (open) => {
    if (!open) {
      setConfirmAction(null);
      setReason('');
      setDeleteSeconds('0');
    }
  };

  return (
    <AlertDialog open={confirmAction !== null} onOpenChange={handleClose}>
      <AlertDialogContent className={isBan ? '!max-w-md' : undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBan ? `Ban ${user.username}` : `Kick ${user.username}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBan
              ? `Are you sure you want to ban ${user.username}? They will not be able to rejoin unless unbanned.`
              : `Are you sure you want to kick ${user.username} from the server? They can rejoin with a new invite.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isBan && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for the ban"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={512}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Delete message history</label>
              <Select value={deleteSeconds} onValueChange={setDeleteSeconds}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELETE_MESSAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (isBan) {
                GuildsService.banMember(guildId, user.id, reason || undefined, parseInt(deleteSeconds) || undefined);
              } else {
                GuildsService.kickMember(guildId, user.id);
              }
            }}
          >
            {isBan ? 'Ban' : 'Kick'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const GuildMemberContextMenu = ({ user, onViewProfile, onConfirmAction }) => {
  const store = useStore();
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
  const canKickMember = user.id !== store.user.id && hasKickPermission;
  const canBanMember = user.id !== store.user.id && hasBanPermission;

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
        const res = await api.post('@me/channels', { recipients: [author.id] });
        const channel = res.data;
        navigate(`/channels/@me/${channel.channel_id || channel.id}`);
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
      <ContextMenuItem
        onSelect={() =>
          onViewProfile ? onViewProfile() : toast.info('Profile feature coming soon.')
        }
      >
        View Profile
      </ContextMenuItem>

      {user.id !== store.user.id && (
        <ContextMenuItem onSelect={() => onSendMessage(user)}>Message</ContextMenuItem>
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
          onSelect={() => onConfirmAction?.('kick')}
        >
          Kick {user.username}
        </ContextMenuItem>
      )}

      {canBanMember && (
        <ContextMenuItem
          className="text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          onSelect={() => onConfirmAction?.('ban')}
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
    </>
  );
};

export default GuildMemberContextMenu;
