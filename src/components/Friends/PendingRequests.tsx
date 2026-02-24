import { Check, Minus, UserCheck, UserMinus, X } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import UserProfileModal from '@/components/modals/UserProfileModal';
import { useModalStore } from '@/store/modal.store';
import { FriendsService } from '@/services/friends.service';
import { useUsersStore } from '@/store/users.store';
import type { FriendRequest } from '@/store/friends.store';
import type { User } from '@/store/users.store';

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
        <Avatar user={user} className="size-8 rounded-full" />
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

type PendingRequestsProps = {
  requests: FriendRequest[];
  currentUser: User;
};

const PendingRequests = ({ requests, currentUser }: PendingRequestsProps) => {
  const openProfile = (userId: string) => {
    useModalStore.getState().push(UserProfileModal, { userId });
  };

  return (
    <>
      <div className="space-y-1">
        <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
          Pending — {requests.length}
        </div>
        {requests.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center">
            <p className="text-sm text-gray-500">There are no pending friend requests.</p>
          </div>
        )}

        {requests.map((req) => (
          <PendingRequestRow
            key={req.id}
            request={req}
            currentUser={currentUser}
            onClickUser={openProfile}
          />
        ))}
      </div>
    </>
  );
};

export default PendingRequests;
