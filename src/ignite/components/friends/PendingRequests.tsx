import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { DiscordLogo } from '@phosphor-icons/react';
import { toast } from 'sonner';
import Avatar from '@/ignite/components/Avatar';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatExactDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
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
  const relationship = useDiscordRelationshipsStore((s) => s.relationships.find((r) => r.id === user.id));
  const sentAgo = relationship?.since ? timeAgo(relationship.since) : null;
  const sentExact = relationship?.since ? formatExactDate(relationship.since) : null;

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
    <div className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30">
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
            {user.username}
            {sentAgo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-default text-gray-500">· {sentAgo}</span>
                </TooltipTrigger>
                <TooltipContent side="top">{sentExact}</TooltipContent>
              </Tooltip>
            )}
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
  searchQuery: string;
};

type MergedPending =
  | { source: 'ignite'; data: FriendRequest; sortName: string; isOutgoing: boolean }
  | { source: 'discord'; data: DiscordPendingRequest; sortName: string; isOutgoing: boolean };

const PendingRequests = ({ requests, currentUser, discordRequests, searchQuery }: PendingRequestsProps) => {
  const getUser = useUsersStore((s) => s.getUser);
  const openProfile = (userId: string) => {
    useModalStore.getState().push(UserProfileModal, { userId });
  };

  const { incoming, outgoing } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const items: MergedPending[] = [
      ...requests.map((req): MergedPending => {
        const outgoing = req.sender_id === currentUser.id;
        const userId = outgoing ? req.receiver?.id : req.sender?.id;
        const user = (userId && getUser(userId)) || (outgoing ? req.receiver : req.sender);
        return {
          source: 'ignite',
          data: req,
          sortName: (user?.name || user?.username || '').toLowerCase(),
          isOutgoing: outgoing,
        };
      }),
      ...discordRequests.map((r): MergedPending => ({
        source: 'discord',
        data: r,
        sortName: (r.user.global_name || r.user.username || '').toLowerCase(),
        isOutgoing: r.isOutgoing,
      })),
    ];
    const filtered = query ? items.filter((i) => i.sortName.includes(query)) : items;
    const sorted = filtered.sort((a, b) => a.sortName.localeCompare(b.sortName));
    return {
      incoming: sorted.filter((i) => !i.isOutgoing),
      outgoing: sorted.filter((i) => i.isOutgoing),
    };
  }, [requests, currentUser, discordRequests, getUser, searchQuery]);

  const total = incoming.length + outgoing.length;

  const renderItem = (item: MergedPending) =>
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
    );

  return (
    <div className="space-y-1">
      {total === 0 && searchQuery.trim() && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500">No one with that name can be found.</p>
        </div>
      )}
      {incoming.length > 0 && (
        <>
          <div className="mt-4 text-[12px] font-medium text-gray-400">
            Received — {incoming.length}
          </div>
          {incoming.map(renderItem)}
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <div className="mt-4 text-[12px] font-medium text-gray-400">
            Outgoing — {outgoing.length}
          </div>
          {outgoing.map(renderItem)}
        </>
      )}
    </div>
  );
};

export default PendingRequests;
