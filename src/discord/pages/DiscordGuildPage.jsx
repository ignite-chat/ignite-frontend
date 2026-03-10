import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordStore } from '../store/discord.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import { GUILD_TEXT } from '../constants/channel-types';
import { VIEW_CHANNEL } from '../constants/permissions';
import { computeChannelPermissions } from '../utils/permissions';
import { DiscordGatewayService } from '../services/discord-gateway.service';
import { DiscordApiService } from '../services/discord-api.service';
import DiscordGuildLayout from '../layouts/DiscordGuildLayout';
import DiscordChannel from '../components/DiscordChannel';
import PageTitle from '@/ignite/components/PageTitle';

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

  // Restore last channel or redirect to first accessible text channel if no channelId
  useEffect(() => {
    if (guildChannels.length > 0 && !channelId) {
      const currentUserId = useDiscordStore.getState().user?.id;
      const guildData = guilds.find((g) => g.id === guildId);
      const guildRoles = guildData?.roles || guildData?.properties?.roles || [];
      const guildOwnerId = guildData?.owner_id || guildData?.properties?.owner_id;
      const members = useDiscordGuildsStore.getState().guildMembers[guildId] || [];
      const me = members.find((m) => m.user?.id === currentUserId || m.user_id === currentUserId);
      const memberRoleIds = me?.roles || [];

      const canView = (ch) => {
        if (!currentUserId) return true;
        const perms = computeChannelPermissions(ch, memberRoleIds, guildRoles, guildId, guildOwnerId, currentUserId);
        return (perms & VIEW_CHANNEL) === VIEW_CHANNEL;
      };

      const lastChannelId = useLastChannelStore.getState().getLastChannel(guildId);
      const lastChannel = lastChannelId && guildChannels.find((c) => c.id === lastChannelId);
      if (lastChannel && canView(lastChannel)) {
        navigate(`/discord/${guildId}/${lastChannelId}`, { replace: true });
        return;
      }
      const textChannels = guildChannels
        .filter((c) => c.type === GUILD_TEXT && canView(c))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      if (textChannels.length > 0) {
        navigate(`/discord/${guildId}/${textChannels[0].id}`, { replace: true });
      }
    }
  }, [guildChannels, channelId, guildId, guilds, navigate]);

  // Subscribe to guild member list when we have a channel selected
  useEffect(() => {
    if (!isConnected || !guildId || !channelId) return;
    DiscordGatewayService.subscribeGuild(guildId, channelId);
  }, [isConnected, guildId, channelId]);

  const activeChannel = useMemo(
    () => guildChannels.find((c) => c.id === channelId),
    [guildChannels, channelId]
  );

  // Fetch thread channel if not in the store (e.g. navigating to a forum thread directly)
  const [fetchingThread, setFetchingThread] = useState(false);
  useEffect(() => {
    if (!channelId || activeChannel || !isConnected || guildChannels.length === 0) return;
    setFetchingThread(true);
    DiscordApiService.getChannel(channelId)
      .then((channel) => {
        if (channel && channel.guild_id === guildId) {
          useDiscordChannelsStore.getState().addChannel(channel);
        }
      })
      .catch(() => {})
      .finally(() => setFetchingThread(false));
  }, [channelId, activeChannel, isConnected, guildId, guildChannels.length]);

  const guildName = guild?.properties?.name || guild?.name || 'Server';
  const pageTitle = activeChannel ? `#${activeChannel.name} | ${guildName}` : guildName;

  return (
    <DiscordGuildLayout guild={guild}>
      <PageTitle title={pageTitle} />
      {activeChannel ? (
        <DiscordChannel channel={activeChannel} />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">
          {guildChannels.length === 0 || fetchingThread ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
              <p className="text-sm">{fetchingThread ? 'Loading thread...' : 'Loading channels...'}</p>
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
