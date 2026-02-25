import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsersStore } from '@/store/users.store';
import { MessageSquare, Plus, UserCheck, UserMinus, UserPlus, UserX, X } from 'lucide-react';
import Avatar from '../Avatar';
import { FriendsService } from '../../services/friends.service';
import { ChannelsService } from '../../services/channels.service';
import { RolesService } from '../../services/roles.service';
import { useFriendsStore } from '../../store/friends.store';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DotsThree, Prohibit, UserCircle, UserCircleMinus, Gavel } from '@phosphor-icons/react';
import { toast } from 'sonner';
import UserProfileModal from '@/components/modals/UserProfileModal';
import { KickBanModal } from '@/components/modals/KickBanModal';
import { useGuildContext } from '../../contexts/GuildContext';
import { useModalStore } from '../../store/modal.store';
import { useGuildsStore } from '../../store/guilds.store';
import { useRolesStore } from '@/store/roles.store';
import { Permissions } from '@/constants/Permissions';
import { useHasPermission } from '@/hooks/useHasPermission';

const GuildMemberPopoverContent = ({ userId, onOpenProfile }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const navigate = useNavigate();

  const { friends, requests } = useFriendsStore();
  const { getUser } = useUsersStore();
  const { guildId } = useGuildContext();
  const { guildMembers } = useGuildsStore();

  const user = useMemo(() => getUser(userId), [userId, getUser]);

  const member = useMemo(() => {
    if (!guildId) return null;
    return (guildMembers[guildId] || []).find((m) => m.user_id === userId);
  }, [guildId, guildMembers, userId]);

  const roles = useMemo(() => {
    const r = member?.roles || user?.roles || [];
    return [...r].sort((a, b) => (b.position || 0) - (a.position || 0));
  }, [member, user]);

  const getRoleColor = (color) => {
    if (!color || color === 0) return '#5865f2';
    return typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
  };

  const isFriend = useMemo(() => {
    if (!user) return false;
    return friends.some((friend) => friend.id === user.id);
  }, [friends, user]);

  const hasSentRequest = useMemo(() => {
    if (!user) return false;
    return requests.some((request) => request.receiver_id === user.id);
  }, [requests, user]);

  const hasReceivedRequest = useMemo(() => {
    if (!user) return false;
    return requests.some((request) => request.sender_id === user.id);
  }, [requests, user]);

  const friendRequestId = useMemo(() => {
    if (!user) return null;
    const request = requests.find(
      (request) => request.sender_id === user.id || request.receiver_id === user.id
    );
    return request ? request.id : null;
  }, [requests, user]);

  if (!user) return null;

  const handleAddFriend = async () => {
    try {
      await FriendsService.sendRequest(user.username);
      toast.success(`Friend request sent to ${user.username}`);
    } catch {
      toast.error('Failed to send friend request');
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await FriendsService.removeFriend(user.id);
      toast.success(`Removed ${user.username} from friends`);
    } catch {
      toast.error('Failed to remove friend');
    }
  };

  const handleCancelRequest = async () => {
    if (!friendRequestId) return;
    try {
      await FriendsService.cancelRequest(friendRequestId);
      toast.success('Friend request cancelled');
    } catch {
      toast.error('Failed to cancel request');
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendRequestId) return;
    try {
      await FriendsService.acceptRequest(friendRequestId);
      toast.success(`You are now friends with ${user.username}`);
    } catch {
      toast.error('Failed to accept request');
    }
  };

  const handleOpenDM = async () => {
    try {
      const channel = await ChannelsService.createPrivateChannel([userId]);
      if (channel) {
        navigate(`/channels/@me/${channel.channel_id}`);
      }
    } catch {
      toast.error('Failed to open DM');
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  const hasKickPermission = useHasPermission(guildId, null, Permissions.KICK_MEMBERS);
  const hasBanPermission = useHasPermission(guildId, null, Permissions.BAN_MEMBERS);
  const canManageRoles = useHasPermission(guildId, null, Permissions.MANAGE_ROLES);
  const canKick = user?.id !== currentUser?.id && hasKickPermission;
  const canBan = user?.id !== currentUser?.id && hasBanPermission;

  const { guildRoles } = useRolesStore();
  const availableRoles = useMemo(() => {
    if (!guildId || !canManageRoles) return [];
    const allRoles = guildRoles[guildId] || [];
    const memberRoleIds = new Set(roles.map((r) => r.id));
    return allRoles
      .filter((r) => !memberRoleIds.has(r.id))
      .sort((a, b) => (b.position || 0) - (a.position || 0));
  }, [guildId, canManageRoles, guildRoles, roles]);

  const handleAddRole = async (roleId) => {
    try {
      await RolesService.assignRoleToMember(guildId, user.id, roleId);
      toast.success('Role added');
    } catch {
      toast.error('Failed to add role');
    }
  };

  const handleRemoveRole = async (roleId) => {
    try {
      await RolesService.removeRoleFromMember(guildId, user.id, roleId);
      toast.success('Role removed');
    } catch {
      toast.error('Failed to remove role');
    }
  };

  const handleKick = () => useModalStore.getState().push(KickBanModal, { user, guildId, action: 'kick' });
  const handleBan = () => useModalStore.getState().push(KickBanModal, { user, guildId, action: 'ban' });

  const handleBlock = () => {
    toast.info('Block feature coming soon!');
  };

  return (
    <>
      <div className="w-80 overflow-hidden rounded-lg bg-[#111214] shadow-xl">
        <div className="relative h-28">
          <div
            className="h-full bg-primary"
            style={{
              backgroundColor: user.banner_color,
              backgroundImage: user.banner_url ? `url(${user.banner_url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <div className="absolute -bottom-12 left-4">
            <button
              type="button"
              onClick={() => (onOpenProfile ? onOpenProfile() : useModalStore.getState().push(UserProfileModal, { userId, guildId }))}
              className="group relative rounded-full ring-[6px] ring-[#111214]"
            >
              <Avatar user={user} className="size-20 !cursor-pointer text-3xl" />
              {user.status === 'online' && (
                <div className="absolute -bottom-0.5 -right-0.5 z-10 size-6 rounded-full border-4 border-[#111214] bg-[#23a559]" />
              )}

              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                <span className="text-[10px] font-bold uppercase text-white drop-shadow-md">
                  View Profile
                </span>
              </div>
            </button>
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            {user.id !== currentUser?.id && (
              <>
                {!isFriend && !hasSentRequest && !hasReceivedRequest && (
                  <button
                    type="button"
                    onClick={handleAddFriend}
                    className="flex items-center justify-center rounded-md bg-black/50 p-2 text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                    title="Add Friend"
                  >
                    <UserPlus className="size-4" />
                  </button>
                )}
                {isFriend && (
                  <button
                    type="button"
                    onClick={handleRemoveFriend}
                    className="flex items-center justify-center rounded-md bg-black/50 p-2 text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                    title="Remove Friend"
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}
                {hasSentRequest && (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="flex items-center justify-center rounded-md bg-black/50 p-2 text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                    title="Cancel Friend Request"
                  >
                    <UserX className="size-4" />
                  </button>
                )}
                {hasReceivedRequest && (
                  <button
                    type="button"
                    onClick={handleAcceptRequest}
                    className="flex items-center justify-center rounded-md bg-green-600/90 p-2 text-white backdrop-blur-sm transition hover:bg-green-600"
                    title="Accept Friend Request"
                  >
                    <UserCheck className="size-4" />
                  </button>
                )}
              </>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-center rounded-md bg-black/50 p-2 text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                  title="More Options"
                >
                  <DotsThree className="size-4" weight="bold" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-48 rounded-md border-white/5 bg-[#111214] p-1 shadow-xl"
              >
                <div className="flex flex-col gap-0.5">
                  {/* Reuse logic from UserProfileModal */}
                  {isFriend && (
                    <button
                      onClick={handleRemoveFriend}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Remove Friend
                      <UserMinus size={14} />
                    </button>
                  )}
                  {hasSentRequest && (
                    <button
                      onClick={handleCancelRequest}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Cancel Friend Request
                      <UserMinus size={14} />
                    </button>
                  )}
                  <button
                    onClick={handleBlock}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    Block
                    <Prohibit size={14} />
                  </button>
                  {canKick && (
                    <button
                      onClick={handleKick}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      Kick
                      <UserCircleMinus size={14} />
                    </button>
                  )}
                  {canBan && (
                    <button
                      onClick={handleBan}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      Ban
                      <Gavel size={14} />
                    </button>
                  )}
                  <div className="my-0.5 h-px bg-white/5" />
                  <button
                    onClick={handleCopyId}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5"
                  >
                    Copy User ID
                    <UserCircle size={14} />
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-14 px-4 pb-4">
          <div className="rounded-md bg-[#111214] p-1">
            <h2 className="flex items-center gap-1.5 text-lg font-bold text-white">{user.name}</h2>
            <p className="text-xs font-medium text-gray-300">{user.username}</p>

            <div className="mt-3">
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                About Me
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-300">
                {user.bio || 'No description provided.'}
              </p>
            </div>

            <div className="mt-3">
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Member Since
              </h3>
              <p className="text-[13px] text-gray-300">
                {(() => {
                  const raw = member?.joined_at || member?.created_at || user.created_at;
                  if (!raw) return 'Unknown';
                  const d = new Date(raw);
                  return isNaN(d) ? 'Unknown' : d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                })()}
              </p>
            </div>

            {(roles.length > 0 || canManageRoles) && (
              <div className="mt-3">
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {roles.length > 0 ? 'Roles' : 'No Roles'}
                </h3>
                <div className="flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <span
                      key={role.id}
                      className="flex items-center gap-1 rounded bg-[#2b2d31] px-1.5 py-0.5 text-[11px] font-bold text-gray-200"
                    >
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getRoleColor(role.color) }}
                      />
                      {role.name}
                      {canManageRoles && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(role.id)}
                          className="ml-0.5 flex items-center justify-center rounded-sm text-gray-400 transition-colors hover:text-white"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {canManageRoles && availableRoles.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-center rounded bg-[#2b2d31] px-1.5 py-0.5 text-gray-400 transition-colors hover:text-white"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="top"
                        className="max-h-48 w-52 overflow-y-auto rounded-md border-white/5 bg-[#111214] p-1 shadow-xl scrollbar-thin scrollbar-thumb-[#1a1b1e] scrollbar-track-transparent"
                      >
                        {availableRoles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleAddRole(role.id)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5"
                          >
                            <div
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: getRoleColor(role.color) }}
                            />
                            {role.name}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )}

            {user.id !== currentUser?.id && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleOpenDM}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[#5865f2] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#4752c4]"
                >
                  <MessageSquare className="size-4" />
                  Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
};

export default GuildMemberPopoverContent;
