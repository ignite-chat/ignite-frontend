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

const MessageContent = ({ content }) => {
  const { guildId } = useGuildContext();
  const { guildEmojis } = useEmojisStore();
  const emojis = guildEmojis[guildId] || [];

  // Parse the content and split by mentions
  // Regex to match <@userid> pattern
  const mentionRegex = /<@(\d+)>/g;

  const parts = useMemo(() => {
    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        elements.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
          key: `text-${lastIndex}`,
        });
      }

      // Add the mention
      elements.push({
        type: 'mention',
        userId: match[1],
        key: `mention-${match.index}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last mention
    if (lastIndex < content.length) {
      elements.push({
        type: 'text',
        content: content.substring(lastIndex),
        key: `text-${lastIndex}`,
      });
    }

    return elements;
  }, [content]);

  return (
    <>
      {parts.map((part) => {
        if (part.type === 'mention') {
          return <MentionText key={part.key} userId={part.userId} />;
        }
        return (
          <Markdown
            key={part.key}
            remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
            components={{
              // Override paragraph to render inline
              p: ({ children }) => <>{children}</>,
              // Render custom emojis as inline images, disable other images
              img: ({ src, alt }) => {
                if (src?.startsWith(EMOJI_CDN_PREFIX)) {
                  return (
                    <img
                      src={src}
                      alt={alt}
                      className="inline h-10 w-10 object-contain align-text-bottom"
                    />
                  );
                }
                return (
                  <span className="text-gray-500">
                    [{alt || 'image'}]({src})
                  </span>
                );
              },
              // External links with confirmation dialog
              a: ({ href, children }) =>
                href ? <ExternalLink href={href}>{children}</ExternalLink> : <>{children}</>,
            }}
          >
            {convertEmojiShortcodes(convertCustomEmojis(part.content, emojis))}
          </Markdown>
        );
      })}
    </>
  );
};

export default MessageContent;
