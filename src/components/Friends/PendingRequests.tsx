import { UserCheck, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { FriendsService } from '@/services/friends.service';
import type { FriendRequest } from '@/store/friends.store';
import type { User } from '@/store/users.store';

type PendingRequestRowProps = {
  request: FriendRequest;
  currentUser: User;
};

const PendingRequestRow = ({ request, currentUser }: PendingRequestRowProps) => {
  const isOutgoing = request.sender_id === currentUser.id;
  const user = isOutgoing ? request.receiver : request.sender;

  const handleAction = (actionPromise: Promise<void>, successMsg: string, errorMsg: string) => {
    actionPromise.then(() => toast.success(successMsg)).catch(() => toast.error(errorMsg));
  };

  return (
    <div className="border-white/5/30 group flex items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30">
      <div className="flex items-center gap-3">
        <Avatar user={user} className="size-8 rounded-full" />
        <div>
          <div className="text-sm font-bold text-white">{user?.name}</div>
          <div className="text-xs text-gray-400">{user?.username}</div>
        </div>
      </div>
      <div className="flex gap-2">
        {!isOutgoing && (
          <button
            onClick={() =>
              handleAction(
                FriendsService.acceptRequest(request.id),
                'Request accepted',
                'Failed to accept'
              )
            }
            className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-green-500 hover:bg-gray-900"
          >
            <UserCheck size={18} />
          </button>
        )}
        <button
          onClick={() =>
            handleAction(
              FriendsService.cancelRequest(request.id),
              'Request cancelled',
              'Failed to cancel'
            )
          }
          className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-red-500 hover:bg-gray-900"
        >
          <UserMinus size={18} />
        </button>
      </div>
    </div>
  );
};

type PendingRequestsProps = {
  requests: FriendRequest[];
  currentUser: User;
};

const PendingRequests = ({ requests, currentUser }: PendingRequestsProps) => {
  return (
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
        <PendingRequestRow key={req.id} request={req} currentUser={currentUser} />
      ))}
    </div>
  );
};

export default PendingRequests;
