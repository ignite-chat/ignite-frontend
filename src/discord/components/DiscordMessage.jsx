import { useState, useMemo, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DiscordService } from '../services/discord.service';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordReplyStore } from '../store/discord-reply.store';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import { parseMarkdown } from '@/components/message/markdown/parser';
import { NORMAL_MESSAGE_TYPES, MessageType, getSystemMessageText } from '../constants/message-types';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';
import DiscordUserPopoverContent from '@/discord/components/popovers/DiscordUserPopoverContent';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import { useModalStore } from '@/store/modal.store';
import DiscordMessageContextMenu from './DiscordMessageContextMenu';
import DiscordUserContextMenu from './DiscordUserContextMenu';
import { ArrowBendUpLeft } from '@phosphor-icons/react';

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

const DiscordMessageHeader = ({ message, guildId, onClickName }) => {
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const storeMember = useDiscordMembersStore((s) =>
    guildId ? s.members[guildId]?.[message.author.id] : undefined
  );

  const member = message.member || storeMember;

  const displayName =
    member?.nick || message.author.global_name || message.author.username;

  const nameColor = useMemo(() => {
    if (!guildId || !member?.roles) return undefined;
    const guild = guilds.find((g) => g.id === guildId);
    const guildRoles = guild?.roles || guild?.properties?.roles;
    if (!guildRoles) return undefined;

    const topColorRole = guildRoles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .find((r) => r.color && r.color !== 0);

    if (!topColorRole) return undefined;
    return `#${topColorRole.color.toString(16).padStart(6, '0')}`;
  }, [guildId, guilds, member?.roles]);

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
      <button
        type="button"
        className="font-semibold hover:underline"
        style={{ color: nameColor || 'white' }}
        onClick={onClickName}
      >
        {displayName}
        {message.author.bot && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium text-white no-underline">
            {(message.author.public_flags & 65536) !== 0 && (
              <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" />
              </svg>
            )}
            APP
          </span>
        )}
      </button>
      <span className="text-xs font-medium text-gray-500">{formattedDateTime}</span>
    </div>
  );
};

const DiscordMessageContent = ({ content, guildId }) => {
  const ast = useMemo(() => parseMarkdown(content), [content]);
  if (!content) return null;
  return <DiscordMarkdownRenderer nodes={ast} guildId={guildId} />;
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
                />
              )}
              {embed.thumbnail && !embed.image && (
                <img
                  src={embed.thumbnail.proxy_url || embed.thumbnail.url}
                  alt=""
                  className="mt-2 max-h-20 rounded"
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

const DiscordStickers = ({ stickerItems }) => {
  if (!stickerItems || stickerItems.length === 0) return null;

  return (
    <div className="mt-1.5 flex gap-2">
      {stickerItems.map((sticker) => {
        const url = DiscordService.getStickerUrl(sticker.id, sticker.format_type, 160);

        if (!url) {
          // Lottie stickers — show name as fallback
          return (
            <div
              key={sticker.id}
              className="flex size-[160px] items-center justify-center rounded-lg bg-[#2b2d31] text-sm text-gray-400"
            >
              {sticker.name}
            </div>
          );
        }

        return (
          <img
            key={sticker.id}
            src={url}
            alt={sticker.name}
            title={sticker.name}
            className="size-[160px] object-contain"
            draggable="false"
          />
        );
      })}
    </div>
  );
};

const DiscordReplyBar = ({ referencedMessage, guildId }) => {
  if (!referencedMessage) return null;

  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const storeMember = useDiscordMembersStore((s) =>
    guildId && referencedMessage.author?.id ? s.members[guildId]?.[referencedMessage.author.id] : undefined
  );
  const member = referencedMessage.member || storeMember;

  const displayName =
    referencedMessage.author?.global_name || referencedMessage.author?.username || 'Unknown';

  const nameColor = useMemo(() => {
    if (!guildId || !member?.roles) return undefined;
    const guild = guilds.find((g) => g.id === guildId);
    const guildRoles = guild?.roles || guild?.properties?.roles;
    if (!guildRoles) return undefined;
    const topColorRole = guildRoles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .find((r) => r.color && r.color !== 0);
    if (!topColorRole) return undefined;
    return `#${topColorRole.color.toString(16).padStart(6, '0')}`;
  }, [guildId, guilds, member?.roles]);

  const scrollToMessage = () => {
    const el = document.querySelector(`[data-message-id="${referencedMessage.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
      setTimeout(() => { el.style.backgroundColor = ''; }, 1500);
    }
  };

  const openProfile = () => {
    useModalStore.getState().push(DiscordUserProfileModal, {
      author: referencedMessage.author,
      member,
      guildId,
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <svg width="48" height="20" viewBox="0 0 48 20" fill="none" className="shrink-0 text-gray-500">
        <path
          d="M20 20V16C20 12.69 22.69 10 26 10H48"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {referencedMessage.author?.avatar && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="shrink-0 cursor-pointer">
              <img
                src={DiscordService.getUserAvatarUrl(
                  referencedMessage.author.id,
                  referencedMessage.author.avatar,
                  32
                )}
                className="size-4 rounded-full"
                alt=""
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-none bg-transparent p-0 shadow-none"
            align="start"
          >
            <DiscordUserPopoverContent
              author={referencedMessage.author}
              member={member}
              guildId={guildId}
              onOpenProfile={openProfile}
            />
          </PopoverContent>
        </Popover>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="shrink-0 font-medium hover:underline"
            style={{ color: nameColor || '#d1d5db' }}
          >
            @{displayName}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto border-none bg-transparent p-0 shadow-none"
          align="start"
        >
          <DiscordUserPopoverContent
            author={referencedMessage.author}
            member={member}
            guildId={guildId}
            onOpenProfile={openProfile}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={scrollToMessage}
        className="cursor-pointer truncate text-gray-500 hover:text-gray-300"
      >
        {referencedMessage.content?.slice(0, 100) || 'Click to see attachment'}
      </button>
    </div>
  );
};

const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

const emojiColorCache = new Map();

const getAverageColor = (src) => {
  if (emojiColorCache.has(src)) return Promise.resolve(emojiColorCache.get(src));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) { resolve(null); return; }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Boost saturation and brightness so the color pops
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 0 && max !== min) {
        const factor = 255 / max;
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
      }

      const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
      emojiColorCache.set(src, hex);
      resolve(hex);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const useEmojiColor = (emoji, fallback) => {
  const [color, setColor] = useState(() => {
    const isCustom = !!emoji.id;
    const src = isCustom
      ? `${DISCORD_EMOJI_CDN}/${emoji.id}.webp?size=32`
      : getTwemojiUrl(emoji.name);
    return emojiColorCache.get(src) || fallback;
  });

  useEffect(() => {
    const isCustom = !!emoji.id;
    const src = isCustom
      ? `${DISCORD_EMOJI_CDN}/${emoji.id}.webp?size=32`
      : getTwemojiUrl(emoji.name);

    if (emojiColorCache.has(src)) {
      setColor(emojiColorCache.get(src) || fallback);
      return;
    }

    getAverageColor(src).then((c) => setColor(c || fallback));
  }, [emoji.id, emoji.name, fallback]);

  return color;
};

const ReactionEmoji = ({ emoji }) => {
  const isCustom = !!emoji.id;
  return isCustom ? (
    <img
      src={`${DISCORD_EMOJI_CDN}/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=48`}
      alt={emoji.name}
      className="size-5 object-contain"
      draggable="false"
    />
  ) : (
    <img
      src={getTwemojiUrl(emoji.name)}
      alt={emoji.name}
      className="size-5 object-contain"
      draggable="false"
    />
  );
};

const BurstReaction = ({ emoji, count }) => {
  const burstColor = useEmojiColor(emoji, '#ffd661');

  return (
    <button
      type="button"
      className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-2 brightness-150"
      style={{ borderColor: burstColor, backgroundColor: `color-mix(in srgb, ${burstColor} 15%, #232428)` }}
    >
      <ReactionEmoji emoji={emoji} />
      <span className="min-w-3 text-center text-sm font-bold" style={{ color: burstColor }}>
        {count}
      </span>
    </button>
  );
};

const DiscordReactions = ({ reactions }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((reaction, i) => {
        const emoji = reaction.emoji;
        const isCustom = !!emoji.id;
        const key = isCustom ? emoji.id : `${emoji.name}-${i}`;
        const burstCount = reaction.count_details?.burst || 0;
        const normalCount = reaction.count_details?.normal || 0;
        const hasBurst = burstCount > 0;
        const hasNormal = normalCount > 0;

        return (
          <div key={key} className="flex items-center gap-1">
            {hasBurst && <BurstReaction emoji={emoji} count={burstCount} />}
            {hasNormal && (
              <button
                type="button"
                className={cn(
                  'flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-2',
                  reaction.me
                    ? 'border-[#5865f2] bg-[#5865f2]/25 hover:border-[#7983f5]'
                    : 'border-transparent bg-[#232428] hover:border-[#4e505c]'
                )}
              >
                <ReactionEmoji emoji={emoji} />
                <span className={cn(
                  'min-w-3 text-center text-sm font-bold',
                  reaction.me ? 'text-[#c9cdfb]' : 'text-[#b5bac1]'
                )}>
                  {normalCount}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SystemMessageIcon = ({ type }) => {
  // Join / welcome
  if (type === MessageType.USER_JOIN) {
    return (
      <svg className="size-4 text-green-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M15.32 8.94a1.5 1.5 0 0 0 0-1.89l-1.42-1.84a.2.2 0 0 1-.04-.1L13.5 3a1.5 1.5 0 0 0-1.33-1.22l-2.35-.22a.2.2 0 0 1-.09-.04L8.15.26a1.5 1.5 0 0 0-1.89 0L4.73 1.53a.2.2 0 0 1-.1.04L2.28 1.78A1.5 1.5 0 0 0 1.06 3l-.36 2.11a.2.2 0 0 1-.04.1L.24 7.05a1.5 1.5 0 0 0 0 1.89l1.42 1.84a.2.2 0 0 1 .04.1L2.06 13a1.5 1.5 0 0 0 1.33 1.22l2.35.22a.2.2 0 0 1 .09.04l1.57 1.27a1.5 1.5 0 0 0 1.89 0l1.53-1.27a.2.2 0 0 1 .1-.04l2.35-.22c.67-.06 1.2-.57 1.33-1.22l.36-2.11a.2.2 0 0 1 .04-.1l1.32-1.84zM7.2 11.5l-3.7-3.2 1.3-1.5 2.1 1.8L10.6 5l1.6 1.2-5 5.3z" />
      </svg>
    );
  }
  // Boost
  if (type >= MessageType.GUILD_BOOST && type <= MessageType.GUILD_BOOST_TIER_3) {
    return (
      <svg className="size-4 text-[#f47fff]" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.13 1.2a.4.4 0 0 0-.26 0l-5.4 2.1a.4.4 0 0 0-.25.38v4.25a7.47 7.47 0 0 0 5.52 7.22.4.4 0 0 0 .26 0 7.47 7.47 0 0 0 5.52-7.22V3.68a.4.4 0 0 0-.25-.38L8.13 1.2z" />
      </svg>
    );
  }
  // Pin
  if (type === MessageType.CHANNEL_PINNED_MESSAGE) {
    return (
      <svg className="size-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.32 1.81c0-.53.43-.96.96-.96h5.44c.53 0 .96.43.96.96v2.71l1.7 2.56a.5.5 0 0 1-.42.77H8.5V12l-.5 2-.5-2V7.85H3.04a.5.5 0 0 1-.42-.77l1.7-2.56V1.81z" />
      </svg>
    );
  }
  // Thread
  if (type === MessageType.THREAD_CREATED) {
    return (
      <svg className="size-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.43 2h1.39l-.74 3.78h2.87L9.69 2h1.39l-.74 3.78H13v1.34h-2.91l-.57 2.88H12v1.34H9.26L8.52 15H7.14l.74-3.66H4.99L4.26 15H2.87l.74-3.66H1v-1.34h2.86l.57-2.88H2v-1.34h2.69L5.43 2zm1.56 5.12-.57 2.88h2.89l.57-2.88H6.99z" />
      </svg>
    );
  }
  // Call
  if (type === MessageType.CALL) {
    return (
      <svg className="size-4 text-green-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2.7 1.44c.53-.18 1.1.03 1.36.5l1.37 2.45a1.06 1.06 0 0 1-.22 1.3l-.83.72a6.55 6.55 0 0 0 5.21 5.21l.72-.83a1.06 1.06 0 0 1 1.3-.22l2.45 1.37c.47.26.68.83.5 1.36l-.62 1.85a1.06 1.06 0 0 1-1.15.7A13.06 13.06 0 0 1 1.44 4.51c-.14-.58.14-1.18.7-1.15l1.85-.62-.29.7.29-.7z" />
      </svg>
    );
  }
  // Channel name / icon change
  if (type === MessageType.CHANNEL_NAME_CHANGE || type === MessageType.CHANNEL_ICON_CHANGE) {
    return (
      <svg className="size-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M12.41 2.58a2 2 0 0 1 2.83 2.83l-7.07 7.07-3.54.71.71-3.54 7.07-7.07z" />
      </svg>
    );
  }
  // Recipient add/remove
  if (type === MessageType.RECIPIENT_ADD || type === MessageType.RECIPIENT_REMOVE) {
    return (
      <svg className="size-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-3.31 0-6 1.34-6 3v1h12v-1c0-1.66-2.69-3-6-3z" />
      </svg>
    );
  }
  // Default fallback
  return (
    <svg className="size-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 4a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0zM7 7h2v4H7V7z" />
    </svg>
  );
};

const DiscordSystemMessage = memo(({ message, prevMessage, guildId }) => {
  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const guildName = guild?.properties?.name || guild?.name;
  const storeMember = useDiscordMembersStore((s) =>
    guildId && message.author?.id ? s.members[guildId]?.[message.author.id] : undefined
  );
  const member = message.member || storeMember;

  const text = useMemo(() => getSystemMessageText(message, guildName), [message, guildName]);

  const authorName = message.author?.global_name || message.author?.username || 'Unknown';

  const nameColor = useMemo(() => {
    if (!guildId || !member?.roles) return undefined;
    const guildRoles = guild?.roles || guild?.properties?.roles;
    if (!guildRoles) return undefined;
    const topColorRole = guildRoles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .find((r) => r.color && r.color !== 0);
    if (!topColorRole) return undefined;
    return `#${topColorRole.color.toString(16).padStart(6, '0')}`;
  }, [guildId, guild, member?.roles]);

  const formattedTime = useMemo(() => {
    const date = new Date(message.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${day} at ${time}`;
  }, [message.timestamp]);

  // Parse bold text marked with ** **, tagging the author part specially
  const parts = useMemo(() => {
    const result = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match;
    let foundAuthor = false;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) result.push({ text: text.slice(last, match.index), type: 'text' });
      // The first bold part that matches the author name is clickable
      if (!foundAuthor && match[1] === authorName) {
        result.push({ text: match[1], type: 'author' });
        foundAuthor = true;
      } else {
        result.push({ text: match[1], type: 'bold' });
      }
      last = regex.lastIndex;
    }
    if (last < text.length) result.push({ text: text.slice(last), type: 'text' });
    return result;
  }, [text, authorName]);

  return (
    <>
      <div className="group relative flex items-center gap-4 px-4 py-1 hover:bg-gray-800/40">
        <div className="flex w-10 shrink-0 items-center justify-center">
          <SystemMessageIcon type={message.type} />
        </div>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="text-sm text-gray-400">
            {parts.map((p, i) => {
              if (p.type === 'author') {
                return (
                  <button
                    key={i}
                    type="button"
                    className="font-semibold hover:underline"
                    style={{ color: nameColor || '#e5e7eb' }}
                    onClick={() => useModalStore.getState().push(DiscordUserProfileModal, { author: message.author, member, guildId })}
                  >
                    {p.text}
                  </button>
                );
              }
              if (p.type === 'bold') {
                return <strong key={i} className="font-semibold text-gray-200">{p.text}</strong>;
              }
              return <span key={i}>{p.text}</span>;
            })}
          </span>
          <span className="shrink-0 text-xs text-gray-500">{formattedTime}</span>
        </div>
      </div>
    </>
  );
});

DiscordSystemMessage.displayName = 'DiscordSystemMessage';

const DiscordNormalMessage = memo(({ message, prevMessage, currentUserId, guildId, hasManageMessages, hasKickMembers, hasBanMembers, pending }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const hasReply = !!message.referenced_message || !!message.message_reference;

  const shouldStack = useMemo(() => {
    if (hasReply) return false;
    if (!prevMessage) return false;
    // Don't stack after a system message
    if (!NORMAL_MESSAGE_TYPES.has(prevMessage.type)) return false;
    const sameAuthor = prevMessage.author.id === message.author.id;
    const timeDiff =
      (new Date(message.timestamp) - new Date(prevMessage.timestamp)) / 1000;
    return sameAuthor && timeDiff < 60;
  }, [prevMessage, message, hasReply]);

  const isOwnMessage = currentUserId === message.author.id;
  const canDelete = isOwnMessage || hasManageMessages;
  const canKick = !!guildId && !isOwnMessage && hasKickMembers;
  const canBan = !!guildId && !isOwnMessage && hasBanMembers;

  const isMentioned = useMemo(() => {
    if (message.mention_everyone) return true;
    if (message.mentions?.some((m) => m.id === currentUserId)) return true;
    return false;
  }, [message.mention_everyone, message.mentions, currentUserId]);

  const openProfile = () => {
    setPopoverOpen(false);
    useModalStore.getState().push(DiscordUserProfileModal, { author: message.author, member: message.member, guildId });
  };

  const messageClasses = cn(
    'group relative block py-1 transition-all duration-200 hover:bg-gray-800/40',
    shouldStack ? '' : 'mt-3.5',
    isMentioned && 'border-l-2 border-yellow-500/70 bg-yellow-500/5 hover:bg-yellow-500/10',
    pending && 'opacity-50 pointer-events-none'
  );

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <ContextMenu>
          <ContextMenuTrigger className={messageClasses}>
            {/* Hover action bar */}
            {!pending && (
              <div className="absolute -top-3.5 right-4 z-10 hidden items-center gap-0.5 rounded border border-white/10 bg-[#2b2d31] p-0.5 shadow-md group-hover:flex">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    useDiscordReplyStore.getState().setReplyingMessage(message.id, message);
                  }}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
                  title="Reply"
                >
                  <ArrowBendUpLeft size={16} />
                </button>
              </div>
            )}

            {hasReply && (
              <div className="mb-1 px-4">
                <DiscordReplyBar referencedMessage={message.referenced_message} guildId={guildId} />
              </div>
            )}

            <div className="flex items-start gap-4 px-4">
              {shouldStack ? (
                <div className="w-10" />
              ) : (
                <ContextMenu>
                  <PopoverTrigger asChild>
                    <ContextMenuTrigger asChild>
                      <button type="button" className="shrink-0 cursor-pointer">
                        <DiscordAvatar author={message.author} className="size-10" />
                      </button>
                    </ContextMenuTrigger>
                  </PopoverTrigger>
                  <ContextMenuContent className="w-48">
                    <DiscordUserContextMenu
                      author={message.author}
                      guildId={guildId}
                      canKick={canKick}
                      canBan={canBan}
                      onViewProfile={openProfile}
                    />
                  </ContextMenuContent>
                </ContextMenu>
              )}

              <div className="flex flex-1 flex-col items-start justify-start overflow-hidden">
                {!shouldStack && (
                  <DiscordMessageHeader message={message} guildId={guildId} onClickName={openProfile} />
                )}

                <div className="whitespace-pre-wrap break-words text-gray-400 [overflow-wrap:anywhere]">
                  <DiscordMessageContent content={message.content} guildId={guildId} />
                  {message.edited_timestamp && (
                    <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
                  )}
                </div>

                <DiscordAttachments attachments={message.attachments} />
                <DiscordEmbeds embeds={message.embeds} />
                <DiscordStickers stickerItems={message.sticker_items} />
              </div>
            </div>
            {message.reactions?.length > 0 && (
              <div className="pl-[72px]">
                <DiscordReactions reactions={message.reactions} />
              </div>
            )}
          </ContextMenuTrigger>

          <DiscordMessageContextMenu message={message} canDelete={canDelete} />
        </ContextMenu>

        <PopoverContent
          className="w-auto border-none bg-transparent p-0 shadow-none"
          align="start"
          alignOffset={0}
        >
          <DiscordUserPopoverContent
            author={message.author}
            member={message.member}
            guildId={guildId}
            onOpenProfile={openProfile}
          />
        </PopoverContent>
      </Popover>

    </>
  );
});

DiscordNormalMessage.displayName = 'DiscordNormalMessage';

const DiscordMessage = memo(({ message, prevMessage, currentUserId, guildId, hasManageMessages, hasKickMembers, hasBanMembers, pending }) => {
  if (!NORMAL_MESSAGE_TYPES.has(message.type)) {
    return <DiscordSystemMessage message={message} prevMessage={prevMessage} guildId={guildId} />;
  }
  return (
    <DiscordNormalMessage
      message={message}
      prevMessage={prevMessage}
      currentUserId={currentUserId}
      guildId={guildId}
      hasManageMessages={hasManageMessages}
      hasKickMembers={hasKickMembers}
      hasBanMembers={hasBanMembers}
      pending={pending}
    />
  );
});

DiscordMessage.displayName = 'DiscordMessage';
export default DiscordMessage;
