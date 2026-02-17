import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DefaultLayout from '../layouts/DefaultLayout';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import Channel from '../components/Channel/Channel';
import DMSidebar from '../components/dm/DMSidebar';
import FriendsDashboard from '../components/Friends/FriendsDashboard';
import { useChannelsStore } from '../store/channels.store';
import { useNotificationStore } from '../store/notification.store';

const DirectMessagesPage = () => {
  const { channelId, messageId } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannelsStore();

  // Determine active view
  const isFriendsView = !channelId || channelId === 'friends';

  // Find active channel object if we aren't in friends view
  const activeChannel = !isFriendsView ? channels.find((c) => c.channel_id === channelId) : null;

  // Track active channel for notification suppression
  useEffect(() => {
    useNotificationStore.getState().setActiveChannelId(channelId || null);
    return () => useNotificationStore.getState().setActiveChannelId(null);
  }, [channelId]);

  return (
    <DefaultLayout>
      <div className="flex h-full w-full overflow-hidden bg-gray-700 text-gray-100">
        {/* Sidebar Component */}
        <DMSidebar
          activeChannelId={channelId || 'friends'}
          onNavigate={(id) => navigate(`/channels/@me/${id}`)}
        />

        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {isFriendsView ? (
            <FriendsDashboard />
          ) : (
            <ChannelContextProvider>
              {/* normalizeThread logic should ideally happen inside Channel or a hook, 
                     but passing activeChannel directly here works based on your existing code */}
              <Channel channel={activeChannel} messageId={messageId} />
            </ChannelContextProvider>
          )}
        </main>
      </div>
    </DefaultLayout>
  );
};

export default DirectMessagesPage;
