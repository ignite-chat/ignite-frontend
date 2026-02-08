import { useState } from 'react';
import { UserCheck, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';
import { FriendsService } from '@/services/friends.service';
import UserProfileModal from '@/components/UserProfileModal';

const PendingRequests = ({ requests, currentUser }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleAction = (e, actionPromise, successMsg, errorMsg) => {
        e.stopPropagation(); // Prevent opening profile when clicking buttons
        actionPromise
            .then(() => toast.success(successMsg))
            .catch(() => toast.error(errorMsg));
    };

    const openProfile = (user) => {
        setSelectedUser(user);
        setIsProfileOpen(true);
    };

    return (
        <div className="space-y-1">
            <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
                Pending — {requests.length}
            </div>
            {requests.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center">
                    <p className="text-gray-500 text-sm">There are no pending friend requests.</p>
                </div>
            )}

            {requests.map(req => {
                const isOutgoing = req.sender_id === currentUser.id;
                const user = isOutgoing ? req.receiver : req.sender;

                return (
                    <div
                        key={req.id}
                        onClick={() => openProfile(user)}
                        className="group flex cursor-pointer items-center justify-between border-t border-gray-600/30 px-2 py-3 hover:bg-white/[0.05] hover:rounded-lg first:border-0"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar user={user} className="size-8 rounded-full" />
                            <div>
                                <div className="text-sm font-bold text-white group-hover:underline underline-offset-2 decoration-white/20">{user.username}</div>
                                <div className="text-xs text-gray-400">
                                    {isOutgoing ? 'Outgoing Friend Request' : 'Incoming Friend Request'}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isOutgoing && (
                                <button
                                    onClick={(e) => handleAction(e, FriendsService.acceptRequest(req.id), 'Request accepted', 'Failed to accept')}
                                    className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-green-500 hover:bg-gray-900"
                                >
                                    <UserCheck size={18} />
                                </button>
                            )}
                            <button
                                onClick={(e) => handleAction(e, FriendsService.cancelRequest(req.id), 'Request cancelled', 'Failed to cancel')}
                                className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-red-500 hover:bg-gray-900"
                            >
                                <UserMinus size={18} />
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Profile Modal */}
            {selectedUser && (
                <UserProfileModal
                    user={selectedUser}
                    isOpen={isProfileOpen}
                    setIsOpen={setIsProfileOpen}
                />
            )}
        </div>
    );
};
export default PendingRequests;
