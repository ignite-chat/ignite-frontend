import { Fragment } from 'react';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import ExternalLink from '@/components/Message/components/ExternalLink';
import SpoilerText from '@/components/Message/markdown/SpoilerText';
import TimestampDisplay from '@/components/Message/markdown/TimestampDisplay';
import { Info, Lightbulb, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';

const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

const HEADING_CLASSES = [
  'text-2xl font-bold',
  'text-xl font-bold',
  'text-lg font-bold',
  'text-base font-bold',
  'text-sm font-bold',
  'text-xs font-bold',
];

const ALERT_CONFIG = {
  Note: { icon: Info, color: 'text-blue-400', border: 'border-blue-400' },
  Tip: { icon: Lightbulb, color: 'text-green-400', border: 'border-green-400' },
  Important: { icon: AlertTriangle, color: 'text-purple-400', border: 'border-purple-400' },
  Warning: { icon: AlertTriangle, color: 'text-yellow-400', border: 'border-yellow-400' },
  Caution: { icon: AlertOctagon, color: 'text-red-400', border: 'border-red-400' },
};

const BLOCK_TYPES = new Set([
  'Heading', 'CodeBlock', 'Blockquote', 'Alert', 'List', 'Subtext',
]);

// ─── Discord mention components ──────────────────────────────────

const DiscordUserMention = ({ userId }) => {
  const user = useDiscordUsersStore((s) => s.users[userId]);
  const name = user?.global_name || user?.username || userId;

  return (
    <span className="cursor-pointer rounded bg-blue-500/20 px-1 font-medium text-blue-400 hover:bg-blue-500/30">
      @{name}
    </span>
  );
};

const DiscordChannelMention = ({ channelId }) => {
  const channel = useDiscordChannelsStore((s) => s.channels.find((c) => c.id === channelId));
  const name = channel?.name || " unknown";

  return (
    <span className="cursor-pointer rounded bg-blue-500/20 px-1 font-medium text-blue-400 hover:bg-blue-500/30">
      #{name}
    </span>
  );
};

const DiscordRoleMention = ({ roleId, guildId }) => {
  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const role = guild?.roles?.find((r) => r.id === roleId);
  const color = role?.color
    ? `#${role.color.toString(16).padStart(6, '0')}`
    : null;

  return (
    <span
      className="rounded px-1 font-medium"
      style={{
        color: color || '#8da0e2',
        backgroundColor: color ? `${color}20` : 'rgba(88,101,242,0.2)',
      }}
    >
      @{role?.name || 'Role'}
    </span>
  );
};

// ─── Text rendering helper ───────────────────────────────────────

function renderTextContent(content, key) {
  if (!content.includes('\n')) return content;
  const parts = content.split('\n');
  return parts.map((part, i) => (
    <Fragment key={`${key}-${i}`}>
      {part}
      {i < parts.length - 1 && <br />}
    </Fragment>
  ));
}

// ─── Inline node renderer ────────────────────────────────────────

function renderInlineNode(node, index, guildId) {
  const key = index;

  switch (node.type) {
    case 'Text':
      return <Fragment key={key}>{renderTextContent(node.content, key)}</Fragment>;

    case 'Bold':
      return (
        <strong key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </strong>
      );

    case 'Italic':
      return (
        <em key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </em>
      );

    case 'Underline':
      return (
        <span key={key} className="underline">
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </span>
      );

    case 'Strikethrough':
      return (
        <s key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </s>
      );

    case 'Spoiler':
      return (
        <SpoilerText key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </SpoilerText>
      );

    case 'InlineCode':
      return (
        <code key={key} className="rounded bg-gray-800 px-1.5 py-0.5 text-[0.85em] text-gray-200">
          {node.content}
        </code>
      );

    case 'Timestamp':
      return <TimestampDisplay key={key} timestamp={node.timestamp} style={node.style} />;

    case 'Mention':
      if (node.kind.kind === 'User') {
        return <DiscordUserMention key={key} userId={node.kind.id} />;
      }
      if (node.kind.kind === 'Channel') {
        return <DiscordChannelMention key={key} channelId={node.kind.id} />;
      }
      if (node.kind.kind === 'Role') {
        return <DiscordRoleMention key={key} roleId={node.kind.id} guildId={guildId} />;
      }
      if (node.kind.kind === 'Everyone' || node.kind.kind === 'Here') {
        return (
          <span key={key} className="cursor-pointer rounded bg-blue-500/20 px-1 font-medium text-blue-400 hover:bg-blue-500/30">
            @{node.kind.kind === 'Everyone' ? 'everyone' : 'here'}
          </span>
        );
      }
      return null;

    case 'Emoji': {
      if (node.kind.kind === 'Custom') {
        const ext = node.kind.animated ? 'gif' : 'webp';
        const src = `${DISCORD_EMOJI_CDN}/${node.kind.id}.${ext}?size=48`;
        return (
          <img
            key={key}
            src={src}
            alt={node.kind.name}
            title={`:${node.kind.name}:`}
            className="inline size-6 object-contain align-text-bottom"
            loading="lazy"
            draggable="false"
          />
        );
      }
      // Unicode emoji
      return (
        <img
          key={key}
          src={getTwemojiUrl(node.kind.surrogates)}
          alt={node.kind.name}
          className="inline size-5 object-contain align-text-bottom"
          loading="lazy"
          draggable="false"
        />
      );
    }

    case 'Link':
      return (
        <ExternalLink key={key} href={node.href}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </ExternalLink>
      );

    default:
      return null;
  }
}

// ─── Block node renderer ─────────────────────────────────────────

function renderBlockNode(node, index, guildId) {
  const key = `b-${index}`;

  switch (node.type) {
    case 'Heading': {
      const level = Math.min(node.level, 6);
      const className = HEADING_CLASSES[level - 1] + ' my-1 text-gray-100';
      const Tag = `h${level}`;
      return (
        <Tag key={key} className={className}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </Tag>
      );
    }

    case 'CodeBlock':
      return (
        <pre key={key} className="my-1 overflow-x-auto rounded-md bg-gray-900 p-3">
          {node.language && (
            <div className="mb-2 text-[11px] font-semibold text-gray-500">{node.language}</div>
          )}
          <code className="text-sm text-gray-200">{node.content}</code>
        </pre>
      );

    case 'Blockquote':
      return (
        <blockquote key={key} className="my-1 border-l-[3px] border-gray-500 pl-3 text-gray-300">
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </blockquote>
      );

    case 'Alert': {
      const config = ALERT_CONFIG[node.alertType] || ALERT_CONFIG.Note;
      const Icon = config.icon;
      return (
        <div key={key} className={`my-1 border-l-[3px] ${config.border} pl-3`}>
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${config.color}`}>
            <Icon className="size-4" />
            {node.alertType}
          </div>
          {node.children.length > 0 && (
            <div className="mt-0.5 text-gray-300">
              {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
            </div>
          )}
        </div>
      );
    }

    case 'List':
      if (node.ordered) {
        return (
          <ol key={key} className="my-1 list-decimal pl-6 text-gray-200">
            {node.items.map((item, i) => (
              <li key={i}>
                {item.children.map((child, j) => renderInlineNode(child, `${key}-${i}-${j}`, guildId))}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={key} className="my-1 list-disc pl-6 text-gray-200">
          {node.items.map((item, i) => (
            <li key={i}>
              {item.children.map((child, j) => renderInlineNode(child, `${key}-${i}-${j}`, guildId))}
            </li>
          ))}
        </ul>
      );

    case 'Subtext':
      return (
        <span key={key} className="text-xs text-gray-500">
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, guildId))}
        </span>
      );

    default:
      return null;
  }
}

// ─── Main renderer ───────────────────────────────────────────────

const DiscordMarkdownRenderer = ({ nodes, guildId }) => {
  if (!nodes || nodes.length === 0) return null;

  return nodes.map((node, index) => {
    if (BLOCK_TYPES.has(node.type)) {
      return renderBlockNode(node, index, guildId);
    }
    return renderInlineNode(node, index, guildId);
  });
};

export default DiscordMarkdownRenderer;
