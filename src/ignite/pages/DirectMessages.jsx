import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import Channel from '../components/channel/Channel';
import DMChannelsSidebar from '@/components/dm/DMChannelsSidebar';
import FriendsDashboard from '../components/friends/FriendsDashboard';
import MessageRequests from '../components/friends/MessageRequests';
import PageTitle from '../components/PageTitle';
import { useChannelsStore } from '../store/channels.store';
import { useNotificationStore } from '../store/notification.store';
import { useUsersStore } from '../store/users.store';
import { useFriendsStore } from '../store/friends.store';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useDiscordRelationshipsStore, RelationshipType } from '@/discord/store/discord-relationships.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import DiscordChannel from '@/discord/components/DiscordChannel';
import ResizableSidebar from '@/components/ResizableSidebar';

const DirectMessagesPage = () => {
  const { channelId, messageId } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannelsStore();
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordConnected = useDiscordStore((s) => s.isConnected);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);

  // Determine active view
  const isFriendsView = !channelId || channelId === 'friends';
  const isMessageRequestsView = channelId === 'message-requests';

  // Find active channel — check Ignite first, then Discord
  const isSpecialView = isFriendsView || isMessageRequestsView;

  // Tab state for friends/message-requests views
  const [activeTopTab, setActiveTopTab] = useState(isMessageRequestsView ? 'message_requests' : 'friends');
  const [activeSubTab, setActiveSubTab] = useState('online');

  // Sync top tab when URL changes
  useEffect(() => {
    setActiveTopTab(isMessageRequestsView ? 'message_requests' : 'friends');
  }, [isMessageRequestsView]);

  // Pending count for badge
  const { requests } = useFriendsStore();
  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);
  const activeIgniteChannel = !isSpecialView
    ? channels.find((c) => c.channel_id === channelId)
    : null;

  const activeDiscordChannel = !isSpecialView && !activeIgniteChannel && discordConnected
    ? discordChannels.find((c) => c.id === channelId && (c.type === 1 || c.type === 3))
    : null;

  const isDiscordChannel = !!activeDiscordChannel;

  // Get the other user's name for the page title
  const currentUser = useUsersStore((s) => s.getCurrentUser());

  const pendingCount = useMemo(() => {
    const ignitePending = requests.filter((req) => req.sender_id != currentUser?.id).length;
    const discordPending = discordConnected
      ? discordRelationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length
      : 0;
    return ignitePending + discordPending;
  }, [requests, currentUser, discordConnected, discordRelationships]);
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
    if (channelId && channelId !== 'friends' && channelId !== 'message-requests') {
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
      <ResizableSidebar id="dm-sidebar" defaultWidth={320}>
        <DMChannelsSidebar
          activeChannelId={channelId || 'friends'}
          onNavigate={(id) => navigate(`/channels/@me/${id}`)}
        />
      </ResizableSidebar>
      <div className="flex flex-1 overflow-hidden">
        {!isSpecialView && <PageTitle title={pageTitle} />}
        <main className={`relative flex h-full flex-1 flex-col overflow-hidden text-gray-100 bg-[#1a1a1e]`}>
          {isSpecialView ? (
            <div className="flex h-full flex-col select-none">
              {/* Header with top tabs + subtabs */}
              <header className="flex h-12 items-center justify-between border-b border-white/5 px-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 font-semibold text-[#f2f3f5]">
                    <Users size={20} className="text-[#80848e]" />
                    Friends
                  </div>
                  {/* Subtabs — only when Friends top tab is active */}
                  {activeTopTab === 'friends' && (
                    <>
                      <Separator orientation="vertical" className="h-6 bg-[#4e5058]" />
                      <nav className="flex items-center gap-2">
                        <TabButton label="Online" isActive={activeSubTab === 'online'} onClick={() => setActiveSubTab('online')} />
                        <TabButton label="All" isActive={activeSubTab === 'all'} onClick={() => setActiveSubTab('all')} />
                        <TabButton label="Pending" isActive={activeSubTab === 'pending'} onClick={() => setActiveSubTab('pending')} count={pendingCount} />
                        <Button
                          variant={activeSubTab === 'add_friend' ? 'ghost' : 'default'}
                          size="sm"
                          className={`h-7 px-2 text-sm font-medium ${
                            activeSubTab === 'add_friend'
                              ? 'text-[#23a559]'
                              : 'bg-[#248046] text-white hover:bg-[#1a6334]'
                          }`}
                          onClick={() => setActiveSubTab('add_friend')}
                        >
                          Add Friend
                        </Button>
                      </nav>
                    </>
                  )}
                </div>
              </header>

              {/* Content */}
              {activeTopTab === 'friends' ? (
                <FriendsDashboard activeSubTab={activeSubTab} />
              ) : (
                <MessageRequests />
              )}
            </div>
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

const TabButton = ({ label, isActive, onClick, count }) => (
  <Button
    variant={isActive ? 'secondary' : 'ghost'}
    size="sm"
    className="h-7 px-3 text-sm font-medium"
    onClick={onClick}
  >
    {label}
    {count != null && count > 0 && (
      <Badge className="ml-2 h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
        {count}
      </Badge>
    )}
  </Button>
);

export default DirectMessagesPage;
