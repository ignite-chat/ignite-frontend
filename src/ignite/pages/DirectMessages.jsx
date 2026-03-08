import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import Channel from '../components/channel/Channel';
import DMChannelsSidebar from '../components/dm/DMChannelsSidebar';
import FriendsDashboard from '../components/friends/FriendsDashboard';
import PageTitle from '../components/PageTitle';
import { useChannelsStore } from '../store/channels.store';
import { useNotificationStore } from '../store/notification.store';
import { useUsersStore } from '../store/users.store';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import DiscordChannel from '@/discord/components/DiscordChannel';

const DirectMessagesPage = () => {
  const { channelId, messageId } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannelsStore();
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordConnected = useDiscordStore((s) => s.isConnected);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);

  // Determine active view
  const isFriendsView = !channelId || channelId === 'friends';

  // Find active channel — check Ignite first, then Discord
  const activeIgniteChannel = !isFriendsView
    ? channels.find((c) => c.channel_id === channelId)
    : null;

  const activeDiscordChannel = !isFriendsView && !activeIgniteChannel && discordConnected
    ? discordChannels.find((c) => c.id === channelId && (c.type === 1 || c.type === 3))
    : null;

  const isDiscordChannel = !!activeDiscordChannel;

  // Get the other user's name for the page title
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const dmRecipient = activeIgniteChannel
    ? (activeIgniteChannel.recipients || []).find((r) => r.id !== currentUser?.id) || activeIgniteChannel.user
    : null;

  const discordDmName = useMemo(() => {
    if (!activeDiscordChannel) return null;
    const recipientIds = activeDiscordChannel.recipient_ids || [];
    const recipients = recipientIds.map((id) => discordUsersMap[id]).filter(Boolean);
    if (activeDiscordChannel.type === 3) {
      return activeDiscordChannel.name || recipients.map((r) => r.global_name || r.username).join(', ');
    }
    const discordUser = useDiscordStore.getState().user;
    const other = recipients.find((r) => r.id !== discordUser?.id) || recipients[0];
    return other ? (other.global_name || other.username) : 'Unknown User';
  }, [activeDiscordChannel, discordUsersMap]);

  // Save last visited DM channel
  useEffect(() => {
    if (channelId && channelId !== 'friends') {
      useLastChannelStore.getState().setLastChannel('@me', channelId);
    }
  }, [channelId]);

  // Track active channel for notification suppression
  useEffect(() => {
    useNotificationStore.getState().setActiveChannelId(channelId || null);
    return () => useNotificationStore.getState().setActiveChannelId(null);
  }, [channelId]);

  const pageTitle = isDiscordChannel
    ? `@${discordDmName}` || 'Discord DMs'
    : `@${dmRecipient?.name}` || 'Direct Messages';

  return (
    <>
      <div className="shrink-0">
        <DMChannelsSidebar
          activeChannelId={channelId || 'friends'}
          onNavigate={(id) => navigate(`/channels/@me/${id}`)}
        />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {!isFriendsView && <PageTitle title={pageTitle} />}
        <main className={`relative flex h-full flex-1 flex-col overflow-hidden text-gray-100 bg-[#1a1a1e]`}>
          {isFriendsView ? (
            <FriendsDashboard />
          ) : isDiscordChannel ? (
            <DiscordChannel channel={activeDiscordChannel} />
          ) : activeIgniteChannel ? (
            <ChannelContextProvider>
              <Channel channel={activeIgniteChannel} messageId={messageId} />
            </ChannelContextProvider>
          ) : channelId ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <div className="size-8 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
                <p className="text-sm">Loading conversation...</p>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </>
  );
};

export default DirectMessagesPage;
