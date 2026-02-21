import { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { DiscordService } from '../services/discord.service';
import { parseMarkdown } from '@/components/Message/markdown/parser';
import MarkdownRenderer from '@/components/Message/markdown/MarkdownRenderer';

const DiscordAvatar = ({ author, className = 'size-10' }) => {
  const url = DiscordService.getUserAvatarUrl(author.id, author.avatar, 80);

  return (
    <img
      src={url}
      alt={author.username}
      className={cn('rounded-full object-cover select-none', className)}
      draggable="false"
    />
  );
};

const DiscordMessageHeader = ({ message }) => {
  const displayName =
    message.author.global_name || message.author.username;

  const formattedDateTime = useMemo(() => {
    const date = new Date(message.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const day = isToday
      ? 'Today'
      : isYesterday
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          });
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return `${day} at ${time}`;
  }, [message.timestamp]);

  return (
    <div className="relative mb-1 flex items-baseline gap-2 leading-none">
      <span className="font-semibold leading-none text-white">
        {displayName}
        {message.author.bot && (
          <span className="ml-1.5 inline-flex items-center rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium uppercase text-white">
            Bot
          </span>
        )}
      </span>
      <span className="text-xs font-medium text-gray-500">{formattedDateTime}</span>
    </div>
  );
};

const DiscordMessageContent = ({ content }) => {
  const ast = useMemo(() => parseMarkdown(content || '', {}), [content]);

  return <MarkdownRenderer nodes={ast} isReply={false} />;
};

const DiscordAttachments = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {attachments.map((att) => {
        const isImage = att.content_type?.startsWith('image/');
        const isVideo = att.content_type?.startsWith('video/');

        if (isImage) {
          const maxW = Math.min(att.width || 400, 400);
          const maxH = Math.min(att.height || 300, 300);
          return (
            <a
              key={att.id}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={att.proxy_url || att.url}
                alt={att.filename}
                className="rounded-lg"
                style={{ maxWidth: maxW, maxHeight: maxH }}
                loading="lazy"
              />
            </a>
          );
        }

        if (isVideo) {
          return (
            <video
              key={att.id}
              src={att.proxy_url || att.url}
              controls
              className="max-h-[300px] max-w-[400px] rounded-lg"
            />
          );
        }

        return (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-[#2b2d31] px-3 py-2 text-sm text-blue-400 hover:underline"
          >
            <span>{att.filename}</span>
            <span className="text-xs text-gray-500">
              {att.size > 1048576
                ? `${(att.size / 1048576).toFixed(1)} MB`
                : `${(att.size / 1024).toFixed(1)} KB`}
            </span>
          </a>
        );
      })}
    </div>
  );
};

const DiscordEmbeds = ({ embeds }) => {
  if (!embeds || embeds.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {embeds.map((embed, i) => {
        const borderColor = embed.color
          ? `#${embed.color.toString(16).padStart(6, '0')}`
          : '#202225';

        return (
          <div
            key={i}
            className="max-w-[520px] overflow-hidden rounded bg-[#2f3136] border-l-4"
            style={{ borderLeftColor: borderColor }}
          >
            <div className="p-3">
              {embed.author && (
                <div className="mb-1 flex items-center gap-2 text-sm">
                  {embed.author.icon_url && (
                    <img src={embed.author.icon_url} className="size-6 rounded-full" alt="" />
                  )}
                  <span className="font-semibold text-white">{embed.author.name}</span>
                </div>
              )}
              {embed.title && (
                <div className="mb-1">
                  {embed.url ? (
                    <a
                      href={embed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-400 hover:underline"
                    >
                      {embed.title}
                    </a>
                  ) : (
                    <span className="font-semibold text-white">{embed.title}</span>
                  )}
                </div>
              )}
              {embed.description && (
                <p className="text-sm text-gray-300">{embed.description}</p>
              )}
              {embed.image && (
                <img
                  src={embed.image.proxy_url || embed.image.url}
                  alt=""
                  className="mt-2 max-w-full rounded"
                  loading="lazy"
                />
              )}
              {embed.thumbnail && !embed.image && (
                <img
                  src={embed.thumbnail.proxy_url || embed.thumbnail.url}
                  alt=""
                  className="mt-2 max-h-20 rounded"
                  loading="lazy"
                />
              )}
              {embed.footer && (
                <div className="mt-2 text-xs text-gray-500">{embed.footer.text}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DiscordReplyBar = ({ referencedMessage }) => {
  if (!referencedMessage) return null;

  const displayName =
    referencedMessage.author?.global_name || referencedMessage.author?.username || 'Unknown';

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <svg width="33" height="20" viewBox="0 0 33 20" fill="none" className="text-gray-500">
        <path
          d="M17 15V10C17 5.58172 20.5817 2 25 2H33"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {referencedMessage.author?.avatar && (
        <img
          src={DiscordService.getUserAvatarUrl(
            referencedMessage.author.id,
            referencedMessage.author.avatar,
            32
          )}
          className="size-4 rounded-full"
          alt=""
        />
      )}
      <span className="font-medium text-gray-300">{displayName}</span>
      <span className="truncate text-gray-500">
        {referencedMessage.content?.slice(0, 100) || 'Click to see attachment'}
      </span>
    </div>
  );
};

const DiscordMessage = memo(({ message, prevMessage }) => {
  const hasReply = !!message.referenced_message || !!message.message_reference;

  const shouldStack = useMemo(() => {
    if (hasReply) return false;
    if (!prevMessage) return false;
    const sameAuthor = prevMessage.author.id === message.author.id;
    const timeDiff =
      (new Date(message.timestamp) - new Date(prevMessage.timestamp)) / 1000;
    return sameAuthor && timeDiff < 60;
  }, [prevMessage, message, hasReply]);

  const messageClasses = cn(
    'group relative block py-1 transition-all duration-200 hover:bg-gray-800/40',
    shouldStack ? '' : 'mt-3.5'
  );

  return (
    <div className={messageClasses}>
      {hasReply && (
        <div className="px-4">
          <DiscordReplyBar referencedMessage={message.referenced_message} />
        </div>
      )}

      <div className="flex items-start gap-4 px-4">
        {shouldStack ? (
          <div className="w-10" />
        ) : (
          <DiscordAvatar author={message.author} className="size-10 shrink-0" />
        )}

        <div className="flex flex-1 flex-col items-start justify-start overflow-hidden">
          {!shouldStack && <DiscordMessageHeader message={message} />}

          <div className="whitespace-pre-wrap break-words text-gray-400 [overflow-wrap:anywhere]">
            <DiscordMessageContent content={message.content} />
            {message.edited_timestamp && (
              <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
            )}
          </div>

          <DiscordAttachments attachments={message.attachments} />
          <DiscordEmbeds embeds={message.embeds} />
        </div>
      </div>
    </div>
  );
});

DiscordMessage.displayName = 'DiscordMessage';
export default DiscordMessage;
