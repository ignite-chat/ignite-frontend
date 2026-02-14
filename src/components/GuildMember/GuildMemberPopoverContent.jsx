import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../hooks/useStore';
import { UserCheck, UserMinus, UserPlus, UserX, Ban, Copy, ClipboardCopy } from 'lucide-react';
import Avatar from '../Avatar';
import { FriendsService } from '../../services/friends.service';
import { ChannelsService } from '../../services/channels.service';
import { useFriendsStore } from '../../store/friends.store';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  CircleNotch,
  DotsThree,
  Prohibit,
  UserCircle,
  ChatTeardropText,
} from '@phosphor-icons/react';
import GuildMemberContextMenu from './GuildMemberContextMenu';
import { toast } from 'sonner';
import UserProfileModal from '../UserProfileModal';
import { useUsersStore } from '@/store/users.store';

const GuildMemberPopoverContent = ({ userId, guild = null }) => {
  const store = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { friends, requests } = useFriendsStore();
  const { getUser, users } = useUsersStore();
  const user = useMemo(() => getUser(userId), [userId, getUser, users]);

  const isFriend = useMemo(() => {
    return friends.some((friend) => friend.id === user.id);
  }, [friends, user.id]);

  const hasSentRequest = useMemo(() => {
    return requests.some((request) => request.receiver_id === user.id);
  }, [requests, user.id]);

  const hasReceivedRequest = useMemo(() => {
    return requests.some((request) => request.sender_id === user.id);
  }, [requests, user.id]);

  const friendRequestId = useMemo(() => {
    const request = requests.find(
      (request) => request.sender_id === user.id || request.receiver_id === user.id
    );
    return request ? request.id : null;
  }, [requests, user.id]);

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

  const handleSendMessage = async () => {
    try {
      const channel = await ChannelsService.createPrivateChannel([user.id]);
      if (channel) {
        navigate(`/channels/@me/${channel.channel_id}`);
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  const handleBlock = () => {
    toast.info('Block feature coming soon!');
  };

  console.log(user);

  return (
    <>
      {loading ? (
        <CircleNotch className="mx-auto animate-spin text-gray-500" />
      ) : (
        <div className="w-80 overflow-hidden rounded-lg border border-white/5 bg-[#111214] shadow-xl">
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
                onClick={() => setProfileModalOpen(true)}
                className="group relative rounded-full"
              >
                <div className="rounded-full border-[6px] border-white/5 bg-[#111214] transition hover:brightness-110">
                  <Avatar user={user} className="size-20 !cursor-pointer text-3xl" />
                </div>
                {user.status === 'online' && (
                  <div className="absolute bottom-1 right-1 z-10 size-6 rounded-full border-4 border-white/5 bg-[#23a559]" />
                )}

                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="text-[10px] font-bold uppercase text-white drop-shadow-md">
                    View Profile
                  </span>
                </div>
              </button>
            </div>

            <div className="absolute right-3 top-3 flex items-center gap-2">
              {user.id !== store.user?.id && (
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
              <h2 className="flex items-center gap-1.5 text-lg font-bold text-white">
                {user.name}
              </h2>
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
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Feb 8, 2026'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal user={user} isOpen={profileModalOpen} setIsOpen={setProfileModalOpen} />
    </>
  );
};

export default GuildMemberPopoverContent;
