import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordStore } from '../store/discord.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import DiscordGuildLayout from '../layouts/DiscordGuildLayout';
import DiscordChannel from '../components/DiscordChannel';

const DiscordGuildPage = () => {
  const navigate = useNavigate();
  const { guildId, channelId } = useParams();
  const { isConnected } = useDiscordStore();
  const { guilds } = useDiscordGuildsStore();
  const { channels } = useDiscordChannelsStore();

  const guild = useMemo(() => guilds.find((g) => g.id === guildId), [guilds, guildId]);

  const guildChannels = useMemo(() => {
    return channels.filter((c) => c.guild_id === guildId);
  }, [channels, guildId]);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected && !useDiscordStore.getState().token) {
      navigate('/channels/@me', { replace: true });
    }
  }, [isConnected, navigate]);

  // Save last visited channel
  useEffect(() => {
    if (guildId && channelId) {
      useLastChannelStore.getState().setLastChannel(guildId, channelId);
    }
  }, [guildId, channelId]);

  // Restore last channel or redirect to first text channel if no channelId
  useEffect(() => {
    if (guildChannels.length > 0 && !channelId) {
      const lastChannelId = useLastChannelStore.getState().getLastChannel(guildId);
      const lastChannel = lastChannelId && guildChannels.find((c) => c.id === lastChannelId);
      if (lastChannel) {
        navigate(`/discord/${guildId}/${lastChannelId}`, { replace: true });
        return;
      }
      const textChannels = guildChannels
        .filter((c) => c.type === 0)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      if (textChannels.length > 0) {
        navigate(`/discord/${guildId}/${textChannels[0].id}`, { replace: true });
      }
    }
  }, [guildChannels, channelId, guildId, navigate]);

  const activeChannel = useMemo(
    () => guildChannels.find((c) => c.id === channelId),
    [guildChannels, channelId]
  );

  return (
    <DiscordGuildLayout guild={guild}>
      {activeChannel ? (
        <DiscordChannel channel={activeChannel} />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">
          {guildChannels.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
              <p className="text-sm">Loading channels...</p>
            </div>
          ) : (
            <p className="text-sm">Select a channel from the sidebar</p>
          )}
        </div>
      )}
    </DiscordGuildLayout>
  );
};

export default DiscordGuildPage;
