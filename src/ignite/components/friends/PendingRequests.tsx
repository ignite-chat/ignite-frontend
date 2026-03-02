import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { DiscordLogo } from '@phosphor-icons/react';
import { toast } from 'sonner';
import Avatar from '@/ignite/components/Avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { useModalStore } from '@/ignite/store/modal.store';
import { FriendsService } from '@/ignite/services/friends.service';
import { useUsersStore } from '@/ignite/store/users.store';
import type { FriendRequest } from '@/ignite/store/friends.store';
import type { User } from '@/ignite/store/users.store';
import type { DiscordUser } from '@/discord/store/discord-users.store';
import { DiscordService } from '@/discord/services/discord.service';
import { DiscordApiService } from '@/discord/services/discord-api.service';
import { useDiscordRelationshipsStore } from '@/discord/store/discord-relationships.store';

type PendingRequestRowProps = {
  request: FriendRequest;
  currentUser: User;
  onClickUser: (userId: string) => void;
};

const PendingRequestRow = ({ request, currentUser, onClickUser }: PendingRequestRowProps) => {
  const getUser = useUsersStore((s) => s.getUser);
  const isOutgoing = request.sender_id === currentUser.id;
  const userId = isOutgoing ? request.receiver?.id : request.sender?.id;
  const user = (userId && getUser(userId)) || (isOutgoing ? request.receiver : request.sender);

  const handleAction = (actionPromise: Promise<void>, successMsg: string, errorMsg: string) => {
    actionPromise.then(() => toast.success(successMsg)).catch(() => toast.error(errorMsg));
  };

  return (
    <div
      onClick={() => user && onClickUser(user.id)}
      className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
    >
      <div className="flex items-center gap-3">
        <Avatar user={user} size={32} />
        <div>
          <div className="text-sm font-bold text-white">{user?.name}</div>
          <div className="text-xs text-gray-400">{user?.username}</div>
        </div>
      </div>
      <div className="flex gap-2">
        {!isOutgoing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(
                    FriendsService.acceptRequest(request.id),
                    'Request accepted',
                    'Failed to accept'
                  );
                }}
                className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:text-green-500 hover:bg-gray-900"
              >
                <Check size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Accept</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(
                  FriendsService.cancelRequest(request.id),
                  'Request cancelled',
                  'Failed to cancel'
                );
              }}
              className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-900"
            >
              <X size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{isOutgoing ? 'Cancel' : 'Ignore'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

type DiscordPendingRowProps = {
  user: DiscordUser;
  isOutgoing: boolean;
};

const DiscordPendingRow = ({ user, isOutgoing }: DiscordPendingRowProps) => {
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 64);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DiscordApiService.acceptFriendRequest(user.id);
      useDiscordRelationshipsStore.getState().removeRelationship(user.id);
      toast.success(`Accepted friend request from ${user.global_name || user.username}`);
    } catch {
      toast.error('Failed to accept friend request');
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DiscordApiService.deleteRelationship(user.id);
      useDiscordRelationshipsStore.getState().removeRelationship(user.id);
      toast.success(isOutgoing ? 'Cancelled friend request' : 'Declined friend request');
    } catch {
      toast.error('Failed to decline friend request');
    }
  };

  return (
    <div className="border-white/5/30 group flex items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30">
      <div className="flex items-center gap-3">
        <img
          src={avatarUrl}
          alt={user.global_name || user.username}
          className="size-8 rounded-full object-cover"
        />
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            {user.global_name || user.username}
            <Tooltip>
              <TooltipTrigger asChild>
                <DiscordLogo size={14} weight="fill" className="shrink-0 text-[#5865f2]" />
              </TooltipTrigger>
              <TooltipContent side="top">Discord</TooltipContent>
            </Tooltip>
          </div>
          <div className="text-xs text-gray-400">
            {isOutgoing ? 'Outgoing Friend Request' : 'Incoming Friend Request'}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {!isOutgoing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleAccept}
                className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-900 hover:text-green-500"
              >
                <Check size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Accept</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDecline}
              className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-900 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{isOutgoing ? 'Cancel' : 'Ignore'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export type DiscordPendingRequest = {
  user: DiscordUser;
  isOutgoing: boolean;
};

type PendingRequestsProps = {
  requests: FriendRequest[];
  currentUser: User;
  discordRequests: DiscordPendingRequest[];
};

type MergedPending =
  | { source: 'ignite'; data: FriendRequest; sortName: string }
  | { source: 'discord'; data: DiscordPendingRequest; sortName: string };

const PendingRequests = ({ requests, currentUser, discordRequests }: PendingRequestsProps) => {
  const getUser = useUsersStore((s) => s.getUser);
  const openProfile = (userId: string) => {
    useModalStore.getState().push(UserProfileModal, { userId });
  };

  const merged = useMemo(() => {
    const items: MergedPending[] = [
      ...requests.map((req): MergedPending => {
        const isOutgoing = req.sender_id === currentUser.id;
        const userId = isOutgoing ? req.receiver?.id : req.sender?.id;
        const user = (userId && getUser(userId)) || (isOutgoing ? req.receiver : req.sender);
        return {
          source: 'ignite',
          data: req,
          sortName: (user?.name || user?.username || '').toLowerCase(),
        };
      }),
      ...discordRequests.map((r): MergedPending => ({
        source: 'discord',
        data: r,
        sortName: (r.user.global_name || r.user.username || '').toLowerCase(),
      })),
    ];
    return items.sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [requests, currentUser, discordRequests, getUser]);

  return (
    <div className="space-y-1">
      <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
        Pending — {merged.length}
      </div>
      {merged.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="text-sm text-gray-500">There are no pending friend requests.</p>
        </div>
      )}

      {merged.map((item) =>
        item.source === 'ignite' ? (
          <PendingRequestRow
            key={item.data.id}
            request={item.data}
            currentUser={currentUser}
            onClickUser={openProfile}
          />
        ) : (
          <DiscordPendingRow
            key={`discord-${item.data.user.id}`}
            user={item.data.user}
            isOutgoing={item.data.isOutgoing}
          />
        )
      )}
    </div>
  );
};

export default PendingRequests;
