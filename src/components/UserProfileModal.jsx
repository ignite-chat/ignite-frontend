import { useState, useContext, useMemo } from 'react';
import Dialog from './Dialog';
import Avatar from './Avatar';
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
import { cn } from '../lib/utils';
import useStore from '../hooks/useStore';
import { useFriendsStore } from '../store/friends.store';
import { FriendsService } from '../services/friends.service';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { GuildContext } from '../contexts/GuildContext';
import { useGuildsStore } from '../store/guilds.store';
import { ChannelsService } from '../services/channels.service';
import { useNavigate } from 'react-router-dom';

const UserProfileModal = ({ user, isOpen, setIsOpen }) => {
  const store = useStore();
  const navigate = useNavigate();
  const { friends, requests } = useFriendsStore();
  const guildContext = useContext(GuildContext);
  const guildsStore = useGuildsStore();
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isOwner = store.user?.id === user?.id;

  const isFriend = useMemo(() => friends.some((f) => f.id === user?.id), [friends, user?.id]);

  const pendingRequest = useMemo(
    () =>
      requests.find(
        (req) =>
          (req.sender_id === store.user?.id &&
            (req.receiver_id === user?.id || req.receiver?.username === user?.username)) ||
          (req.receiver_id === store.user?.id &&
            (req.sender_id === user?.id || req.sender?.username === user?.username))
      ),
    [requests, store.user?.id, user?.id, user?.username]
  );

  const isOutgoing = pendingRequest && pendingRequest.sender_id === store.user?.id;
  const isIncoming = pendingRequest && pendingRequest.receiver_id === store.user?.id;

  const guildId = guildContext?.guildId;
  const member = useMemo(
    () =>
      guildId
        ? (guildsStore.guildMembers[guildId] || []).find((m) => m.user_id === user?.id)
        : null,
    [guildId, guildsStore.guildMembers, user?.id]
  );
  const roles = member?.roles || user?.roles || [];
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => (b.position || 0) - (a.position || 0)),
    [roles]
  );

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
        setIsOpen(false);
        navigate(`/channels/@me/${channel.channel_id}`);
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const getRoleColor = (color) => {
    if (!color || color === 0) return '#5865f2';
    return typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
  };

  return (
    <Dialog isOpen={isOpen} setIsOpen={setIsOpen} outsideChildren="" transparent noPadding>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-white/5 bg-[#111214] shadow-2xl">
        {/* Banner */}
        <div
          className={cn('h-[120px] w-full', !user.banner_color && 'bg-primary')}
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
            <div className="rounded-full border-[7px] border-white/5 bg-[#111214]">
              <Avatar user={user} className="size-[94px] !cursor-default text-4xl" />
            </div>
            <div className="absolute bottom-2 right-2 size-6 rounded-full border-[5px] border-white/5 bg-[#23a559]" />
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
          <div className="mt-4 space-y-5 px-1">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">{user.username}</h2>
              <div className="text-sm font-medium text-gray-300">{user.username}</div>
            </div>

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
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Feb 8, 2026'}
              </div>
            </div>

            {sortedRoles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Roles
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {sortedRoles.map((role) => (
                    <span
                      key={role.id}
                      className="flex items-center gap-1.5 rounded bg-[#2b2d31] px-2 py-1 text-[11px] font-bold text-gray-200"
                    >
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: getRoleColor(role.color) }}
                      />
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default UserProfileModal;
