import { useMemo } from 'react';
import { useTelegramUsersStore } from '../store/telegram-users.store';
import { useTelegramStore } from '../store/telegram.store';
import { formatMessageTime } from '../utils/helpers';
import { Check } from '@phosphor-icons/react';

/**
 * Render text with Telegram entities (bold, italic, code, links, etc.)
 */
const FormattedText = ({ text, entities }) => {
  if (!entities || entities.length === 0) return <>{text}</>;

  const sorted = [...entities].sort((a, b) => a.offset - b.offset);
  const parts = [];
  let cursor = 0;

  for (const entity of sorted) {
    if (entity.offset > cursor) {
      parts.push(<span key={`t${cursor}`}>{text.slice(cursor, entity.offset)}</span>);
    }

    const entityText = text.slice(entity.offset, entity.offset + entity.length);

    switch (entity.type) {
      case 'bold':
        parts.push(<strong key={`e${entity.offset}`}>{entityText}</strong>);
        break;
      case 'italic':
        parts.push(<em key={`e${entity.offset}`}>{entityText}</em>);
        break;
      case 'underline':
        parts.push(<u key={`e${entity.offset}`}>{entityText}</u>);
        break;
      case 'strikethrough':
        parts.push(<s key={`e${entity.offset}`}>{entityText}</s>);
        break;
      case 'code':
        parts.push(
          <code key={`e${entity.offset}`} className="rounded bg-black/20 px-1 py-0.5 font-mono text-[13px]">
            {entityText}
          </code>,
        );
        break;
      case 'pre':
        parts.push(
          <pre key={`e${entity.offset}`} className="my-1 overflow-x-auto rounded bg-black/20 p-2 font-mono text-[13px]">
            <code>{entityText}</code>
          </pre>,
        );
        break;
      case 'url':
        parts.push(
          <a key={`e${entity.offset}`} href={entityText} target="_blank" rel="noopener noreferrer" className="underline">
            {entityText}
          </a>,
        );
        break;
      case 'textUrl':
        parts.push(
          <a key={`e${entity.offset}`} href={entity.url} target="_blank" rel="noopener noreferrer" className="underline">
            {entityText}
          </a>,
        );
        break;
      case 'mention':
        parts.push(
          <span key={`e${entity.offset}`} className="cursor-pointer font-medium hover:underline">
            {entityText}
          </span>,
        );
        break;
      case 'spoiler':
        parts.push(
          <span key={`e${entity.offset}`} className="rounded bg-white/30 px-0.5 transition-colors hover:bg-transparent">
            {entityText}
          </span>,
        );
        break;
      case 'blockquote':
        parts.push(
          <blockquote key={`e${entity.offset}`} className="border-l-2 border-white/30 pl-2 italic opacity-80">
            {entityText}
          </blockquote>,
        );
        break;
      default:
        parts.push(<span key={`e${entity.offset}`}>{entityText}</span>);
    }

    cursor = entity.offset + entity.length;
  }

  if (cursor < text.length) {
    parts.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
};

const formatSize = (size) => {
  if (!size || size <= 0) return null;
  if (size > 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(0)} KB`;
};

const formatDuration = (seconds) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MediaIndicator = ({ media, isOut }) => {
  if (!media) return null;

  const muted = isOut ? 'text-white/50' : 'text-gray-500';
  const base = isOut ? 'text-white/70' : 'text-gray-400';

  // Web page preview — richer display
  if (media.type === 'webpage' && (media.siteName || media.title || media.description)) {
    return (
      <div className={`mt-1 border-l-2 pl-2 ${isOut ? 'border-blue-300/50' : 'border-blue-400/50'}`}>
        {media.siteName && <div className={`text-xs font-medium ${isOut ? 'text-blue-200' : 'text-blue-400'}`}>{media.siteName}</div>}
        {media.title && <div className={`text-sm font-medium ${isOut ? 'text-white/90' : 'text-gray-200'}`}>{media.title}</div>}
        {media.description && <div className={`mt-0.5 text-xs leading-snug ${base} line-clamp-3`}>{media.description}</div>}
      </div>
    );
  }

  // Dice
  if (media.type === 'dice') {
    return (
      <div className="text-3xl">{media.emoji || '🎲'}</div>
    );
  }

  // Contact with details
  if (media.type === 'contact' && (media.title || media.description)) {
    return (
      <div className={`flex items-center gap-2 text-xs ${base}`}>
        <span>👤</span>
        <div>
          {media.title && <div className="font-medium">{media.title}</div>}
          {media.description && <div className={muted}>{media.description}</div>}
        </div>
      </div>
    );
  }

  // Venue
  if (media.type === 'venue') {
    return (
      <div className={`flex items-start gap-1.5 text-xs ${base}`}>
        <span>📍</span>
        <div>
          {media.title && <div className="font-medium">{media.title}</div>}
          {media.address && <div className={muted}>{media.address}</div>}
        </div>
      </div>
    );
  }

  // Invoice
  if (media.type === 'invoice') {
    const amount = media.totalAmount ? `${(media.totalAmount / 100).toFixed(2)} ${media.currency || ''}` : '';
    return (
      <div className={`flex items-start gap-1.5 text-xs ${base}`}>
        <span>💳</span>
        <div>
          {media.title && <div className="font-medium">{media.title}</div>}
          {amount && <div className={muted}>{amount}</div>}
        </div>
      </div>
    );
  }

  // Poll
  if (media.type === 'poll') {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${base}`}>
        <span>📊</span>
        <span className="font-medium">{media.title || 'Poll'}</span>
      </div>
    );
  }

  // Game
  if (media.type === 'game') {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${base}`}>
        <span>🎮</span>
        <span className="font-medium">{media.gameName || 'Game'}</span>
      </div>
    );
  }

  // Simple label types
  const labels = {
    photo: '🖼 Photo',
    video: '🎬 Video',
    audio: '🎵 Audio',
    voice: '🎤 Voice message',
    document: `📎 ${media.fileName || 'Document'}`,
    sticker: '🎨 Sticker',
    animation: 'GIF',
    videoNote: '⏺ Video message',
    location: '📍 Location',
    story: '📖 Story',
    giveaway: '🎁 Giveaway',
    paidMedia: '💰 Paid media',
    webpage: '🔗 Link',
    contact: '👤 Contact',
    unsupported: '📦 Attachment',
  };

  const sizeStr = formatSize(media.size);
  const durationStr = formatDuration(media.duration);

  return (
    <div className={`text-xs ${base}`}>
      <span>{labels[media.type] || 'Attachment'}</span>
      {durationStr && <span className={`ml-1 ${muted}`}>({durationStr})</span>}
      {!durationStr && sizeStr && <span className={`ml-1 ${muted}`}>({sizeStr})</span>}
    </div>
  );
};

/** Sender color palette for group chats — matches Telegram's colors */
const SENDER_COLORS = [
  'text-red-400',
  'text-orange-400',
  'text-violet-400',
  'text-green-400',
  'text-cyan-400',
  'text-blue-400',
  'text-pink-400',
  'text-yellow-400',
];

function getSenderColor(senderId) {
  if (!senderId) return SENDER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = (hash * 31 + senderId.charCodeAt(i)) | 0;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

const TelegramMessage = ({ message, showSender, isPending, isGroupChat }) => {
  const users = useTelegramUsersStore((s) => s.users);
  const currentUser = useTelegramStore((s) => s.user);

  const senderName = useMemo(() => {
    if (isPending) return message.senderName;
    if (message.senderName) return message.senderName;
    if (message.senderId) {
      const user = users[message.senderId];
      if (user) return user.deleted ? 'Deleted Account' : [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    return message.out ? (currentUser?.firstName || 'You') : 'Unknown';
  }, [message, users, currentUser, isPending]);

  const isOut = isPending ? true : message.out;
  const timeStr = formatMessageTime(message.date);
  const senderColor = getSenderColor(message.senderId);

  // Action/service messages — centered pill
  if (message.action) {
    return (
      <div className="flex justify-center px-4 py-1.5">
        <span className="max-w-[80%] rounded-full bg-black/30 px-3 py-1 text-center text-xs text-gray-400">
          {senderName} {message.action}
        </span>
      </div>
    );
  }

  // Determine if this is the last message in a group (shows the tail)
  const showTail = showSender;

  return (
    <div
      className={`flex px-3 ${showTail ? 'mt-1' : 'mt-px'} ${
        isOut ? 'justify-end' : 'justify-start'
      } ${isPending && message.status === 'failed' ? 'opacity-50' : ''} ${
        isPending && message.status === 'sending' ? 'opacity-70' : ''
      }`}
    >
      <div
        className={`relative max-w-[85%] min-w-[80px] rounded-xl px-2.5 pb-1 pt-1.5 md:max-w-[65%] ${
          isOut
            ? 'bg-[#2B5278] text-white'
            : 'bg-[#212121] text-gray-100'
        }`}
      >
        {/* Sender name in group chats */}
        {showSender && !isOut && isGroupChat && (
          <div className={`mb-0.5 text-[13px] font-medium ${senderColor}`}>
            {senderName}
          </div>
        )}

        {/* Message content */}
        {message.text && (
          <div className="whitespace-pre-wrap text-sm leading-[1.35] [overflow-wrap:anywhere]">
            <FormattedText text={message.text} entities={message.entities} />
          </div>
        )}

        <MediaIndicator media={message.media} isOut={isOut} />

        {/* Timestamp + read status (inline at bottom-right, Telegram style) */}
        <div className={`flex items-center justify-end gap-1 ${message.text || message.media ? '-mb-0.5 mt-0.5' : ''}`}>
          {message.editDate && (
            <span className={`text-[10px] ${isOut ? 'text-white/40' : 'text-gray-500'}`}>edited</span>
          )}
          <span className={`text-[11px] leading-none ${isOut ? 'text-white/50' : 'text-gray-500'}`}>
            {timeStr}
          </span>
          {isOut && (
            <div className="flex -space-x-1">
              <Check size={12} weight="bold" className={isPending ? 'text-white/30' : 'text-[#4fae4e]'} />
              {!isPending && <Check size={12} weight="bold" className="text-[#4fae4e]" />}
            </div>
          )}
        </div>

        {/* Failed indicator */}
        {isPending && message.status === 'failed' && message.error && (
          <div className="mt-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] text-red-300">
            {message.error.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramMessage;
