import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordStore } from '../store/discord.store';
import DiscordDMLayout from '../layouts/DiscordDMLayout';
import DiscordChannel from '../components/DiscordChannel';
import DiscordFriendsDashboard from '../components/DiscordFriendsDashboard';

const DiscordDMPage = () => {
  const navigate = useNavigate();
  const { channelId } = useParams();
  const { isConnected } = useDiscordStore();
  const channels = useDiscordChannelsStore((s) => s.channels);

  // Redirect if not connected and no token
  useEffect(() => {
    if (!isConnected && !useDiscordStore.getState().token) {
      navigate('/channels/@me', { replace: true });
    }
  }, [isConnected, navigate]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === channelId),
    [channels, channelId]
  );

  return (
    <DiscordDMLayout>
      {activeChannel ? (
        <DiscordChannel channel={activeChannel} />
      ) : channelId ? (
        <div className="flex h-full items-center justify-center text-gray-500">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
            <p className="text-sm">Loading conversation...</p>
          </div>
        </div>
      ) : (
        <DiscordFriendsDashboard />
      )}
    </DiscordDMLayout>
  );
};

export default DiscordDMPage;
