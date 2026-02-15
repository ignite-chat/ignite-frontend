import { useMemo } from 'react';
import { useUsersStore } from '../../store/users.store';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import GuildMemberPopoverContent from '../GuildMember/GuildMemberPopoverContent';
import GuildMemberContextMenu from '../GuildMember/GuildMemberContextMenu';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ExternalLink from './ExternalLink.jsx';
import { convertEmojiShortcodes } from '../../utils/emoji.utils';
import { useEmojisStore } from '../../store/emojis.store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Hash, Megaphone, SpeakerHigh } from '@phosphor-icons/react';
import { visit } from 'unist-util-visit';

const EMOJI_CDN_PREFIX = `${import.meta.env.VITE_CDN_BASE_URL}/emojis/`;

const convertCustomEmojis = (text, emojis) => {
  if (!emojis || emojis.length === 0) return text;
  return text.replace(/:[\w_+-]+:/g, (match) => {
    const name = match.slice(1, -1);
    const emoji = emojis.find((e) => e.name === name);
    if (emoji) return `![${name}](${EMOJI_CDN_PREFIX}${emoji.id})`;
    return match;
  });
};

const remarkMentions = () => {
  return (tree) => {
    visit(tree, ['text', 'html'], (node, index, parent) => {
      const value = node.value;
      const regex = /<(@|#)(\d+)>/g;

      // Optimization: check if regex matches at all before proceeding
      if (!regex.test(value)) return;
      regex.lastIndex = 0; // Reset regex state

      const children = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: value.substring(lastIndex, match.index) });
        }

        const type = match[1] === '@' ? 'user' : 'channel';
        const id = match[2];
        const href = `mention://${type}/${id}`;

        children.push({
          type: 'link',
          url: href,
          children: [{ type: 'text', value: match[0] }],
        });

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < value.length) {
        children.push({ type: 'text', value: value.substring(lastIndex) });
      }

      if (children.length > 0) {
        parent.children.splice(index, 1, ...children);
        return index + children.length;
      }
    });
  };
};

const MentionText = ({ userId }) => {
  const { getUser, users } = useUsersStore();
  const user = useMemo(() => getUser(userId), [userId, getUser, users]);
  const { guildId } = useGuildContext();
  const { guildMembers } = useGuildsStore();

  const roleColor = useMemo(() => {
    const members = guildMembers[guildId] || [];
    const member = members.find((m) => m.user_id === userId);
    if (!member) return null;

    const role = [...(member.roles || [])]
      .sort((a, b) => b.position - a.position)
      .find((r) => r.color && r.color !== 0);

    return role ? `#${role.color.toString(16).padStart(6, '0')}` : null;
  }, [guildMembers, guildId, userId]);

  if (!user) {
    return <span className="text-blue-400">&lt;@{userId}&gt;</span>;
  }

  const mentionStyle = roleColor ? { color: roleColor, backgroundColor: `${roleColor}33` } : {};

  return (
    <ContextMenu>
      <Popover>
        <ContextMenuTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`inline cursor-pointer rounded px-1 font-medium transition-colors ${roleColor ? 'hover:brightness-110' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'}`}
              style={mentionStyle}
            >
              @{user.name}
            </button>
          </PopoverTrigger>
        </ContextMenuTrigger>
        <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
          <GuildMemberPopoverContent userId={user.id} guild={null} />
        </PopoverContent>
      </Popover>
      <ContextMenuContent>
        <GuildMemberContextMenu user={user} />
      </ContextMenuContent>
    </ContextMenu>
  );
};

const ChannelMention = ({ channelId }) => {
  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();
  const navigate = useNavigate();

  const channel = useMemo(() => {
    // Search in current guild first
    const guild = guildsStore.guilds.find((g) => g.id === guildId);
    if (guild) {
      const c = guild.channels.find((x) => x.id === channelId || x.channel_id === channelId);
      if (c) return { ...c, isSameGuild: true };
    }
    return null;
  }, [guildsStore.guilds, guildId, channelId]);

  if (!channel) {
    return (
      <span className="cursor-not-allowed rounded bg-gray-800/50 px-1 py-0.5 text-gray-500">
        #unknown-channel
      </span>
    );
  }

  const handleClick = (e) => {
    e.preventDefault();
    if (channel.isSameGuild) {
      navigate(`/channels/${guildId}/${channel.channel_id || channel.id}`);
    } else {
      toast.error('Channel belongs to another server');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex cursor-pointer items-center gap-0.5 rounded bg-blue-500/10 px-1 py-0.5 align-baseline text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
    >
      {channel.type === 2 ? (
        <SpeakerHigh className="size-3.5" />
      ) : channel.type === 5 ? (
        <Megaphone weight="fill" className="size-3.5" />
      ) : (
        <Hash weight="bold" className="size-3.5" />
      )}
      <span className="font-medium hover:underline">{channel.name}</span>
    </button>
  );
};

const MessageContent = ({ content }) => {
  const { guildId } = useGuildContext();
  const { guildEmojis } = useEmojisStore();
  const emojis = guildEmojis[guildId] || [];

  return (
    <Markdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkMentions]}
      urlTransform={(url) => {
        if (url.startsWith('mention:')) return url;
        // Default strict sanitization for other protocols
        // We allow http, https, mailto, tel. others are stripped.
        const start = url.slice(0, 10).toLowerCase();
        if (
          start.startsWith('http:') ||
          start.startsWith('https:') ||
          start.startsWith('mailto:') ||
          start.startsWith('tel:')
        ) {
          return url;
        }
        return url;
      }}
      components={{
        // Override paragraph to render inline
        p: ({ children }) => <>{children}</>,
        // Render custom emojis as inline images, disable other images
        img: ({ src, alt }) => {
          const isTwemoji = src?.startsWith('https://cdn.jsdelivr.net/gh/twitter/twemoji');
          if (src?.startsWith(EMOJI_CDN_PREFIX) || isTwemoji) {
            return (
              <img
                src={src}
                alt={alt}
                className={`inline object-contain align-text-bottom ${
                  isTwemoji ? 'h-6 w-6' : 'h-8 w-8'
                }`}
                loading="lazy"
              />
            );
          }
          return (
            <span className="text-gray-500">
              [{alt || 'image'}]({src})
            </span>
          );
        },
        // External links with confirmation dialog, and custom mentions
        a: ({ href, children }) => {
          if (href?.startsWith('mention://user/')) {
            const userId = href.split('/').pop();
            return <MentionText userId={userId} />;
          }
          if (href?.startsWith('mention://channel/')) {
            const channelId = href.split('/').pop();
            return <ChannelMention channelId={channelId} />;
          }
          return href ? <ExternalLink href={href}>{children}</ExternalLink> : <>{children}</>;
        },
      }}
    >
      {convertEmojiShortcodes(convertCustomEmojis(content, emojis))}
    </Markdown>
  );
};

export default MessageContent;
