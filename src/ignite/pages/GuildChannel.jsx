import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuildsService } from '../services/guilds.service';
import { EmojisService } from '../services/emojis.service';
import { useGuildsStore } from '../store/guilds.store';
import { useChannelsStore } from '../store/channels.store';
import { useNotificationStore } from '../store/notification.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import GuildLayout from '../layouts/GuildLayout';
import Channel from '../components/channel/Channel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import PageTitle from '../components/PageTitle';
import { StickersService } from '@/ignite/services/stickers.service';

const GuildChannelPage = () => {
  const navigate = useNavigate();

  const { guilds } = useGuildsStore();
  const { channels } = useChannelsStore();

  // get the guild id from the URL
  const { guildId, channelId, messageId } = useParams();

  // find guild from guilds
  const guild = useMemo(() => guilds.find((g) => g.id == guildId), [guilds, guildId]);

  // if no guild redirect away
  useEffect(() => {
    if (!guild) {
      navigate('/channels/@me', { replace: true });
    }
  }, [guild, navigate]);

  // Track active channel for notification suppression
  useEffect(() => {
    useNotificationStore.getState().setActiveChannelId(channelId || null);
    return () => useNotificationStore.getState().setActiveChannelId(null);
  }, [channelId]);

  // Save last visited channel
  useEffect(() => {
    if (guildId && channelId) {
      useLastChannelStore.getState().setLastChannel(guildId, channelId);
    }
  }, [guildId, channelId]);

  // Guild channels from the channels store
  const guildChannels = useMemo(
    () => channels.filter((c) => String(c.guild_id) === String(guild?.id)),
    [channels, guild?.id]
  );

  // If no channel id in url, restore last channel or redirect to first channel
  useEffect(() => {
    if (guildChannels.length > 0 && !channelId) {
      const lastChannelId = useLastChannelStore.getState().getLastChannel(guild.id);
      const lastChannel = lastChannelId && guildChannels.find((c) => String(c.channel_id) === String(lastChannelId));
      if (lastChannel) {
        navigate(`/channels/${guild.id}/${lastChannelId}`, { replace: true });
        return;
      }
      const firstTextChannel = guildChannels.find((c) => c.type === 0);
      if (firstTextChannel) {
        navigate(`/channels/${guild.id}/${BigInt(firstTextChannel.channel_id)}`, { replace: true });
      }
    }
  }, [channelId, guild, guildChannels, navigate]);

  const channel = useMemo(
    () => channels.find((c) => String(c.channel_id) === String(channelId)),
    [channels, channelId]
  );

  return (
    <GuildLayout guild={guild}>
      <PageTitle title={channel ? `#${channel.name}` : 'Server'} />
      <ChannelContextProvider>
        <Channel channel={channel} messageId={messageId} />
      </ChannelContextProvider>
    </GuildLayout>
  );
};

export default GuildChannelPage;
