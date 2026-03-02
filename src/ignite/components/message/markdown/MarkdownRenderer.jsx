import { Fragment } from 'react';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import Emoji from '../components/Emoji';
import ExternalLink from '@/components/message/components/ExternalLink';
import MentionText from './MentionText';
import ChannelMention from './ChannelMention';
import MessageLinkMention, { isInternalMessageLink } from './MessageLinkMention';
import SpoilerText from '@/components/message/markdown/SpoilerText';
import TimestampDisplay from '@/components/message/markdown/TimestampDisplay';
import { Info, Lightbulb, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';

const EMOJI_CDN_PREFIX = `${import.meta.env.VITE_CDN_BASE_URL}/emojis/`;

const HEADING_CLASSES = [
  'text-2xl font-bold',    // h1
  'text-xl font-bold',     // h2
  'text-lg font-bold',     // h3
  'text-base font-bold',   // h4
  'text-sm font-bold',     // h5
  'text-xs font-bold',     // h6
];

const ALERT_CONFIG = {
  Note: { icon: Info, color: 'text-blue-400', border: 'border-blue-400' },
  Tip: { icon: Lightbulb, color: 'text-green-400', border: 'border-green-400' },
  Important: { icon: AlertTriangle, color: 'text-purple-400', border: 'border-purple-400' },
  Warning: { icon: AlertTriangle, color: 'text-yellow-400', border: 'border-yellow-400' },
  Caution: { icon: AlertOctagon, color: 'text-red-400', border: 'border-red-400' },
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

function renderInlineNode(node, index, isReply) {
  const key = index;

  switch (node.type) {
    case 'Text':
      return <Fragment key={key}>{renderTextContent(node.content, key)}</Fragment>;

    case 'Bold':
      return (
        <strong key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
        </strong>
      );

    case 'Italic':
      return (
        <em key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
        </em>
      );

    case 'Underline':
      return (
        <span key={key} className="underline">
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
        </span>
      );

    case 'Strikethrough':
      return (
        <s key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
        </s>
      );

    case 'Spoiler':
      return (
        <SpoilerText key={key}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
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
        return <MentionText key={key} userId={node.kind.id} isReply={isReply} />;
      }
      if (node.kind.kind === 'Channel') {
        return <ChannelMention key={key} channelId={node.kind.id} isReply={isReply} />;
      }
      if (node.kind.kind === 'Role') {
        return (
          <span key={key} className="rounded bg-blue-500/20 px-1 font-medium text-blue-400">
            @Role
          </span>
        );
      }
      if (node.kind.kind === 'Everyone' || node.kind.kind === 'Here') {
        return (
          <span key={key} className="rounded bg-blue-500/20 px-1 font-medium text-blue-400">
            @{node.kind.kind === 'Everyone' ? 'everyone' : 'here'}
          </span>
        );
      }
      return null;

    case 'Emoji': {
      if (node.kind.kind === 'Custom') {
        return (
          <Emoji
            key={key}
            src={`${EMOJI_CDN_PREFIX}${node.kind.id}`}
            alt={node.kind.name}
            emojiId={node.kind.id}
            isTwemoji={false}
            isReply={isReply}
          />
        );
      }
      // Unicode emoji
      return (
        <Emoji
          key={key}
          src={getTwemojiUrl(node.kind.surrogates)}
          alt={node.kind.name}
          isTwemoji={true}
          isReply={isReply}
        />
      );
    }

    case 'Link': {
      const msgLink = isInternalMessageLink(node.href);
      if (msgLink) {
        return (
          <MessageLinkMention
            key={key}
            guildId={msgLink.guildId}
            channelId={msgLink.channelId}
            messageId={msgLink.messageId}
          />
        );
      }
      if (isReply) {
        return (
          <span key={key} className="font-medium text-blue-400">
            {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
          </span>
        );
      }
      return (
        <ExternalLink key={key} href={node.href}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
        </ExternalLink>
      );
    }

    default:
      return null;
  }
}

// ─── Block node renderer ─────────────────────────────────────────

function renderBlockNode(node, index, isReply) {
  const key = `b-${index}`;

  switch (node.type) {
    case 'Heading': {
      const level = Math.min(node.level, 6);
      const className = HEADING_CLASSES[level - 1] + ' my-1 text-gray-100';
      const Tag = `h${level}`;
      return (
        <Tag key={key} className={className}>
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
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
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
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
              {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
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
                {item.children.map((child, j) => renderInlineNode(child, `${key}-${i}-${j}`, isReply))}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={key} className="my-1 list-disc pl-6 text-gray-200">
          {node.items.map((item, i) => (
            <li key={i}>
              {item.children.map((child, j) => renderInlineNode(child, `${key}-${i}-${j}`, isReply))}
            </li>
          ))}
        </ul>
      );

    case 'Subtext':
      return (
        <span key={key} className="text-xs text-gray-500">
          {node.children.map((child, i) => renderInlineNode(child, `${key}-${i}`, isReply))}
        </span>
      );

    default:
      return null;
  }
}

// ─── Block types set ─────────────────────────────────────────────

const BLOCK_TYPES = new Set([
  'Heading', 'CodeBlock', 'Blockquote', 'Alert', 'List', 'Subtext',
]);

// ─── Main renderer ───────────────────────────────────────────────

const MarkdownRenderer = ({ nodes, isReply = false }) => {
  if (!nodes || nodes.length === 0) return null;

  return nodes.map((node, index) => {
    if (BLOCK_TYPES.has(node.type)) {
      return renderBlockNode(node, index, isReply);
    }
    return renderInlineNode(node, index, isReply);
  });
};

export default MarkdownRenderer;
