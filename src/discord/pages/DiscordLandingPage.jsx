import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { DiscordService } from '../services/discord.service';
import PageTitle from '@/ignite/components/PageTitle';

const DiscordLandingPage = () => {
  const navigate = useNavigate();
  const { token, isConnected } = useDiscordStore();
  const { guilds } = useDiscordGuildsStore();

  // Auto-connect if token exists but not connected
  useEffect(() => {
    if (token && !isConnected) {
      DiscordService.connect();
    }
  }, [token, isConnected]);

  // Redirect to first guild once guilds are loaded
  useEffect(() => {
    if (isConnected && guilds.length > 0) {
      navigate(`/discord/${guilds[0].id}`, { replace: true });
    }
  }, [isConnected, guilds, navigate]);

  // No token at all
  if (!token) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <p className="text-sm">No Discord account connected.</p>
      </div>
    );
  }

  return (
    <>
      <PageTitle title="Discord" />
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-2 border-solid border-[#5865f2] border-t-transparent" />
          <p className="text-sm">Connecting to Discord...</p>
        </div>
      </div>
    </>
  );
};

export default DiscordLandingPage;
