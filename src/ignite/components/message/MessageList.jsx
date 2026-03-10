import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Message from './Message';
import MessageSkeletonList from '@/components/message/MessageSkeleton';
import { CircleNotch, Hash, SpeakerHigh, UserPlus } from '@phosphor-icons/react';
import { ChannelType } from '@/ignite/constants/ChannelType';
import { useUsersStore } from '@/ignite/store/users.store';
import { useGuildsStore } from '@/ignite/store/guilds.store';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { UsersService } from '@/ignite/services/users.service';
import { FriendsService } from '@/ignite/services/friends.service';
import Avatar from '../Avatar';
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

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const DMWelcome = ({ channel }) => {
  const navigate = useNavigate();
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
  const hasPendingRequest = useMemo(
    () => requests.some((req) => req.sender_id === userId || req.receiver_id === userId ||
      req.sender?.id === userId || req.receiver?.id === userId),
    [requests, userId]
  );

  useEffect(() => {
    if (!userId) return;
    UsersService.getUserProfile(userId)
      .then((profile) => setMutualGuilds(profile.mutual_guilds || []))
      .catch(() => {});
  }, [userId]);

  const handleAddFriend = async () => {
    if (isSending) return;
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

  if (!user) return null;

  return (
    <div className="px-4 pb-4 pt-16">
      <Avatar user={user} size={80} className="text-3xl" />
      <h1 className="mt-2 text-[28px] font-bold leading-tight text-white">
        {user.name || user.username}
      </h1>
      <p className="text-sm text-gray-400">{user.username}</p>
      <p className="mt-2 text-sm text-gray-400">
        This is the beginning of your direct message history with{' '}
        <span className="font-semibold text-white">{user.username}</span>.
      </p>
      {(mutualGuilds.length > 0 || (!isFriend && !hasPendingRequest)) && (
        <div className="mt-3 flex items-center gap-3">
          {mutualGuilds.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {mutualGuilds.slice(0, 5).map((mutual) => {
                  const guild = guildsStore.guilds.find((g) => g.id === mutual.id);
                  if (!guild) return null;
                  const initials = (guild.name || '').slice(0, 2);
                  return guild.icon_file_id ? (
                    <img
                      key={mutual.id}
                      src={`${CDN_BASE}/icons/${guild.icon_file_id}`}
                      alt={guild.name}
                      title={guild.name}
                      className="size-6 rounded-full"
                    />
                  ) : (
                    <div
                      key={mutual.id}
                      title={guild.name}
                      className="flex size-6 items-center justify-center rounded-full bg-[#2b2d31] text-[8px] font-semibold text-gray-300"
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-gray-400">
                {mutualGuilds.length} Mutual Server{mutualGuilds.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {!isFriend && !hasPendingRequest && (
            <button
              onClick={handleAddFriend}
              disabled={isSending}
              className="flex shrink-0 items-center gap-1.5 rounded bg-[#23a559] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1a7a42] disabled:opacity-50"
            >
              Add Friend
            </button>
          )}
        </div>
      )}
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
