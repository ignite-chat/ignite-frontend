import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useContextMenuStore } from '@/store/context-menu.store';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordReplyStore } from '../store/discord-reply.store';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import { useEmojisStore } from '@/ignite/store/emojis.store';
import emojisData from '@/assets/emojis/emojis.json';
import { parseMarkdown } from '@/components/message/markdown/parser';
import { NORMAL_MESSAGE_TYPES, MessageType, getSystemMessageText } from '../constants/message-types';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';
import DiscordUserPopoverContent from '@/discord/components/popovers/DiscordUserPopoverContent';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import { useModalStore } from '@/store/modal.store';
import DiscordMessageContextMenu from './context-menus/DiscordMessageContextMenu';
import DiscordUserContextMenu from './context-menus/DiscordUserContextMenu';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import DiscordClanTag from './DiscordClanTag';
import { ArrowBendUpLeft, Smiley, Plus, ArrowSquareOut, ArrowClockwise, Trash, WarningCircle, Eye } from '@phosphor-icons/react';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { generateNonce } from '../utils/snowflake';
import { useDiscordPreferencesStore } from '../store/discord-preferences.store';
import { DiscordBurstReaction, DiscordReaction, getReactionEmojiString } from './DiscordEmojiIcon';
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
  EmojiPickerSidebar,
} from '@/components/ui/emoji-picker';
import {
  Clock,
  PawPrint,
  Pizza,
  Trophy,
  Plane,
  Lightbulb,
  Shapes,
  Flag as FlagIcon,
} from 'lucide-react';

const DiscordAvatar = ({ author, className = 'size-10' }) => {
  const url = DiscordService.getUserAvatarUrl(author.id, author.avatar, 80);

  return (
    <img
      src={url}
      alt={author.username}
      className={cn('rounded-full object-cover select-none', className)}
      draggable="false"
      loading="lazy"
      decoding="async"
    />
  );
};

/** Resolve a member's top role color for a guild. */
function useNameColor(guildId, member) {
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  return useMemo(() => {
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
}

/**
 * Clickable username with member role color, underline on hover, and opens profile on click.
 * @param {object} props
 * @param {object} props.author - Discord user object
 * @param {object} [props.member] - Guild member object (for nick/roles)
 * @param {string} [props.guildId]
 * @param {string} [props.fallbackColor] - Color when no role color (default: 'white')
 * @param {string} [props.prefix] - Text before the name (e.g. '@')
 * @param {string} [props.className] - Additional classes
 */
const DiscordUserName = ({ author, member, guildId, fallbackColor = 'white', prefix = '', className = '' }) => {
  const nameColor = useNameColor(guildId, member);
  const displayName = member?.nick || author?.global_name || author?.username || 'Unknown';

  const openProfile = useCallback(() => {
    useModalStore.getState().push(DiscordUserProfileModal, { author, member, guildId });
  }, [author, member, guildId]);

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn('cursor-pointer font-medium hover:underline', className)}
      style={{ color: nameColor || fallbackColor }}
      onClick={openProfile}
      onKeyDown={(e) => e.key === 'Enter' && openProfile()}
    >
      {prefix}{displayName}
    </span>
  );
};

const DiscordMessageHeader = ({ message, guildId, onClickName }) => {
  const storeMember = useDiscordMembersStore((s) =>
    guildId ? s.members[guildId]?.[message.author.id] : undefined
  );

  const member = message.member || storeMember;

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
    <header className="relative mb-1 flex items-baseline gap-2 leading-none">
      <DiscordUserName author={message.author} member={member} guildId={guildId} />
      {message.author.bot && (
        <span className="inline-flex items-center gap-0.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium text-white">
          {(message.author.public_flags & 65536) !== 0 && (
            <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" />
            </svg>
          )}
          {message.author.id === '643945264868098049' ? 'OFFICIAL' : 'APP'}
        </span>
      )}
      {!message.author.bot && (
        <DiscordClanTag userId={message.author.id} size="sm" />
      )}
      <time className="cursor-default text-xs font-medium text-gray-500" dateTime={message.timestamp}>{formattedDateTime}</time>
    </header>
  );
};

const DiscordMessageContent = ({ content, guildId }) => {
  const ast = useMemo(() => parseMarkdown(content), [content]);
  if (!content) return null;
  return <DiscordMarkdownRenderer nodes={ast} guildId={guildId} />;
};

function fitDimensions(w, h, maxW, maxH) {
  if (!w || !h) return { width: maxW, height: maxH };
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

const DiscordAttachments = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {attachments.map((att) => {
        const isImage = att.content_type?.startsWith('image/');
        const isVideo = att.content_type?.startsWith('video/');

        if (isImage) {
          const { width, height } = fitDimensions(att.width, att.height, 400, 300);
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
                width={width}
                height={height}
              />
            </a>
          );
        }

        if (isVideo) {
          const { width, height } = fitDimensions(att.width, att.height, 400, 300);
          return (
            <video
              key={att.id}
              src={att.proxy_url || att.url}
              controls
              className="rounded-lg"
              width={width}
              height={height}
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

const IFRAME_PROVIDERS = ['YouTube', 'Twitch', 'Vimeo', 'Dailymotion', 'Spotify'];

const EmbedMarkdown = ({ content, guildId }) => {
  const ast = useMemo(() => parseMarkdown(content), [content]);
  if (!content) return null;
  return <DiscordMarkdownRenderer nodes={ast} guildId={guildId} />;
};

const DiscordEmbeds = ({ embeds, guildId }) => {
  if (!embeds || embeds.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {embeds.map((embed, i) => {
        const borderColor = embed.color
          ? `#${embed.color.toString(16).padStart(6, '0')}`
          : '#202225';

        const hasVideo = !!embed.video;
        const videoUrl = embed.video?.url || embed.video?.proxy_url;
        const isIframeProvider = hasVideo && embed.provider && IFRAME_PROVIDERS.includes(embed.provider.name);

        return (
          <div
            key={i}
            className="max-w-[520px] overflow-hidden rounded border border-[#313137] bg-[#242429] border-l-4"
            style={{ borderLeftColor: borderColor }}
          >
            <div className="p-3">
              {embed.provider && (
                <div className="mb-1 text-xs text-gray-400">{embed.provider.name}</div>
              )}
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
                      <EmbedMarkdown content={embed.title} guildId={guildId} />
                    </a>
                  ) : (
                    <span className="font-semibold text-white">
                      <EmbedMarkdown content={embed.title} guildId={guildId} />
                    </span>
                  )}
                </div>
              )}
              {embed.description && (
                <div className="text-sm text-gray-300">
                  <EmbedMarkdown content={embed.description} guildId={guildId} />
                </div>
              )}
              {embed.fields?.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {embed.fields.map((field, fi) => (
                    <div key={fi} className={field.inline ? 'col-span-1' : 'col-span-3'}>
                      <div className="text-xs font-semibold text-white">
                        <EmbedMarkdown content={field.name} guildId={guildId} />
                      </div>
                      <div className="text-sm text-gray-300">
                        <EmbedMarkdown content={field.value} guildId={guildId} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isIframeProvider && videoUrl && (() => {
                const { width, height } = fitDimensions(
                  embed.video.width || 400,
                  embed.video.height || 225,
                  400,
                  400
                );
                return (
                  <iframe
                    src={videoUrl}
                    width={width}
                    height={height}
                    className="mt-2 rounded"
                    allowFullScreen
                  />
                );
              })()}
              {embed.image && !isIframeProvider && (() => {
                const { width, height } = fitDimensions(embed.image.width, embed.image.height, 400, 400);
                return (
                  <img
                    src={embed.image.proxy_url || embed.image.url}
                    alt=""
                    className="mt-2 rounded"
                    width={width}
                    height={height}
                  />
                );
              })()}
              {embed.thumbnail && !embed.image && !isIframeProvider && (() => {
                const { width, height } = fitDimensions(embed.thumbnail.width, embed.thumbnail.height, 400, 400);
                return (
                  <img
                    src={embed.thumbnail.proxy_url || embed.thumbnail.url}
                    alt=""
                    className="mt-2 rounded"
                    width={width}
                    height={height}
                  />
                );
              })()}
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

const BUTTON_STYLE_CLASSES = {
  1: 'bg-[#5865f2] hover:bg-[#4752c4] text-white',        // Primary
  2: 'bg-discord-secondary hover:bg-[#6d6f78] text-white',        // Secondary
  3: 'bg-[#248046] hover:bg-[#1a6334] text-white',        // Success
  4: 'bg-[#da373c] hover:bg-[#a12d31] text-white',        // Danger
  5: 'bg-discord-secondary hover:bg-[#6d6f78] text-white',        // Link
};

const DiscordComponentEmoji = ({ emoji }) => {
  if (!emoji) return null;
  if (emoji.id) {
    return (
      <img
        src={`${DISCORD_EMOJI_CDN}/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=48`}
        alt={emoji.name}
        className="size-[1.1em] object-contain"
        draggable="false"
      />
    );
  }
  return (
    <img
      src={getTwemojiUrl(emoji.name)}
      alt={emoji.name}
      className="size-[1.1em] object-contain"
      draggable="false"
    />
  );
};

const DiscordButton = ({ button, onInteract }) => {
  const [loading, setLoading] = useState(false);
  const isLink = button.style === 5;
  const isDisabled = button.disabled || loading;

  const handleClick = async () => {
    if (isDisabled) return;
    if (isLink) {
      if (button.url) window.open(button.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setLoading(true);
    try {
      await onInteract(button);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded px-4 text-sm font-medium transition-colors',
        BUTTON_STYLE_CLASSES[button.style] || BUTTON_STYLE_CLASSES[2],
        isDisabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <DiscordComponentEmoji emoji={button.emoji} />
      {button.label && <span>{button.label}</span>}
      {isLink && <ArrowSquareOut size={14} className="ml-0.5 opacity-70" />}
    </button>
  );
};

const DiscordMessageComponents = ({ components, channelId, messageId, guildId, applicationId }) => {
  if (!components || components.length === 0) return null;

  const handleInteract = useCallback(async (button) => {
    const sessionId = useDiscordStore.getState().sessionId;
    if (!sessionId || !applicationId) return;

    const nonce = generateNonce();
    await DiscordApiService.sendInteraction({
      type: 3,
      application_id: applicationId,
      channel_id: channelId,
      guild_id: guildId || undefined,
      data: {
        component_type: button.type,
        custom_id: button.custom_id,
      },
      message_flags: 0,
      message_id: messageId,
      nonce,
      session_id: sessionId,
    });
  }, [channelId, messageId, guildId, applicationId]);

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {components.map((row, ri) => {
        if (row.type !== 1 || !row.components) return null;
        return (
          <div key={ri} className="flex flex-wrap gap-1">
            {row.components.map((comp, ci) => {
              if (comp.type === 2) {
                return <DiscordButton key={comp.id || ci} button={comp} onInteract={handleInteract} />;
              }
              return null;
            })}
          </div>
        );
      })}
    </div>
  );
};

const DiscordReplyBar = ({ referencedMessage, guildId }) => {
  if (!referencedMessage) return null;

  const storeMember = useDiscordMembersStore((s) =>
    guildId && referencedMessage.author?.id ? s.members[guildId]?.[referencedMessage.author.id] : undefined
  );
  const member = referencedMessage.member || storeMember;

  const scrollToMessage = () => {
    const el = document.querySelector(`[data-message-id="${referencedMessage.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
      setTimeout(() => { el.style.backgroundColor = ''; }, 1500);
    }
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
              onOpenProfile={() => useModalStore.getState().push(DiscordUserProfileModal, { author: referencedMessage.author, member, guildId })}
            />
          </PopoverContent>
        </Popover>
      )}
      <DiscordUserName
        author={referencedMessage.author}
        member={member}
        guildId={guildId}
        fallbackColor="#d1d5db"
        prefix="@"
        className="shrink-0"
      />
      <button
        type="button"
        onClick={scrollToMessage}
        className="cursor-pointer truncate text-gray-300 hover:text-gray-300"
      >
        {referencedMessage.content?.slice(0, 100) || 'Click to see attachment'}
      </button>
    </div>
  );
};

const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

const SIDEBAR_CATEGORIES = [
  { id: 'recent', icon: <Clock className="size-full" />, label: 'Recently Used' },
  { id: 'people', icon: <Smiley size={20} />, label: 'People' },
  { id: 'nature', icon: <PawPrint className="size-full" />, label: 'Nature' },
  { id: 'food', icon: <Pizza className="size-full" />, label: 'Food' },
  { id: 'activities', icon: <Trophy className="size-full" />, label: 'Activities' },
  { id: 'travel', icon: <Plane className="size-full" />, label: 'Travel' },
  { id: 'objects', icon: <Lightbulb className="size-full" />, label: 'Objects' },
  { id: 'symbols', icon: <Shapes className="size-full" />, label: 'Symbols' },
  { id: 'flags', icon: <FlagIcon className="size-full" />, label: 'Flags' },
];

const ReactionEmojiPicker = ({ channelId, messageId, guildId, open, onOpenChange }) => {
  const [emojiSearch, setEmojiSearch] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const { recentEmojis, addRecentEmoji } = useEmojisStore();

  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const guildEmojis = useMemo(() => guild?.emojis || [], [guild]);

  const guildEmojiGroups = useMemo(() => {
    if (!guildEmojis.length || !guild) return [];
    return [{
      id: `guild-${guild.id}`,
      name: guild.properties?.name || guild.name,
      icon: guild.properties?.icon || guild.icon
        ? DiscordService.getGuildIconUrl(guild.id, guild.properties?.icon || guild.icon, 32)
        : undefined,
      emojis: guildEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        url: `${DISCORD_EMOJI_CDN}/${e.id}.${e.animated ? 'gif' : 'webp'}?size=48`,
      })),
    }];
  }, [guild, guildEmojis]);

  const [activeCategory, setActiveCategory] = useState(
    recentEmojis.length > 0 ? 'recent' : guildEmojiGroups.length > 0 ? `guild-${guildId}` : 'people'
  );

  const categories = useMemo(() => {
    const cats = [];
    if (recentEmojis.length > 0) cats.push(SIDEBAR_CATEGORIES[0]);
    guildEmojiGroups.forEach((g) => {
      cats.push({
        id: `guild-${g.id}`,
        icon: g.icon ? <img src={g.icon} className="size-full rounded-full" /> : <Shapes className="size-full" />,
        label: g.name,
      });
    });
    cats.push(...SIDEBAR_CATEGORIES.slice(1));
    return cats;
  }, [recentEmojis.length, guildEmojiGroups]);

  const handleEmojiSelect = useCallback(({ id, label, emoji, url }) => {
    addRecentEmoji({ id, label, surrogates: emoji, url, isCustom: !!url });

    const emojiString = id ? `${label}:${id}` : emoji;
    DiscordApiService.addReaction(channelId, messageId, emojiString);
    onOpenChange(false);
    setEmojiSearch('');
  }, [channelId, messageId, addRecentEmoji, onOpenChange]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverPrimitive.Anchor className="absolute" />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className="z-[1000] flex h-[430px] w-[452px] border-none bg-transparent p-0 shadow-none data-[state=closed]:pointer-events-none data-[state=closed]:invisible"
        >
          <EmojiPicker className="flex size-full flex-row">
            <EmojiPickerSidebar
              activeCategory={activeCategory}
              onCategorySelect={(id) => {
                setActiveCategory(id);
                const viewport = document.querySelector('[data-slot="emoji-picker-viewport"]');
                if (viewport?.__scrollToCategory) {
                  viewport.__scrollToCategory(id);
                }
              }}
              categories={categories}
            />
            <div className="flex min-w-0 flex-1 flex-col bg-[#2b2d31]">
              <EmojiPickerSearch
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
              />
              <EmojiPickerContent
                searchValue={emojiSearch}
                standardEmojis={emojisData}
                recentEmojis={recentEmojis}
                onCategoryVisible={setActiveCategory}
                guildEmojis={guildEmojiGroups}
                onHoverEmojiChange={setHoveredEmoji}
                onEmojiSelect={handleEmojiSelect}
              />
              <EmojiPickerFooter hoveredEmoji={hoveredEmoji} />
            </div>
          </EmojiPicker>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

const DiscordReactions = ({ reactions, channelId, messageId, guildId }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleReaction = useCallback((emoji, currentlyMe) => {
    const emojiString = getReactionEmojiString(emoji);
    if (currentlyMe) {
      DiscordApiService.removeReaction(channelId, messageId, emojiString);
    } else {
      DiscordApiService.addReaction(channelId, messageId, emojiString);
    }
  }, [channelId, messageId]);

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
            {hasBurst && <DiscordBurstReaction emoji={emoji} count={burstCount} />}
            {hasNormal && (
              <DiscordReaction
                emoji={emoji}
                count={normalCount}
                active={reaction.me}
                onClick={() => toggleReaction(emoji, reaction.me)}
              />
            )}
          </div>
        );
      })}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-8 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-[#232428] px-2 hover:border-[#4e505c]"
        >
          <Plus size={16} className="text-[#b5bac1]" />
        </button>
        <ReactionEmojiPicker
          channelId={channelId}
          messageId={messageId}
          guildId={guildId}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
        />
      </div>
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
  const nameColor = useNameColor(guildId, member);

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
    <article className="group relative flex items-center gap-4 px-4 py-1 hover:bg-gray-800/40">
      <div className="flex w-10 shrink-0 items-center justify-center">
        <SystemMessageIcon type={message.type} />
      </div>
      <p className="flex min-w-0 flex-1 items-baseline gap-2 text-sm text-gray-400">
        <span>
          {parts.map((p, i) => {
            if (p.type === 'author') {
              return (
                <span
                  key={i}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer font-semibold hover:underline"
                  style={{ color: nameColor || '#e5e7eb' }}
                  onClick={() => useModalStore.getState().push(DiscordUserProfileModal, { author: message.author, member, guildId })}
                  onKeyDown={(e) => e.key === 'Enter' && useModalStore.getState().push(DiscordUserProfileModal, { author: message.author, member, guildId })}
                >
                  {p.text}
                </span>
              );
            }
            if (p.type === 'bold') {
              return <strong key={i} className="font-semibold text-gray-200">{p.text}</strong>;
            }
            return <span key={i}>{p.text}</span>;
          })}
        </span>
        <time className="shrink-0 text-xs text-gray-500" dateTime={message.timestamp}>{formattedTime}</time>
      </p>
    </article>
  );
});

DiscordSystemMessage.displayName = 'DiscordSystemMessage';

const InteractionBar = ({ interaction, message, guildId }) => {
  const user = interaction.user || message.author;
  const member = useDiscordMembersStore((s) =>
    guildId && user?.id ? s.members[guildId]?.[user.id] : undefined
  );

  return (
    <div className="mb-1 flex items-center gap-1.5 px-4 pl-[72px] text-sm">
      <DiscordAvatar author={user} className="size-4" />
      <DiscordUserName author={user} member={member} guildId={guildId} />
      <span className="text-gray-400">used</span>
      <span className="font-medium text-[#00aafc]">/{interaction.name || 'command'}</span>
    </div>
  );
};

/** Context menu for failed pending messages */
const DiscordFailedMessageContextMenu = ({ onRetry, onDelete }) => (
  <ContextMenuContent className="w-52">
    <ContextMenuItem className="justify-between" onSelect={onRetry}>
      Retry
      <ArrowClockwise className="ml-auto size-[18px]" />
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      onSelect={onDelete}
      className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
    >
      Delete
      <Trash className="ml-auto size-[18px]" weight="fill" />
    </ContextMenuItem>
  </ContextMenuContent>
);

const DiscordNormalMessage = memo(({ message, prevMessage, currentUserId, channelId, guildId, hasManageMessages, hasKickMembers, hasBanMembers, hasManageNicknames, hasModerateMembers, pending }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const chatFontSize = useDiscordPreferencesStore((s) => s.chatFontSize);

  const isEphemeral = (message.flags & 64) !== 0;
  const interaction = message.interaction || message.interaction_metadata;
  const hasInteractionBar = !!(interaction && (interaction.name || interaction.user));
  const hasReply = !!message.referenced_message || !!message.message_reference;

  const shouldStack = useMemo(() => {
    if (hasInteractionBar) return false;
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
  const canManageNicknames = !!guildId && !isOwnMessage && hasManageNicknames;
  const canTimeout = !!guildId && !isOwnMessage && hasModerateMembers;

  const isMentioned = useMemo(() => {
    if (message.mention_everyone) return true;
    if (message.mentions?.some((m) => m.id === currentUserId)) return true;
    return false;
  }, [message.mention_everyone, message.mentions, currentUserId]);

  const openProfile = () => {
    setPopoverOpen(false);
    useModalStore.getState().push(DiscordUserProfileModal, { author: message.author, member: message.member, guildId });
  };

  const isFailed = pending && message.status === 'failed';
  const isSending = pending && !isFailed;

  const messageClasses = cn(
    'group relative block border-l-2 border-transparent py-1 transition-colors duration-200 hover:bg-gray-800/40',
    shouldStack ? '' : 'mt-3.5',
    isMentioned && 'border-yellow-500/70 bg-yellow-500/5 hover:bg-yellow-500/10',
    isSending && 'opacity-50 pointer-events-none',
    isFailed && 'border-red-500/70 bg-red-500/5 hover:bg-red-500/10',
    isEphemeral && !isFailed && 'border-[#5865f2]/40 bg-[#5865f2]/5 hover:bg-[#5865f2]/10',
  );

  const handleRetry = () => {
    DiscordService.retryMessage(channelId, message.nonce);
  };

  const handleDeleteFailed = () => {
    useDiscordChannelsStore.getState().removePendingByNonce(channelId, message.nonce);
  };

  return (
    <article
      className={messageClasses}
      onContextMenu={(e) => {
        if (isFailed) {
          useContextMenuStore.getState().open(DiscordFailedMessageContextMenu, { message, channelId, onRetry: handleRetry, onDelete: handleDeleteFailed }, e);
        } else if (!isSending) {
          useContextMenuStore.getState().open(DiscordMessageContextMenu, { message, canDelete, guildId }, e);
        }
      }}
    >
      {/* Hover action bar */}
      {isFailed && (
        <nav className="absolute -top-3.5 right-4 z-10 hidden items-center gap-0.5 rounded border border-red-500/30 bg-[#2b2d31] p-0.5 shadow-md group-hover:flex">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleRetry(); }}
            className="rounded p-1 text-red-400 transition-colors hover:bg-white/10 hover:text-red-300"
            title="Retry"
          >
            <ArrowClockwise size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDeleteFailed(); }}
            className="rounded p-1 text-red-400 transition-colors hover:bg-white/10 hover:text-red-300"
            title="Delete"
          >
            <Trash size={16} />
          </button>
        </nav>
      )}
      {!pending && (
        <nav className="absolute -top-3.5 right-4 z-10 hidden items-center gap-0.5 rounded border border-white/10 bg-[#2b2d31] p-0.5 shadow-md group-hover:flex">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReactionPickerOpen(true);
              }}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
              title="Add Reaction"
            >
              <Smiley size={16} />
            </button>
            <ReactionEmojiPicker
              channelId={channelId}
              messageId={message.id}
              guildId={guildId}
              open={reactionPickerOpen}
              onOpenChange={setReactionPickerOpen}
            />
          </div>
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
        </nav>
      )}

      {hasInteractionBar && (
        <InteractionBar interaction={interaction} message={message} guildId={guildId} />
      )}

      {!hasInteractionBar && hasReply && (
        <div className="mb-1 px-4">
          <DiscordReplyBar referencedMessage={message.referenced_message} guildId={guildId} />
        </div>
      )}

      <div className="flex items-start gap-4 px-4">
        {shouldStack ? (
          <div className="w-10" />
        ) : (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={false}>
            <PopoverTrigger asChild>
              <figure
                role="button"
                tabIndex={0}
                className="shrink-0 cursor-pointer"
                onContextMenu={(e) => {
                  e.stopPropagation();
                  useContextMenuStore.getState().open(DiscordUserContextMenu, {
                    author: message.author,
                    guildId,
                    canKick, canBan, canManageNicknames, canTimeout, isOwnMessage,
                    onViewProfile: openProfile,
                  }, e);
                }}
              >
                <DiscordAvatar author={message.author} className="size-10" />
              </figure>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-none bg-transparent p-0 shadow-none"
              align="start"
              alignOffset={0}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DiscordUserPopoverContent
                author={message.author}
                member={message.member}
                guildId={guildId}
                onOpenProfile={openProfile}
              />
            </PopoverContent>
          </Popover>
        )}

        <section className="flex flex-1 flex-col items-start justify-start overflow-hidden">
          {!shouldStack && (
            <div
              onContextMenu={(e) => {
                e.stopPropagation();
                useContextMenuStore.getState().open(DiscordUserContextMenu, {
                  author: message.author,
                  guildId,
                  canKick, canBan, canManageNicknames, canTimeout, isOwnMessage,
                  onViewProfile: openProfile,
                }, e);
              }}
            >
              <DiscordMessageHeader message={message} guildId={guildId} onClickName={openProfile} />
            </div>
          )}

          <div className={cn('select-text whitespace-pre-wrap [overflow-wrap:anywhere]', isFailed ? 'text-red-400' : 'text-gray-400')} style={{ fontSize: chatFontSize, lineHeight: `${Math.round(chatFontSize * 1.375)}px` }}>
            <DiscordMessageContent content={message.content} guildId={guildId} />
            {message.edited_timestamp && (
              <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
            )}
          </div>

          <DiscordAttachments attachments={message.attachments} />
          <DiscordEmbeds embeds={message.embeds} guildId={guildId} />
          <DiscordStickers stickerItems={message.sticker_items} />
          <DiscordMessageComponents
            components={message.components}
            channelId={channelId}
            messageId={message.id}
            guildId={guildId}
            applicationId={message.application_id || message.interaction_metadata?.id_of_integration_owner || message.author?.id}
          />
        </section>
      </div>
      {message.reactions?.length > 0 && (
        <footer className="pl-[72px]">
          <DiscordReactions reactions={message.reactions} channelId={channelId} messageId={message.id} guildId={guildId} />
        </footer>
      )}
      {isEphemeral && (
        <div className="flex items-center gap-1 pl-[72px] pt-1 text-xs text-gray-400">
          <Eye size={14} className="shrink-0" />
          <span>Only you can see this</span>
          <span className="text-gray-500">·</span>
          <button
            type="button"
            onClick={() => useDiscordChannelsStore.getState().removeMessage(channelId, message.id)}
            className="font-medium text-[#5865f2] hover:underline"
          >
            Dismiss message
          </button>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2 pl-[72px] pt-2">
          <WarningCircle size={14} className="shrink-0 text-red-400" />
          <span className="text-xs text-red-400">
            Message failed to send —{' '}
            <button type="button" onClick={handleRetry} className="font-medium underline hover:text-red-300">Retry</button>
            {' · '}
            <button type="button" onClick={handleDeleteFailed} className="font-medium underline hover:text-red-300">Delete</button>
          </span>
        </div>
      )}
    </article>
  );
});

DiscordNormalMessage.displayName = 'DiscordNormalMessage';

const DiscordMessage = memo(({ message, prevMessage, currentUserId, channelId, guildId, hasManageMessages, hasKickMembers, hasBanMembers, hasManageNicknames, hasModerateMembers, pending }) => {
  if (!NORMAL_MESSAGE_TYPES.has(message.type)) {
    return <DiscordSystemMessage message={message} prevMessage={prevMessage} guildId={guildId} />;
  }
  return (
    <DiscordNormalMessage
      message={message}
      prevMessage={prevMessage}
      currentUserId={currentUserId}
      channelId={channelId}
      guildId={guildId}
      hasManageMessages={hasManageMessages}
      hasKickMembers={hasKickMembers}
      hasBanMembers={hasBanMembers}
      hasManageNicknames={hasManageNicknames}
      hasModerateMembers={hasModerateMembers}
      pending={pending}
    />
  );
});

DiscordMessage.displayName = 'DiscordMessage';
export default DiscordMessage;
