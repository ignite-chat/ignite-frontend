import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChannelContextProvider } from '@/ignite/contexts/ChannelContext';
import Channel from '@/ignite/components/channel/Channel';
import DMChannelsSidebar from '@/components/dm/DMChannelsSidebar';
import FriendsHeader from '@/components/friends/FriendsHeader';
import FriendsDashboard from '@/components/friends/FriendsDashboard';
import MessageRequests from '@/components/friends/MessageRequests';
import PageTitle from '@/ignite/components/PageTitle';
import { useChannelsStore } from '@/ignite/store/channels.store';
import { useNotificationStore } from '@/ignite/store/notification.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useDiscordRelationshipsStore, RelationshipType } from '@/discord/store/discord-relationships.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import DiscordChannel from '@/discord/components/DiscordChannel';
import ResizableSidebar from '@/components/ResizableSidebar';
import { useTelegramStore } from '@/telegram/store/telegram.store';
import { useTelegramChatsStore } from '@/telegram/store/telegram-chats.store';
import { useTelegramUsersStore } from '@/telegram/store/telegram-users.store';
import { getChatDisplayName } from '@/telegram/utils/helpers';
import TelegramChatHeader from '@/telegram/components/TelegramChatHeader';
import TelegramChatMessages from '@/telegram/components/TelegramChatMessages';
import TelegramChatInput from '@/telegram/components/TelegramChatInput';
import { TelegramService } from '@/telegram/services/telegram.service';

const DirectMessagesPage = () => {
  const { channelId, messageId } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannelsStore();
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordConnected = useDiscordStore((s) => s.isConnected);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);

  // Telegram state
  const telegramConnected = useTelegramStore((s) => s.isConnected);
  const telegramConnecting = useTelegramStore((s) => s.isConnecting);
  const telegramSession = useTelegramStore((s) => s.session);
  const telegramChats = useTelegramChatsStore((s) => s.chats);
  const telegramUsersMap = useTelegramUsersStore((s) => s.users);

  // Determine active view
  const isFriendsView = !channelId || channelId === 'friends';
  const isMessageRequestsView = channelId === 'message-requests';
  const isTelegramChannel = channelId?.startsWith('tg-');
  const telegramChatId = isTelegramChannel ? channelId.slice(3) : null;

  // Find active channel — check Ignite first, then Discord, then Telegram
  const isSpecialView = isFriendsView || isMessageRequestsView;

  // Tab state for friends/message-requests views
  const activeTopTab = isMessageRequestsView ? 'message_requests' : 'friends';
  const [activeSubTab, setActiveSubTab] = useState('online');

  // Pending count for badge
  const { requests } = useFriendsStore();
  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);
  const activeIgniteChannel = !isSpecialView && !isTelegramChannel
    ? channels.find((c) => c.channel_id === channelId)
    : null;

  const activeDiscordChannel = !isSpecialView && !activeIgniteChannel && !isTelegramChannel && discordConnected
    ? discordChannels.find((c) => c.id === channelId && (c.type === 1 || c.type === 3))
    : null;

  const isDiscordChannel = !!activeDiscordChannel;

  const activeTelegramChat = isTelegramChannel
    ? telegramChats.find((c) => c.id === telegramChatId)
    : null;

  // Auto-connect telegram if needed
  useEffect(() => {
    if (isTelegramChannel && telegramSession && !telegramConnected && !telegramConnecting) {
      TelegramService.connect();
    }
  }, [isTelegramChannel, telegramSession, telegramConnected, telegramConnecting]);

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

  const telegramDisplayName = activeTelegramChat
    ? getChatDisplayName(activeTelegramChat, telegramUsersMap)
    : null;

  const [telegramMsgSentCount, setTelegramMsgSentCount] = useState(0);
  const onTelegramMessageSent = useCallback(() => setTelegramMsgSentCount((c) => c + 1), []);

  const pageTitle = isTelegramChannel
    ? telegramDisplayName || 'Telegram'
    : isDiscordChannel
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
              <FriendsHeader
                activeTopTab={activeTopTab}
                activeSubTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                pendingCount={pendingCount}
              />

              {activeTopTab === 'friends' ? (
                <FriendsDashboard activeSubTab={activeSubTab} />
              ) : (
                <MessageRequests />
              )}
            </div>
          ) : isTelegramChannel && activeTelegramChat ? (
            <div className="flex h-full flex-col">
              <TelegramChatHeader chat={activeTelegramChat} />
              <TelegramChatMessages chatId={telegramChatId} chatType={activeTelegramChat.type} messageSentCount={telegramMsgSentCount} />
              {activeTelegramChat.type !== 'channel' && (
                <TelegramChatInput
                  chatId={telegramChatId}
                  chatName={telegramDisplayName}
                  onMessageSent={onTelegramMessageSent}
                />
              )}
            </div>
          ) : isTelegramChannel ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <div className="size-8 animate-spin rounded-full border-2 border-solid border-[#2AABEE] border-t-transparent" />
                <p className="text-sm">{telegramConnected ? 'Loading chat...' : 'Connecting to Telegram...'}</p>
              </div>
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

export default DirectMessagesPage;
