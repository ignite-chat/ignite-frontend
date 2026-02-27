import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChannelContext } from '../../contexts/ChannelContext';
import { useUsersStore } from '@/store/users.store';
import { useGuildsStore } from '@/store/guilds.store';
import { useFriendsStore } from '@/store/friends.store';
import { UsersService } from '@/services/users.service';
import { FriendsService } from '@/services/friends.service';
import Avatar from '../Avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  UserPlus,
  UserMinus,
  UserCheck,
  X,
} from '@phosphor-icons/react';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const DMProfilePanel = ({ channel }) => {
  const { memberListOpen } = useChannelContext();
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const navigate = useNavigate();
  const { friends, requests } = useFriendsStore();
  const guildsStore = useGuildsStore();

  const [activeTab, setActiveTab] = useState('about');
  const [mutualGuilds, setMutualGuilds] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  const otherRecipient = useMemo(
    () => (channel?.recipients || []).find((r) => r.id !== currentUser?.id),
    [channel?.recipients, currentUser?.id]
  );

  const userId = otherRecipient?.id;
  const user = useUsersStore((state) => state.users[userId]) || otherRecipient;

  useEffect(() => {
    if (!userId) return;
    setActiveTab('about');
    setMutualGuilds([]);
    setMutualFriends([]);

    UsersService.getUserProfile(userId)
      .then((profile) => {
        setMutualGuilds(profile.mutual_guilds || []);
        setMutualFriends(profile.mutual_friends || []);
      })
      .catch(() => {});
  }, [userId]);

  const isFriend = useMemo(() => friends.some((f) => f.id === userId), [friends, userId]);

  const pendingRequest = useMemo(
    () =>
      requests.find(
        (req) =>
          (req.sender_id === currentUser?.id &&
            (req.receiver_id === userId || req.receiver?.username === user?.username)) ||
          (req.receiver_id === currentUser?.id &&
            (req.sender_id === userId || req.sender?.username === user?.username))
      ),
    [requests, currentUser?.id, userId, user?.username]
  );

  const isOutgoing = pendingRequest && pendingRequest.sender_id === currentUser?.id;
  const isIncoming = pendingRequest && pendingRequest.receiver_id === currentUser?.id;

  const handleAddFriend = async () => {
    if (isSending || isFriend || pendingRequest) return;
    setIsSending(true);
    try {
      await FriendsService.sendRequest(user.username);
      toast.success(`Friend request sent to ${user.username}`);
    } catch {
      toast.error('Failed to send friend request');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await FriendsService.acceptRequest(pendingRequest.id);
      toast.success(`Accepted friend request from ${user.username}`);
    } catch {
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
    } catch {
      toast.error('Operation failed');
    }
  };

  if (!user) return null;

  const tabs = [
    { key: 'about', label: 'About Me' },
    { key: 'servers', label: `Mutual Servers${mutualGuilds.length ? ` \u2014 ${mutualGuilds.length}` : ''}` },
    { key: 'friends', label: `Mutual Friends${mutualFriends.length ? ` \u2014 ${mutualFriends.length}` : ''}` },
  ];

  return (
    <div
      className={`relative z-0 transition-all duration-300 ${memberListOpen ? 'w-72 md:w-96' : 'w-0'}`}
    >
      {memberListOpen && (
        <div className="flex h-full flex-col border-l border-white/5 bg-[#111214]">
          <div className="flex-1 overflow-y-auto">
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
              {/* Avatar */}
              <div className="absolute -top-[40px] left-4">
                <div className="rounded-full ring-4 ring-[#111214]">
                  <Avatar user={user} size={80} className="!cursor-default text-3xl" showStatus showOffline />
                </div>
              </div>

              {/* Friend action */}
              <div className="flex h-12 justify-end pt-2">
                {isFriend ? (
                  <button
                    onClick={handleRemoveFriend}
                    title="Remove Friend"
                    className="flex size-8 items-center justify-center rounded bg-[#2b2d31] text-gray-300 transition hover:bg-[#35373c] hover:text-white"
                  >
                    <UserMinus size={16} />
                  </button>
                ) : isOutgoing ? (
                  <button
                    onClick={handleRemoveFriend}
                    title="Cancel Request"
                    className="flex size-8 items-center justify-center rounded bg-red-400/10 text-red-500 transition hover:bg-red-500/20"
                  >
                    <X size={16} weight="bold" />
                  </button>
                ) : isIncoming ? (
                  <button
                    onClick={handleAcceptRequest}
                    title="Accept Request"
                    className="flex size-8 items-center justify-center rounded bg-[#23a559] text-white transition hover:bg-[#1a7a42]"
                  >
                    <UserCheck size={16} weight="bold" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    disabled={isSending}
                    title="Add Friend"
                    className="flex size-8 items-center justify-center rounded bg-[#23a559] text-white transition hover:bg-[#1a7a42] disabled:opacity-50"
                  >
                    <UserPlus size={16} weight="bold" />
                  </button>
                )}
              </div>

              {/* Name */}
              <div className="mt-1 space-y-0.5">
                <h2 className="text-lg font-bold text-white">{user.name || user.username}</h2>
                <div className="text-xs font-medium text-gray-400">{user.username}</div>
              </div>

              {/* Tabs */}
              <div className="mt-3 flex gap-3 border-b border-white/10">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'border-b-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                      activeTab === tab.key
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-4">
                {/* About Me Tab */}
                {activeTab === 'about' && (
                  <>
                    <div className="space-y-1.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        About Me
                      </h3>
                      <p className="text-[13px] leading-normal text-gray-200">
                        {user.bio || 'No description provided.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Ignite Member Since
                      </h3>
                      <div className="text-[13px] text-gray-200">
                        {(() => {
                          const raw = user.created_at;
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

                    <div className="space-y-1.5">
                      <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Note{' '}
                        <span className="text-[9px] font-medium lowercase opacity-60">
                          (only visible to you)
                        </span>
                      </h3>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Click to add a note"
                        className="min-h-[36px] w-full resize-none rounded bg-transparent p-1 text-[12px] text-gray-200 transition-colors placeholder:text-gray-500 hover:bg-white/5 focus:outline-none"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Mutual Servers Tab */}
                {activeTab === 'servers' && (
                  <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
                    {mutualGuilds.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">No mutual servers</p>
                    ) : (
                      mutualGuilds.map((mutual) => {
                        const guild = guildsStore.guilds.find((g) => g.id === mutual.id);
                        if (!guild) return null;
                        return (
                          <button
                            key={mutual.id}
                            onClick={() => navigate(`/channels/${mutual.id}`)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
                          >
                            {guild.icon_file_id ? (
                              <img
                                src={`${CDN_BASE}/icons/${guild.icon_file_id}`}
                                alt={guild.name}
                                className="size-7 rounded-full"
                              />
                            ) : (
                              <div className="flex size-7 items-center justify-center rounded-full bg-[#2b2d31] text-[10px] font-semibold text-gray-300">
                                {guild.name?.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col items-start truncate">
                              <span className="truncate text-xs font-medium text-gray-200">{guild.name}</span>
                              {mutual.nick && (
                                <span className="truncate text-[10px] text-gray-400">{mutual.nick}</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Mutual Friends Tab */}
                {activeTab === 'friends' && (
                  <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
                    {mutualFriends.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">No mutual friends</p>
                    ) : (
                      mutualFriends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
                        >
                          <Avatar user={friend} size={28} className="!cursor-default text-[10px]" />
                          <span className="truncate text-xs font-medium text-gray-200">{friend.username}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DMProfilePanel;
