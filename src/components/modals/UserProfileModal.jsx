import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Avatar from '@/components/Avatar';
import {
  UserCircle,
  UserPlus,
  ChatTeardropText,
  DotsThree,
  Notepad,
  Check,
  Prohibit,
  UserMinus,
  UserCheck,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useFriendsStore } from '@/store/friends.store';
import { useUsersStore } from '@/store/users.store';
import { FriendsService } from '@/services/friends.service';
import { UsersService } from '@/services/users.service';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useGuildsStore } from '@/store/guilds.store';
import { useModalStore } from '@/store/modal.store';
import { ChannelsService } from '@/services/channels.service';
import { useNavigate } from 'react-router-dom';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const UserProfileModal = ({ modalId, userId, guildId }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const user = useUsersStore((state) => state.users[userId]);
  const navigate = useNavigate();
  const { friends, requests } = useFriendsStore();
  const guildsStore = useGuildsStore();
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [mutualGuilds, setMutualGuilds] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);

  const closeModal = () => useModalStore.getState().close(modalId);

  const member = useMemo(() => {
    if (!guildId) return null;
    return (guildsStore.guildMembers[guildId] || []).find((m) => m.user_id === userId);
  }, [guildId, guildsStore.guildMembers, userId]);

  const isOwner = currentUser?.id === user?.id;

  useEffect(() => {
    if (!userId || isOwner) return;
    setActiveTab('about');
    setMutualGuilds([]);
    setMutualFriends([]);

    UsersService.getUserProfile(userId, guildId)
      .then((profile) => {
        setMutualGuilds(profile.mutual_guilds || []);
        setMutualFriends(profile.mutual_friends || []);
      })
      .catch(() => {});
  }, [userId]);

  const isFriend = useMemo(() => friends.some((f) => f.id === user?.id), [friends, user?.id]);

  const pendingRequest = useMemo(
    () =>
      requests.find(
        (req) =>
          (req.sender_id === currentUser?.id &&
            (req.receiver_id === user?.id || req.receiver?.username === user?.username)) ||
          (req.receiver_id === currentUser?.id &&
            (req.sender_id === user?.id || req.sender?.username === user?.username))
      ),
    [requests, currentUser?.id, user?.id, user?.username]
  );

  const isOutgoing = pendingRequest && pendingRequest.sender_id === currentUser?.id;
  const isIncoming = pendingRequest && pendingRequest.receiver_id === currentUser?.id;


  if (!user) return null;

  const handleAddFriend = async () => {
    if (isSending || isFriend || pendingRequest) return;
    setIsSending(true);
    try {
      await FriendsService.sendRequest(user.username);
      toast.success(`Friend request sent to ${user.username}`);
    } catch (error) {
      toast.error('Failed to send friend request');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await FriendsService.acceptRequest(pendingRequest.id);
      toast.success(`Accepted friend request from ${user.username}`);
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleRemoveFriend = async () => {
    try {
      if (isFriend) {
        await FriendsService.removeFriend(pendingRequest?.id || user.id);
        toast.success(`Removed ${user.username} from friends`);
      } else if (pendingRequest) {
        await FriendsService.cancelRequest(pendingRequest.id);
        if (isOutgoing) {
          toast.success(`Cancelled friend request to ${user.username}`);
        } else {
          toast.success(`Declined friend request from ${user.username}`);
        }
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  const handleSendMessage = async () => {
    try {
      const channel = await ChannelsService.createPrivateChannel([user.id]);
      if (channel) {
        closeModal();
        navigate(`/channels/@me/${channel.channel_id}`);
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };



  return (
    <Dialog open onOpenChange={closeModal}>
      <DialogContent aria-describedby={undefined} className="max-w-xl border-none bg-transparent p-0 shadow-2xl [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>User Profile</DialogTitle>
        </VisuallyHidden>
        <div className="w-full overflow-hidden rounded-xl bg-[#111214]">
          {/* Banner */}
          <div
          className={cn('aspect-[3/1] w-full', !user.banner_color && 'bg-primary')}
          style={{
            backgroundColor: user.banner_color,
            backgroundImage: user.banner_url ? `url(${user.banner_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="relative px-4 pb-4">
          {/* Avatar Area */}
          <div className="absolute -top-[50px] left-4">
            <div className="rounded-full ring-[6px] ring-[#111214]">
              <Avatar user={user} className="size-[94px] !cursor-default text-4xl" />
            </div>
            <div className="absolute bottom-0 right-0 size-6 rounded-full border-4 border-[#111214] bg-[#23a559]" />
          </div>

          {/* Actions Corner */}
          <div className="flex h-14 justify-end gap-2 pt-3">
            {!isOwner && (
              <>
                {isFriend ? (
                  <button
                    onClick={handleSendMessage}
                    className="flex h-9 items-center gap-2 rounded bg-[#5865f2] px-4 text-sm font-bold text-white transition hover:bg-[#4752c4]"
                  >
                    <ChatTeardropText size={18} weight="bold" />
                    Send Message
                  </button>
                ) : isOutgoing ? (
                  <button
                    onClick={handleRemoveFriend}
                    className="flex h-9 items-center gap-2 rounded bg-red-400/10 px-4 text-sm font-bold text-red-500 transition hover:bg-red-500 hover:text-white"
                  >
                    <X size={16} weight="bold" />
                    Cancel Request
                  </button>
                ) : isIncoming ? (
                  <button
                    onClick={handleAcceptRequest}
                    className="flex h-9 items-center gap-2 rounded bg-[#23a559] px-4 text-sm font-bold text-white transition hover:bg-[#1a7a42]"
                  >
                    <UserCheck size={18} weight="bold" />
                    Accept Request
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    disabled={isSending}
                    className="flex h-9 items-center gap-2 rounded bg-[#23a559] px-4 text-sm font-bold text-white transition hover:bg-[#1a7a42] disabled:opacity-50"
                  >
                    <UserPlus size={18} weight="bold" />
                    {isSending ? 'Sending...' : 'Add Friend'}
                  </button>
                )}

                {!isFriend && (
                  <button
                    onClick={handleSendMessage}
                    title="Send Message"
                    className="flex size-9 items-center justify-center rounded bg-[#2b2d31] text-gray-300 transition hover:bg-[#35373c] hover:text-white"
                  >
                    <ChatTeardropText size={20} weight="fill" />
                  </button>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      title="More"
                      className="flex size-9 items-center justify-center rounded bg-[#2b2d31] text-gray-300 transition hover:bg-[#35373c] hover:text-white"
                    >
                      <DotsThree size={24} weight="bold" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-48 rounded-md border-white/5 bg-[#111214] p-1 shadow-xl"
                  >
                    <div className="flex flex-col gap-0.5">
                      {isFriend && (
                        <button
                          onClick={handleRemoveFriend}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          Remove Friend
                          <UserMinus size={14} />
                        </button>
                      )}
                      {pendingRequest && (
                        <button
                          onClick={handleRemoveFriend}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          {isOutgoing ? 'Cancel Friend Request' : 'Decline Friend Request'}
                          <UserMinus size={14} />
                        </button>
                      )}
                      <button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10">
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
              </>
            )}
          </div>

          {/* Profile Body */}
          <div className="mt-4 px-1">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">{user.username}</h2>
              <div className="text-sm font-medium text-gray-300">{user.username}</div>
            </div>

            {/* Tabs */}
            {!isOwner && (
              <div className="mt-4 flex gap-4 border-b border-white/10">
                {[
                  { key: 'about', label: 'About Me' },
                  { key: 'servers', label: `Mutual Servers${mutualGuilds.length ? ` — ${mutualGuilds.length}` : ''}` },
                  { key: 'friends', label: `Mutual Friends${mutualFriends.length ? ` — ${mutualFriends.length}` : ''}` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'border-b-2 pb-2 text-xs font-semibold uppercase tracking-wide transition-colors',
                      activeTab === tab.key
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-5">
              {/* About Me Tab */}
              {(activeTab === 'about' || isOwner) && (
                <>
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      About Me
                    </h3>
                    <p className="text-[15px] leading-normal text-gray-200">
                      {user.bio || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Ignite Member Since
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-200">
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Note{' '}
                      <span className="text-[9px] font-medium lowercase opacity-60">
                        (only visible to you)
                      </span>
                    </h3>
                    <div className="group relative">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Click to add a note"
                        className="min-h-[40px] w-full resize-none rounded bg-transparent p-1 text-[13px] text-gray-200 transition-colors placeholder:text-gray-500 hover:bg-white/5 focus:outline-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Mutual Servers Tab */}
              {activeTab === 'servers' && !isOwner && (
                <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                  {mutualGuilds.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">No mutual servers</p>
                  ) : (
                    mutualGuilds.map((mutual) => {
                      const guild = guildsStore.guilds.find((g) => g.id === mutual.id);
                      if (!guild) return null;
                      return (
                        <button
                          key={mutual.id}
                          onClick={() => {
                            closeModal();
                            navigate(`/channels/${mutual.id}`);
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
                        >
                          {guild.icon_file_id ? (
                            <img
                              src={`${CDN_BASE}/icons/${guild.icon_file_id}`}
                              alt={guild.name}
                              className="size-8 rounded-full"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-full bg-[#2b2d31] text-xs font-semibold text-gray-300">
                              {guild.name?.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col items-start truncate">
                            <span className="truncate text-sm font-medium text-gray-200">{guild.name}</span>
                            {mutual.nick && (
                              <span className="truncate text-xs text-gray-400">{mutual.nick}</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Mutual Friends Tab */}
              {activeTab === 'friends' && !isOwner && (
                <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                  {mutualFriends.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">No mutual friends</p>
                  ) : (
                    mutualFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
                      >
                        <Avatar user={friend} className="size-8 !cursor-default text-xs" />
                        <span className="truncate text-sm font-medium text-gray-200">{friend.username}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
