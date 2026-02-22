import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuildsService } from '../services/guilds.service';
import { EmojisService } from '../services/emojis.service';
import { useGuildsStore } from '../store/guilds.store';
import { useNotificationStore } from '../store/notification.store';
import { useLastChannelStore } from '../store/last-channel.store';
import GuildLayout from '../layouts/GuildLayout';
import Channel from '../components/Channel/Channel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import ChannelDialog from '../components/Channel/ChannelDialog';
import { StickersService } from '@/services/stickers.service';

const GuildChannelPage = () => {
  const navigate = useNavigate();

  const { guilds } = useGuildsStore();

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

  // If no channel id in url, restore last channel or redirect to first channel
  useEffect(() => {
    if (guild?.channels && !channelId) {
      const lastChannelId = useLastChannelStore.getState().getLastChannel(guild.id);
      const lastChannel = lastChannelId && guild.channels.find((c) => c.channel_id == lastChannelId);
      if (lastChannel) {
        navigate(`/channels/${guild.id}/${lastChannelId}`, { replace: true });
        return;
      }
      const firstTextChannel = guild.channels.find((c) => c.type === 0);
      if (firstTextChannel) {
        navigate(`/channels/${guild.id}/${BigInt(firstTextChannel.channel_id)}`, { replace: true });
      }
    }
  }, [channelId, guild, navigate]);

  const channel = useMemo(
    () => guild?.channels?.find((c) => c.channel_id == channelId),
    [guild, channelId]
  );

  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);

  return (
    <GuildLayout guild={guild}>
      <ChannelContextProvider>
        <Channel channel={channel} messageId={messageId} />
      </ChannelContextProvider>

      <ChannelDialog
        open={isChannelDialogOpen}
        onOpenChange={setIsChannelDialogOpen}
        guild={guild}
      />
    </GuildLayout>
  );
};

export default GuildChannelPage;
