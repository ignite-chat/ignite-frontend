import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import Message from './Message';
import MessageSkeletonList from '@/components/message/MessageSkeleton';
import { CircleNotch, Hash, SpeakerHigh, UserPlus, UserCheck, X } from '@phosphor-icons/react';
import { ChannelType } from '@/ignite/constants/ChannelType';
import { useUsersStore } from '@/ignite/store/users.store';
import { useGuildsStore } from '@/ignite/store/guilds.store';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { UsersService } from '@/ignite/services/users.service';
import { FriendsService } from '@/ignite/services/friends.service';
import Avatar from '../Avatar';
import GuildIcon from '../GuildIcon';
import UserProfileModal from '@/components/modals/UserProfileModal';
import { useModalStore } from '@/store/modal.store';
import { toast } from 'sonner';

const NewMessagesSeparator = () => (
  <div className="flex items-center gap-1 pl-4 pr-3.5 mt-1.5 mb-0.5">
    <div className="flex-1 h-px bg-destructive" />
    <span className="text-[11px] font-bold text-destructive leading-none">NEW</span>
  </div>
);

const DateSeparator = ({ timestamp }) => {
  const label = new Date(timestamp).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="my-2 flex items-center gap-2 px-4">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] font-semibold text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
};

const DMWelcome = ({ channel }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const { friends, requests } = useFriendsStore();
  const guildsStore = useGuildsStore();

  const [mutualGuilds, setMutualGuilds] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const otherRecipient = useMemo(
    () => (channel?.recipients || []).find((r) => r.id !== currentUser?.id),
    [channel?.recipients, currentUser?.id]
  );

  const userId = otherRecipient?.id;
  const user = useUsersStore((state) => state.users[userId]) || otherRecipient;

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

  useEffect(() => {
    if (!userId) return;
    UsersService.getUserProfile(userId)
      .then((profile) => setMutualGuilds(profile.mutual_guilds || []))
      .catch(() => {});
  }, [userId]);

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

  const handleCancelRequest = async () => {
    try {
      if (pendingRequest) {
        await FriendsService.cancelRequest(pendingRequest.id);
        toast.success(isOutgoing
          ? `Cancelled friend request to ${user.username}`
          : `Declined friend request from ${user.username}`
        );
      }
    } catch {
      toast.error('Operation failed');
    }
  };

  if (!user) return null;

  return (
    <div className="px-4 pb-4 pt-8">
      {/* Banner */}
      <div
        className={cn('h-28 w-full rounded-t-lg', !user.banner_color && 'bg-primary')}
        style={{
          backgroundColor: user.banner_color,
          backgroundImage: user.banner_url ? `url(${user.banner_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Avatar overlapping banner */}
      <div className="relative px-4">
        <div className="absolute -top-[40px]">
          <div
            className="group relative cursor-pointer rounded-full ring-[5px] ring-[#313338]"
            onClick={() => useModalStore.getState().push(UserProfileModal, { userId: user.id })}
          >
            <Avatar user={user} size={80} className="text-3xl" showStatus />
            <div className="absolute inset-0 rounded-full bg-black/0 transition-colors group-hover:bg-black/20" />
          </div>
        </div>

        {/* Friend action buttons */}
        <div className="flex h-12 justify-end pt-2">
          {isFriend ? (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <UserCheck size={14} weight="bold" className="text-green-400" />
              Friends
            </span>
          ) : isOutgoing ? (
            <button
              onClick={handleCancelRequest}
              title="Cancel Request"
              className="flex items-center gap-1.5 rounded bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
            >
              <X size={14} weight="bold" />
              Cancel Request
            </button>
          ) : isIncoming ? (
            <button
              onClick={handleAcceptRequest}
              title="Accept Request"
              className="flex items-center gap-1.5 rounded bg-[#23a559] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#1a7a42]"
            >
              <UserCheck size={14} weight="bold" />
              Accept Request
            </button>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={isSending}
              title="Add Friend"
              className="flex items-center gap-1.5 rounded bg-[#23a559] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#1a7a42] disabled:opacity-50"
            >
              <UserPlus size={14} weight="bold" />
              Add Friend
            </button>
          )}
        </div>

        {/* Name */}
        <div
          className="mt-1 cursor-pointer"
          onClick={() => useModalStore.getState().push(UserProfileModal, { userId: user.id })}
        >
          <h1 className="text-[28px] font-bold leading-tight text-white hover:underline">
            {user.name || user.username}
          </h1>
          <p className="text-sm font-medium text-gray-400">{user.username}</p>
        </div>

        <p className="mt-2 text-sm text-gray-400">
          This is the beginning of your direct message history with{' '}
          <span className="font-semibold text-white">{user.username}</span>.
        </p>

        {mutualGuilds.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {mutualGuilds.slice(0, 5).map((mutual) => {
                const guild = guildsStore.guilds.find((g) => g.id === mutual.id);
                if (!guild) return null;
                return <GuildIcon key={mutual.id} guild={guild} size={6} />;
              })}
            </div>
            <span className="text-xs text-gray-400">
              {mutualGuilds.length} Mutual Server{mutualGuilds.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const GuildChannelWelcome = ({ channel }) => {
  const isVoice = channel.type === ChannelType.GUILD_VOICE;
  return (
    <div className="px-4 pb-2 pt-16">
      <div className="mb-2 flex size-[68px] items-center justify-center rounded-full bg-white/10">
        {isVoice
          ? <SpeakerHigh className="size-10 text-white" weight="fill" />
          : <Hash className="size-10 text-white" weight="bold" />}
      </div>
      <h1 className="text-[28px] font-bold leading-tight text-white">
        Welcome to #{channel.name}!
      </h1>
      {channel.topic && (
        <p className="mt-1 text-sm text-gray-400">
          This is the start of the #{channel.name} channel. {channel.topic}
        </p>
      )}
    </div>
  );
};

const ChannelWelcome = ({ channel }) => {
  const isDM = channel.type === ChannelType.DM;
  return isDM ? <DMWelcome channel={channel} /> : <GuildChannelWelcome channel={channel} />;
};

const MessageList = ({
  channel,
  messages,
  pendingMessages,
  editingId,
  setEditingId,
  highlightId,
  guildId,
  isLoading,
  hasMore,
  loadingMore,
  newMessagesSeparatorId,
}) => {
  if (isLoading) {
    return <MessageSkeletonList />;
  }

  return (
    <>
      {loadingMore && (
        <div className="flex justify-center py-4">
          <CircleNotch size={24} className="animate-spin text-gray-500" />
        </div>
      )}

      {!hasMore && !loadingMore && channel && (
        <ChannelWelcome channel={channel} />
      )}

      {messages?.map((message, index) => {
        const prevMessage = messages[index - 1] || null;
        const isHighlighted = highlightId === message.id;
        const showNewSeparator = newMessagesSeparatorId &&
          message.id.localeCompare(newMessagesSeparatorId) > 0 &&
          (!prevMessage || prevMessage.id.localeCompare(newMessagesSeparatorId) <= 0);

        const showDateSeparator = !prevMessage ||
          new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();

        return (
          <div
            key={message.id}
            id={`msg-${message.id}`}
            className={cn(
              'relative',
              isHighlighted && 'animate-message-highlight'
            )}
          >
            {showDateSeparator && <DateSeparator timestamp={message.created_at} />}
            {showNewSeparator && <NewMessagesSeparator />}
            <Message
              message={message}
              prevMessage={prevMessage}
              allMessages={messages}
              isEditing={editingId === message.id}
              setEditingId={setEditingId}
              guildId={guildId}
              isHighlighted={isHighlighted}
            />
          </div>
        );
      })}

      {pendingMessages?.map((message, index) => {
        const prevMessage = pendingMessages[index - 1] || messages[messages.length - 1] || null;
        return (
          <Message
            key={message.nonce}
            message={message}
            prevMessage={prevMessage}
            allMessages={messages}
            pending={true}
            isEditing={false}
            setEditingId={setEditingId}
            guildId={guildId}
            isHighlighted={false}
          />
        );
      })}
    </>
  );
};

export default MessageList;
