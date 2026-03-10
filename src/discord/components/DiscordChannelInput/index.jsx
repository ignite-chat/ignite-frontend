import * as Popover from '@radix-ui/react-popover';
import { InputGroup } from '@/components/ui/input-group';
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
  EmojiPickerSidebar,
} from '@/components/ui/emoji-picker';
import { cn } from '@/lib/utils';
import { X, Smiley, Timer, Keyboard } from '@phosphor-icons/react';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DiscordService } from '../../services/discord.service';
import { emojiMap, registerEmoji, getTwemojiUrl } from '@/utils/emoji.utils';
import { useEmojisStore } from '@/ignite/store/emojis.store';
import emojisData from '@/assets/emojis/emojis.json';
import { useDiscordHasPermission } from '../../hooks/useDiscordPermission';
import { SEND_MESSAGES, MANAGE_MESSAGES, MANAGE_CHANNELS } from '../../constants/permissions';
import { useDiscordTypingStore } from '../../store/discord-typing.store';
import { useDiscordReplyStore } from '../../store/discord-reply.store';
import { useDiscordGuildsStore } from '../../store/discord-guilds.store';
import { useDiscordMembersStore } from '../../store/discord-members.store';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import TypingDots from '@/components/ui/typing-dots';

// Lexical imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { CLEAR_EDITOR_COMMAND, $getSelection, $isRangeSelection } from 'lexical';

// Reuse nodes from Ignite
import { MentionNode } from '@/ignite/components/channel/ChannelInput/nodes/MentionNode';
import { ChannelMentionNode } from '@/ignite/components/channel/ChannelInput/nodes/ChannelMentionNode';
import { channelInputTheme } from '@/ignite/components/channel/ChannelInput/theme';

// Discord plugins
import EditBridgePlugin from './plugins/EditBridgePlugin';
import DiscordMentionPlugin from './plugins/DiscordMentionPlugin';
import DiscordChannelMentionPlugin from './plugins/DiscordChannelMentionPlugin';
import DiscordEmojiSuggestionPlugin from './plugins/DiscordEmojiSuggestionPlugin';
import SendMessagePlugin from './plugins/SendMessagePlugin';
import PasteHandlerPlugin from './plugins/PasteHandlerPlugin';
import DiscordTypingIndicatorPlugin from './plugins/DiscordTypingIndicatorPlugin';
import FocusPlugin from './plugins/FocusPlugin';
import EditablePlugin from './plugins/EditablePlugin';

const MAX_MESSAGE_LENGTH = 2000;
const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

function formatSlowmodeDuration(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m} minute${m !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

const DiscordChannelInput = ({ channel, channelName, onMessageSent }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [silentTyping, setSilentTyping] = useState(() => localStorage.getItem('silentTyping') === 'true');
  const editorRef = useRef(null);
  const menuContainerRef = useRef(null);

  const channelId = channel?.id;
  const guildId = channel?.guild_id;
  const isDM = channel?.type === 1 || channel?.type === 3;

  // Permissions
  const canSend = useDiscordHasPermission(guildId, channel, SEND_MESSAGES);
  const canSendMessages = isDM || canSend;

  // Slowmode bypass: MANAGE_MESSAGES or MANAGE_CHANNELS skip slowmode
  const hasManageMessages = useDiscordHasPermission(guildId, channel, MANAGE_MESSAGES);
  const hasManageChannels = useDiscordHasPermission(guildId, channel, MANAGE_CHANNELS);
  const bypassSlowmode = isDM || hasManageMessages || hasManageChannels;

  // Slowmode
  const slowmodeSeconds = bypassSlowmode ? 0 : (channel?.rate_limit_per_user || 0);
  const [cooldownEnd, setCooldownEnd] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    setCooldownEnd(null);
    setCooldownRemaining(0);
  }, [channelId]);

  useEffect(() => {
    if (!cooldownEnd) {
      setCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((cooldownEnd - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownEnd(null);
        setCooldownRemaining(0);
      } else {
        setCooldownRemaining(left);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const isOnCooldown = cooldownRemaining > 0;

  // Typing indicator
  const typingUsers = useDiscordTypingStore((s) => (channelId ? s.typing[channelId] || [] : []));
  const clearExpired = useDiscordTypingStore((s) => s.clearExpired);

  useEffect(() => {
    const interval = setInterval(clearExpired, 500);
    return () => clearInterval(interval);
  }, [clearExpired]);

  // Reply state
  const replyingMessageId = useDiscordReplyStore((s) => s.replyingMessageId);
  const replyingMessage = useDiscordReplyStore((s) => s.replyingMessage);
  const clearReply = useDiscordReplyStore((s) => s.clearReply);

  // Guild data for mentions
  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const guildRoles = useMemo(() => guild?.roles || guild?.properties?.roles || [], [guild]);

  // Members for @mention plugin (convert object map to array)
  const membersMap = useDiscordMembersStore((s) => (guildId ? s.members[guildId] || {} : {}));
  const members = useMemo(() => Object.values(membersMap), [membersMap]);

  // Channels for #mention plugin
  const allChannels = useDiscordChannelsStore((s) => s.channels);
  const guildChannels = useMemo(
    () => allChannels.filter((c) => c.guild_id === guildId),
    [allChannels, guildId]
  );

  // Guild emojis for emoji suggestion plugin + picker
  const guildEmojis = useMemo(() => guild?.emojis || [], [guild]);

  const guildEmojiGroups = useMemo(() => {
    if (!guildEmojis.length || !guild) return [];
    return [
      {
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
      },
    ];
  }, [guild, guildEmojis]);

  // Resolve user info for paste handler
  const resolveUser = useCallback(
    (userId) => {
      const member = membersMap[userId];
      if (!member) return { label: `@unknown`, color: 'inherit' };
      const user = member.user || {};
      const displayName = member.nick || user.global_name || user.username || 'unknown';

      const topColorRole = guildRoles
        .filter((r) => member.roles?.includes(r.id) && r.id !== guildId)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .find((r) => r.color && r.color !== 0);

      const color = topColorRole
        ? `#${topColorRole.color.toString(16).padStart(6, '0')}`
        : 'inherit';

      return { label: `@${displayName}`, color };
    },
    [membersMap, guildRoles, guildId]
  );

  /* ---------------- emojis ---------------- */
  const { recentEmojis, addRecentEmoji } = useEmojisStore();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    recentEmojis.length > 0 ? 'recent' : guildEmojis.length > 0 ? `guild-${guildId}` : 'people'
  );
  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const [emojiSearch, setEmojiSearch] = useState('');

  /* ---------------- send message ---------------- */

  const sendMessage = useCallback(() => {
    if (!canSendMessages || isOnCooldown) return;
    if (!channelId || !inputMessage.trim()) return;
    if (inputMessage.length > MAX_MESSAGE_LENGTH) return;

    DiscordService.sendMessage(channelId, inputMessage, replyingMessageId);
    setInputMessage('');
    clearReply();
    onMessageSent?.();

    if (slowmodeSeconds > 0) {
      setCooldownEnd(Date.now() + slowmodeSeconds * 1000);
    }

    if (editorRef.current) {
      editorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    }
  }, [canSendMessages, isOnCooldown, channelId, inputMessage, replyingMessageId, clearReply, onMessageSent, slowmodeSeconds]);

  const handleEmojiSelect = useCallback(({ id, label, emoji, url }) => {
    addRecentEmoji({
      id,
      label,
      surrogates: emoji,
      url,
      isCustom: !!url,
    });

    if (emoji) registerEmoji(label, emoji);

    let shortcode;
    if (id) {
      // Custom Discord emoji - use Discord format
      const animated = url?.includes('.gif') ? 'a' : '';
      shortcode = `<${animated}:${label}:${id}>`;
    } else {
      shortcode = `:${label}:`;
    }

    if (editorRef.current) {
      editorRef.current.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(shortcode);
        }
      });
      editorRef.current.focus();
    }
  }, [addRecentEmoji]);

  /* ---------------- Lexical config ---------------- */

  const initialConfig = useMemo(() => ({
    namespace: 'DiscordChannelInput',
    theme: channelInputTheme,
    nodes: [MentionNode, ChannelMentionNode],
    onError: (error) => console.error('Lexical error:', error),
  }), []);

  const placeholder = canSendMessages
    ? `Message ${channelName || 'channel'}`
    : 'You do not have permission to send messages in this channel';

  /* ---------------- render ---------------- */

  if (!isDM && !canSend) {
    return (
      <div className="p-2">
        <div className="flex min-h-[56px] items-center rounded-md border border-white/5 bg-[#222327] px-3 py-4">
          <span className="text-sm text-gray-500">You do not have permission to send messages in this channel</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#1a1a1e] p-2">
      {slowmodeSeconds > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute bottom-[calc(100%-8px)] right-0 z-10 flex items-center gap-1.5 px-5 pb-0.5 pt-4 text-xs text-gray-400">
              <Timer size={14} weight={'fill'} className={isOnCooldown ? 'text-[#f0b132]' : ''} />
              <span className={isOnCooldown ? 'text-[#f0b132]' : ''}>
                {isOnCooldown ? `Slowmode ${cooldownRemaining}s` : 'Slowmode is enabled'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="w-56 text-sm">
            <p>Slowmode is enabled.</p>
            <p>Members can send one message every {formatSlowmodeDuration(slowmodeSeconds)}.</p>
          </TooltipContent>
        </Tooltip>
      )}
      {typingUsers.length > 0 && (
        <div className={cn(
          'absolute bottom-[calc(100%-8px)] left-0 flex items-center gap-1 bg-gradient-to-t from-[#1a1a1e] to-transparent px-5 pb-0.5 pt-4 text-xs text-gray-400',
          slowmodeSeconds > 0 ? 'right-40' : 'right-0'
        )}>
          <TypingDots />
          <span>
            {typingUsers.length === 1 && (
              <><strong className="font-bold text-gray-200">{typingUsers[0].username}</strong> is typing...</>
            )}
            {typingUsers.length === 2 && (
              <><strong className="font-bold text-gray-200">{typingUsers[0].username}</strong> and <strong className="font-bold text-gray-200">{typingUsers[1].username}</strong> are typing...</>
            )}
            {typingUsers.length > 2 && (
              <><strong className="font-bold text-gray-200">{typingUsers[0].username}</strong>, <strong className="font-bold text-gray-200">{typingUsers[1].username}</strong>, and others are typing...</>
            )}
          </span>
        </div>
      )}

      {/* Reply bar */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          replyingMessage ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          {replyingMessage && (
            <div className="flex items-center justify-between rounded-t-md bg-[#2b2d31] px-4 py-2 text-[12px] text-[#dbdee1]">
              <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
                <span className="shrink-0 text-[#b5bac1]">Replying to</span>
                <span className="shrink-0 cursor-pointer font-bold hover:underline">
                  {replyingMessage.author?.global_name || replyingMessage.author?.username || 'Unknown'}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={clearReply}
                  className="rounded-full bg-black/20 p-0.5 text-[#b5bac1] transition-all hover:bg-black/40 hover:text-[#dbdee1]"
                >
                  <X weight="bold" size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={menuContainerRef} className="relative">
        <InputGroup
          className={cn(
            'relative flex h-auto items-center border border-white/5 bg-[#222327] transition-all duration-200',
            replyingMessage ? 'rounded-t-none border-t-0' : 'rounded-t-md'
          )}
        >
          <LexicalComposer initialConfig={initialConfig} key={channelId}>
            <div className="relative flex-1">
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable
                    className={`max-h-[50vh] min-h-[54px] w-full overflow-y-auto px-3 py-4 text-sm outline-none [&_.channel-input-paragraph]:m-0 ${
                      !canSendMessages || isOnCooldown ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                }
                placeholder={
                  <div className="pointer-events-none absolute left-0 top-0 px-3 py-4 text-sm font-normal text-gray-500">
                    {placeholder}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ClearEditorPlugin />
              <EditorRefPlugin editorRef={editorRef} />

              <EditablePlugin editable={canSendMessages && !isOnCooldown} />
              <EditBridgePlugin setInputMessage={setInputMessage} />
              {guildId && (
                <DiscordMentionPlugin
                  members={members}
                  guildRoles={guildRoles}
                  guildId={guildId}
                  menuContainer={menuContainerRef}
                />
              )}
              {guildId && (
                <DiscordChannelMentionPlugin
                  channels={guildChannels}
                  menuContainer={menuContainerRef}
                />
              )}
              <DiscordEmojiSuggestionPlugin
                guildEmojis={guildEmojis}
                menuContainer={menuContainerRef}
              />
              <SendMessagePlugin onSend={sendMessage} />
              <PasteHandlerPlugin
                members={members}
                resolveUser={resolveUser}
                channels={guildChannels}
              />
              <DiscordTypingIndicatorPlugin channelId={channelId} silentTyping={silentTyping} />
              <FocusPlugin channelId={channelId} replyingMessageId={replyingMessageId} />
            </div>
          </LexicalComposer>

          <div className="mr-2 mt-2.5 flex items-center gap-0.5 self-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSilentTyping((prev) => {
                      const next = !prev;
                      localStorage.setItem('silentTyping', String(next));
                      return next;
                    });
                  }}
                  className={cn(
                    'size-8 p-0',
                    '[&_svg]:size-5',
                    silentTyping
                      ? 'text-[#dbdee1]'
                      : 'text-[#949ba4] hover:text-[#dbdee1]'
                  )}
                >
                  <div className="relative">
                    <Keyboard className="size-5" weight="fill" />
                    {silentTyping && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-[22px] w-[2px] rotate-45 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {silentTyping ? 'Silent typing enabled' : 'Silent typing disabled'}
              </TooltipContent>
            </Tooltip>
            <Popover.Root open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen} modal={false}>
              <Popover.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 p-0 text-[#949ba4] hover:text-[#dbdee1] [&_svg]:size-5"
                >
                  <Smiley weight="fill" />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  forceMount
                  side="top"
                  align="end"
                  sideOffset={8}
                  collisionPadding={16}
                  className="z-[1000] flex h-[430px] w-[452px] border-none bg-transparent p-0 shadow-none data-[state=closed]:pointer-events-none data-[state=closed]:invisible"
                >
                  <EmojiPicker className="flex size-full flex-row">
                    <EmojiPickerSidebar
                      activeCategory={activeCategory}
                      onCategorySelect={(id) => {
                        setActiveCategory(id);
                        const viewport = document.querySelector('[data-slot="emoji-picker-viewport"]');
                        if (!viewport) return;

                        if (id === 'recent') {
                          viewport.scrollTo({ top: 0, behavior: 'smooth' });
                          return;
                        }

                        const el = document.getElementById(`category-${id}`);
                        if (el) {
                          viewport.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                        }
                      }}
                      categories={[
                        { id: 'recent', label: 'Recent', icon: <Clock className="size-[20px]" /> },
                        ...guildEmojiGroups.map((g) => ({
                          id: g.id,
                          label: g.name,
                          icon: g.icon ? (
                            <img src={g.icon} className="size-5 rounded-full" />
                          ) : (
                            <Smiley className="size-[20px]" weight="fill" />
                          ),
                        })),
                        { id: 'people', label: 'People', icon: <Smiley className="size-[20px]" weight="fill" /> },
                        { id: 'nature', label: 'Nature', icon: <PawPrint className="size-[20px]" /> },
                        { id: 'food', label: 'Food', icon: <Pizza className="size-[20px]" /> },
                        { id: 'activity', label: 'Activities', icon: <Trophy className="size-[20px]" /> },
                        { id: 'travel', label: 'Travel', icon: <Plane className="size-[20px]" /> },
                        { id: 'objects', label: 'Objects', icon: <Lightbulb className="size-[20px]" /> },
                        { id: 'symbols', label: 'Symbols', icon: <Shapes className="size-[20px]" /> },
                        { id: 'flags', label: 'Flags', icon: <FlagIcon className="size-[20px]" /> },
                      ]}
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
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </InputGroup>
      </div>
    </div>
  );
};

export default DiscordChannelInput;
