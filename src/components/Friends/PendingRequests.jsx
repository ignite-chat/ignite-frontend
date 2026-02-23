import { UserCheck, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { FriendsService } from '@/services/friends.service';

const PendingRequests = ({ requests, currentUser }) => {
  const handleAction = (actionPromise, successMsg, errorMsg) => {
    actionPromise.then(() => toast.success(successMsg)).catch(() => toast.error(errorMsg));
  };

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

      {requests.map((req) => {
        const isOutgoing = req.sender_id === currentUser.id;
        const user = isOutgoing ? req.receiver : req.sender;

        return (
          <div
            key={req.id}
            className="border-white/5/30 group flex items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
          >
            <div className="flex items-center gap-3">
              <Avatar user={user} className="size-8 rounded-full" />
              <div>
                <div className="text-sm font-bold text-white">{user.username}</div>
                <div className="text-xs text-gray-400">
                  {isOutgoing ? 'Outgoing Friend Request' : 'Incoming Friend Request'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isOutgoing && (
                <button
                  onClick={() =>
                    handleAction(
                      FriendsService.acceptRequest(req.id),
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
                    FriendsService.cancelRequest(req.id),
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
      })}
    </div>
  );
};

export default PendingRequests;
