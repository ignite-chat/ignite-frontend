import { useMemo } from 'react';
import { useGuildContext } from '../../../contexts/GuildContext';
import { useGuildsStore } from '../../../store/guilds.store';
import { useChannelsStore } from '../../../store/channels.store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Hash } from '@phosphor-icons/react';

export const isInternalMessageLink = (url) => {
  if (!url) return null;
  const origin = window.location.origin;
  let path = url;

  if (url.startsWith(origin)) {
    path = url.slice(origin.length);
  } else if (url.startsWith('http')) {
    return null;
  }

  if (path.startsWith('//')) path = path.slice(1);

  const match = path.match(/^\/channels\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (match) {
    return {
      guildId: match[1],
      channelId: match[2],
      messageId: match[3],
    };
  }
  return null;
};

const MessageLinkMention = ({ guildId, channelId, messageId }) => {
  const guildsStore = useGuildsStore();
  const channelsStore = useChannelsStore();
  const { guildId: currentGuildId } = useGuildContext();
  const navigate = useNavigate();

  const info = useMemo(() => {
    if (guildId === '@me') {
      const c = channelsStore.channels.find((c) => c.channel_id === channelId || c.id === channelId);
      return { channel: c, guild: null, isDM: true, isSameGuild: currentGuildId === '@me' };
    }
    const g = guildsStore.guilds.find((g) => g.id === guildId);
    const c = g?.channels?.find((x) => x.id === channelId || x.channel_id === channelId);
    return { channel: c, guild: g, isDM: false, isSameGuild: currentGuildId === guildId };
  }, [guildsStore.guilds, channelsStore.channels, guildId, channelId, currentGuildId]);

  const { channel, guild, isDM, isSameGuild } = info;

  const handleClick = (e) => {
    e.preventDefault();
    if (!channel) {
      toast.error('Message not found');
      return;
    }
    if (isDM) {
      navigate(`/channels/@me/${channelId}/${messageId}`);
    } else {
      navigate(`/channels/${guildId}/${channelId}/${messageId}`);
    }
  };

  if (!channel) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex cursor-pointer items-center gap-0.5 rounded-[4px] bg-primary/10 px-1 py-0.5 align-baseline font-medium text-primary/60 transition-colors hover:bg-primary/20"
      >
        <Hash weight="bold" className="size-3.5" />
        <span className="italic">unknown</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] bg-primary/10 px-1 py-0.5 align-baseline font-medium text-primary transition-colors hover:bg-primary/20"
    >
      {isSameGuild ? (
        <Hash weight="bold" className="size-3.5 opacity-70" />
      ) : (
        !isDM &&
        guild && (
          <div className="flex size-3.5 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-[8px] text-primary">
            {guild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span>{guild.name?.slice(0, 2).toLowerCase()}</span>
            )}
          </div>
        )
      )}
      <span>{channel.name}</span>
      <span className="mx-0.5 opacity-40">›</span>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-3.5 translate-y-[0.5px] opacity-80"
      >
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    </button>
  );
};

export default MessageLinkMention;
