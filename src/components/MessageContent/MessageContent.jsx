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
import Emoji from './Emoji.jsx';
import InviteEmbed from './InviteEmbed.jsx';
import { convertEmojiShortcodes, convertUnicodeEmojis } from '../../utils/emoji.utils';
import { useEmojisStore } from '../../store/emojis.store';
import { useChannelsStore } from '../../store/channels.store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Hash, Megaphone, SpeakerHigh, DownloadSimple, FileText } from '@phosphor-icons/react';
import { visit } from 'unist-util-visit';

const EMOJI_CDN_PREFIX = `${import.meta.env.VITE_CDN_BASE_URL}/emojis/`;
const INVITE_URL_REGEX = /https?:\/\/app\.ignite-chat\.com\/invite\/([a-zA-Z0-9]+)/g;

const convertCustomEmojis = (text, allGuildEmojis, currentGuildId) => {
  // Handle global emoji format <id:name>
  text = text.replace(/<(\d+):([\w_+-]+)>/g, (match, id, name) => {
    return `![${name}](${EMOJI_CDN_PREFIX}${id})`;
  });

  if (!allGuildEmojis) return text;
  
  // Handle shortcode :name: format
  return text.replace(/:[\w_+-]+:/g, (match) => {
    const name = match.slice(1, -1);
    
    const currentEmojis = allGuildEmojis[currentGuildId] || [];
    const localEmoji = currentEmojis.find((e) => e.name === name);
    if (localEmoji) return `![${name}](${EMOJI_CDN_PREFIX}${localEmoji.id})`;

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

const MentionText = ({ userId, isReply = false }) => {
  const { getUser } = useUsersStore();
  const user = useMemo(() => getUser(userId), [userId, getUser]);
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

  if (isReply) {
    return (
      <span className="font-medium" style={{ color: roleColor || 'rgb(148, 156, 247)' }}>
        {user.name && user.name !== user.username ? `@${user.name}` : `@${user.username}`}
      </span>
    );
  }

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

const ChannelMention = ({ channelId, isReply = false }) => {
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

  if (isReply) {
    return (
      <span className="font-medium text-blue-400">
        #{channel.name}
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

const isInternalMessageLink = (url) => {
  if (!url) return null;
  const origin = window.location.origin;
  let path = url;

  if (url.startsWith(origin)) {
    path = url.slice(origin.length);
  } else if (url.startsWith('http')) {
    // Not our origin
    return null;
  }

  // Handle case where path starts with // or just /
  if (path.startsWith('//')) path = path.slice(1);
  
  // Expecting /channels/guildId/channelId/messageId
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

const STICKER_CDN_PREFIX = `${import.meta.env.VITE_CDN_BASE_URL}/stickers/`;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'apng', 'avif'];

const isImageAttachment = (attachment) => {
  if (attachment.content_type?.startsWith('image/')) return true;
  const ext = attachment.filename?.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageContent = ({ content, isReply = false, stickers = [], attachments = [] }) => {
  const { guildId } = useGuildContext();
  const { guildEmojis } = useEmojisStore();

  const inviteCodes = useMemo(() => {
    if (isReply) return [];
    const matches = [...content.matchAll(INVITE_URL_REGEX)];
    return [...new Set(matches.map((m) => m[1]))];
  }, [content, isReply]);

  return (
    <>
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
          const isCustomEmoji = src?.startsWith(EMOJI_CDN_PREFIX);
          // Local twemoji SVGs (from assets) are relative paths (start with /)
          // CDN fallback twemojis start with the jsdelivr URL
          const isTwemoji = src?.startsWith('https://cdn.jsdelivr.net/gh/twitter/twemoji') ||
            (src && !src.startsWith('http') && !isCustomEmoji);
          if (isCustomEmoji || isTwemoji) {
            return (
              <Emoji
                src={src}
                alt={alt}
                isReply={isReply}
                isTwemoji={isTwemoji}
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
            return <MentionText userId={userId} isReply={isReply} />;
          }
          if (href?.startsWith('mention://channel/')) {
            const channelId = href.split('/').pop();
            return <ChannelMention channelId={channelId} isReply={isReply} />;
          }

          const msgLink = isInternalMessageLink(href);
          if (msgLink) {
            return (
              <MessageLinkMention
                guildId={msgLink.guildId}
                channelId={msgLink.channelId}
                messageId={msgLink.messageId}
              />
            );
          }

          if (isReply) {
            return <span className="font-medium text-blue-400">{children}</span>;
          }
          return href ? <ExternalLink href={href}>{children}</ExternalLink> : <>{children}</>;
        },
      }}
    >
      {convertUnicodeEmojis(
        convertEmojiShortcodes(convertCustomEmojis(content, guildEmojis, guildId))
      )}
    </Markdown>
    {inviteCodes.map((code) => (
      <InviteEmbed key={code} code={code} />
    ))}
    {stickers.length > 0 && !isReply && (
      <div className="mt-1 flex gap-2 select-none">
        {stickers.map((sticker) => (
          <img
            key={sticker.id}
            src={`${STICKER_CDN_PREFIX}${sticker.id}`}
            alt={sticker.name}
            title={sticker.name}
            className="size-40 object-contain"
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    )}
    {attachments.length > 0 && !isReply && (
      <div className="mt-1.5 flex flex-col gap-1.5">
        {attachments.map((attachment) =>
          isImageAttachment(attachment) ? (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="block max-w-[400px]"
            >
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="max-h-[300px] rounded object-contain"
                loading="lazy"
                decoding="async"
              />
            </a>
          ) : (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex w-fit max-w-[400px] items-center gap-3 rounded-md border border-white/5 bg-[#2b2d31] px-4 py-3 transition-colors hover:bg-[#32353b]"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded bg-[#5865f2]/20">
                <FileText className="size-5 text-[#5865f2]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#00a8fc] hover:underline">
                  {attachment.filename}
                </div>
                <div className="text-xs text-[#949ba4]">
                  {formatFileSize(attachment.size)}
                </div>
              </div>
              <DownloadSimple className="size-5 shrink-0 text-[#b5bac1]" />
            </a>
          )
        )}
      </div>
    )}
    </>
  );
};

export default MessageContent;
