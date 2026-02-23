import * as Popover from '@radix-ui/react-popover';
import { InputGroup } from '../../ui/input-group';
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
  EmojiPickerSidebar,
} from '../../ui/emoji-picker';
import { useChannelInputContext, useChannelContext } from '../../../contexts/ChannelContext.jsx';
import Avatar from '../../Avatar.jsx';
import { cn } from '@/lib/utils';
import { useChannelsStore } from '../../../store/channels.store';
import { X, Hash, Megaphone, SpeakerHigh, Keyboard } from '@phosphor-icons/react';
import { useGuildsStore } from '../../../store/guilds.store';
import { useGuildContext } from '../../../contexts/GuildContext';
import { ChannelType } from '../../../constants/ChannelType';
import { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '../../ui/button';
import {
  Smile,
  Clock,
  PawPrint,
  Pizza,
  Trophy,
  Plane,
  Lightbulb,
  Shapes,
  Flag as FlagIcon,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import { ChannelsService } from '../../../services/channels.service';
import { toast } from 'sonner';
import { emojiMap, registerEmoji, getTwemojiUrl } from '../../../utils/emoji.utils';
import { useEmojisStore } from '../../../store/emojis.store';
import emojisData from '../../../assets/emojis/emojis.json';
import { useTypingText } from '@/hooks/useTypingText';
import { useUsersStore } from '@/store/users.store';
import StickerPicker from '../StickerPicker';
import { Sticker } from 'lucide-react';
import { Permissions } from '@/constants/Permissions';
import { useHasPermission } from '@/hooks/useHasPermission';

// Lexical imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { CLEAR_EDITOR_COMMAND, $getSelection, $isRangeSelection } from 'lexical';

// Custom nodes
import { MentionNode } from './nodes/MentionNode';
import { ChannelMentionNode } from './nodes/ChannelMentionNode';
import { channelInputTheme } from './theme';

// Plugins
import EditBridgePlugin from './plugins/EditBridgePlugin';
import MentionPlugin from './plugins/MentionPlugin';
import ChannelMentionPlugin from './plugins/ChannelMentionPlugin';
import EmojiSuggestionPlugin from './plugins/EmojiSuggestionPlugin';
import SendMessagePlugin from './plugins/SendMessagePlugin';
import PasteHandlerPlugin from './plugins/PasteHandlerPlugin';
import TypingIndicatorPlugin from './plugins/TypingIndicatorPlugin';
import FocusPlugin from './plugins/FocusPlugin';
import EditablePlugin from './plugins/EditablePlugin';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ChannelInput = ({ channel }) => {
  const { inputMessage, setInputMessage } = useChannelInputContext();
  const { replyingId, setReplyingId, setEditingId } = useChannelContext();
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuContainerRef = useRef(null);
  const dragCounterRef = useRef(0);

  const [stagedFiles, setStagedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();
  const { guildEmojis } = useEmojisStore();
  const customEmojis = guildEmojis[guildId] || [];

  const guildEmojiGroups = useMemo(() => {
    return guildsStore.guilds
      .filter((g) => (guildEmojis[g.id] || []).length > 0)
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon_file_id ? `${import.meta.env.VITE_CDN_BASE_URL}/icons/${g.icon_file_id}` : undefined,
        emojis: (guildEmojis[g.id] || []).map((e) => ({
          id: e.id,
          name: e.name,
          url: `${import.meta.env.VITE_CDN_BASE_URL}/emojis/${e.id}`,
        })),
      }));
  }, [guildsStore.guilds, guildEmojis]);

  const currentUser = useUsersStore().getCurrentUser();
  const members = useMemo(
    () => guildsStore.guildMembers[guildId] || [],
    [guildsStore.guildMembers, guildId]
  );
  const guild = useMemo(
    () => guildsStore.guilds.find((g) => g.id === guildId),
    [guildsStore.guilds, guildId]
  );
  const storeChannels = useChannelsStore((s) => s.channels);
  const channels = useMemo(
    () => storeChannels.filter((c) => String(c.guild_id) === String(guildId)),
    [storeChannels, guildId]
  );
  const channelMessages = useChannelsStore((s) => s.channelMessages);

  const { typingText } = useTypingText(channel?.channel_id);

  const replyingMessage = useMemo(() => {
    if (!replyingId || !channel?.channel_id) return null;
    return (channelMessages[channel.channel_id] || []).find((m) => m.id === replyingId);
  }, [replyingId, channel?.channel_id, channelMessages]);

  // Check if user can send messages in this channel (DM channels always allow sending)
  const hasSendPermission = useHasPermission(guildId, channel?.channel_id, Permissions.SEND_MESSAGES);
  const canSendMessages = !guildId || !channel?.channel_id || hasSendPermission;

  const resolveUser = useCallback(
    (id) => {
      const m = members.find((x) => x.user_id === id);
      if (!m) return { label: '@unknown-user', color: 'inherit' };

      const role = [...(m.roles || [])]
        .sort((a, b) => b.position - a.position)
        .find((r) => r.color && r.color !== 0);

      return {
        label: `@${m.user.username}`,
        color: role ? `#${role.color.toString(16).padStart(6, '0')}` : 'inherit',
      };
    },
    [members]
  );

  /* ---------------- file attachments ---------------- */

  const addFiles = useCallback((files) => {
    const incoming = Array.from(files).slice(0, 10 - stagedFiles.length);
    const valid = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 50 MB file size limit.`);
      } else {
        valid.push(file);
      }
    }
    if (valid.length > 0) {
      setStagedFiles((prev) => [...prev, ...valid]);
    }
  }, [stagedFiles.length]);

  const removeFile = useCallback((index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  /* ---------------- emojis ---------------- */
  const { recentEmojis, addRecentEmoji } = useEmojisStore();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    recentEmojis.length > 0 ? 'recent' : `guild-${guildId}`
  );

  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [shouldMention] = useState(true);
  const [silentTyping, setSilentTyping] = useState(() => localStorage.getItem('silentTyping') === 'true');

  /* ---------------- message actions ---------------- */

  const sendMessage = useCallback(() => {
    if (!canSendMessages) {
      toast.error('You do not have permission to send messages in this channel.');
      return;
    }
    if (!channel?.channel_id || (!inputMessage.trim() && stagedFiles.length === 0)) return;
    if (inputMessage.length > MAX_MESSAGE_LENGTH) return;

    ChannelsService.sendChannelMessage(
      channel.channel_id,
      inputMessage,
      replyingId || null,
      shouldMention,
      [],
      stagedFiles
    );
    setInputMessage('');
    setReplyingId(null);
    setStagedFiles([]);

    // Clear the Lexical editor
    if (editorRef.current) {
      editorRef.current.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    }
  }, [canSendMessages, channel?.channel_id, inputMessage, stagedFiles, replyingId, shouldMention, setInputMessage, setReplyingId]);

  const handleEditLast = useCallback(() => {
    const messages = channelMessages[channel?.channel_id] || [];
    const lastOwnMessage = [...messages].reverse().find((m) => m.author.id == currentUser?.id);
    if (lastOwnMessage) setEditingId(lastOwnMessage.id);
  }, [channelMessages, channel?.channel_id, currentUser?.id, setEditingId]);

  const sendSticker = useCallback((sticker) => {
    if (!canSendMessages) {
      toast.error('You do not have permission to send messages in this channel.');
      return;
    }
    if (!channel?.channel_id) return;

    ChannelsService.sendChannelMessage(
      channel.channel_id,
      '',
      replyingId || null,
      shouldMention,
      [sticker.id]
    );
    setReplyingId(null);
    setIsStickerPickerOpen(false);
  }, [canSendMessages, channel?.channel_id, replyingId, shouldMention, setReplyingId]);

  const handleEmojiSelect = useCallback(({ id, label, emoji, url }) => {
    addRecentEmoji({
      id,
      label,
      surrogates: emoji,
      url,
      isCustom: !!url,
    });

    if (emoji) registerEmoji(label, emoji);

    const isCurrentGuildEmoji = !!id && customEmojis.some((e) => e.id === id);
    const shortcode = id && !isCurrentGuildEmoji ? `<${id}:${label}>` : `:${label}:`;

    if (editorRef.current) {
      editorRef.current.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(shortcode);
        }
      });
      editorRef.current.focus();
    }
  }, [addRecentEmoji, customEmojis]);

  const otherRecipient =
    channel?.type === ChannelType.DM
      ? (channel.recipients || []).find((r) => r.id !== currentUser?.id)
      : {};

  /* ---------------- Lexical config ---------------- */

  const initialConfig = useMemo(() => ({
    namespace: 'ChannelInput',
    theme: channelInputTheme,
    nodes: [MentionNode, ChannelMentionNode],
    onError: (error) => console.error('Lexical error:', error),
  }), []);

  const placeholder = canSendMessages
    ? channel?.type === ChannelType.DM
      ? `Message @${otherRecipient?.name || 'Unknown'}`
      : `Message #${channel?.name || 'unknown'}`
    : 'You cannot send messages in this channel';

  /* ---------------- render ---------------- */

  return (
    <div
      className={cn('bg-[#1a1a1e] p-2', isDragging && 'ring-2 ring-inset ring-primary/50')}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
                  {replyingMessage.author.name || replyingMessage.author.username}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReplyingId(null)}
                  className="rounded-full bg-black/20 p-0.5 text-[#b5bac1] transition-all hover:bg-black/40 hover:text-[#dbdee1]"
                >
                  <X weight="bold" size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {stagedFiles.length > 0 && (
        <div className={cn(
          'flex gap-2 overflow-x-auto bg-[#2b2d31] px-4 py-3 border-b border-white/5',
          replyingMessage ? '' : 'rounded-t-md'
        )}>
          {stagedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="group/attachment relative flex h-[52px] shrink-0 items-center gap-2 rounded-md bg-[#1e1f22] px-3 pr-8"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="size-8 rounded object-cover"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded bg-[#5865f2]/20">
                  <FileText className="size-4 text-[#5865f2]" />
                </div>
              )}
              <div className="max-w-[120px]">
                <div className="truncate text-xs text-[#dbdee1]">{file.name}</div>
                <div className="text-[10px] text-[#949ba4]">
                  {file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -right-1 -top-1 rounded-full bg-[#1e1f22] p-0.5 text-[#b5bac1] opacity-0 transition-opacity group-hover/attachment:opacity-100 hover:text-[#dbdee1]"
              >
                <X weight="bold" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div ref={menuContainerRef} className="relative">
      <InputGroup
        className={cn(
          'relative flex h-auto items-center border border-white/5 bg-[#222327] transition-all duration-200',
          (replyingMessage || stagedFiles.length > 0) ? 'rounded-t-none border-t-0' : 'rounded-t-md'
        )}
      >
        <div className="ml-2 mt-2 flex items-center self-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="size-8 text-[#b5bac1] hover:text-[#dbdee1]"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusCircle className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach files</TooltipContent>
          </Tooltip>
        </div>

        <LexicalComposer initialConfig={initialConfig} key={channel?.channel_id}>
          <div className="relative flex-1">
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  className={`max-h-[50vh] min-h-[44px] w-full overflow-y-auto p-3 text-sm outline-none [&_.channel-input-paragraph]:m-0 ${
                    !canSendMessages ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
              }
              placeholder={
                <div className="pointer-events-none absolute left-0 top-0 p-3 text-sm text-gray-400">
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ClearEditorPlugin />
            <EditorRefPlugin editorRef={editorRef} />

            <EditablePlugin editable={canSendMessages} />
            <EditBridgePlugin setInputMessage={setInputMessage} />
            <MentionPlugin members={members} resolveUser={resolveUser} menuContainer={menuContainerRef} />
            <ChannelMentionPlugin channels={channels} menuContainer={menuContainerRef} />
            <EmojiSuggestionPlugin guildEmojis={guildEmojis} guildId={guildId} menuContainer={menuContainerRef} />
            <SendMessagePlugin onSend={sendMessage} onEditLast={handleEditLast} />
            <PasteHandlerPlugin addFiles={addFiles} members={members} resolveUser={resolveUser} channels={channels} />
            <TypingIndicatorPlugin channelId={channel?.channel_id} silentTyping={silentTyping} />
            <FocusPlugin channelId={channel?.channel_id} replyingId={replyingId} />
          </div>
        </LexicalComposer>

        <div className="mr-2 mt-2 flex items-center gap-0.5 self-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => {
                  setSilentTyping((prev) => {
                    const next = !prev;
                    localStorage.setItem('silentTyping', String(next));
                    return next;
                  });
                }}
                className={cn(
                  'size-8',
                  silentTyping
                    ? 'text-[#dbdee1]'
                    : 'text-[#b5bac1] hover:text-[#dbdee1]'
                )}
              >
                <div className="relative">
                  <Keyboard className="size-5" />
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
          <Popover.Root open={isStickerPickerOpen} onOpenChange={setIsStickerPickerOpen} modal={false}>
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                className="size-8 text-[#b5bac1] hover:text-[#dbdee1]"
              >
                <Sticker className="size-5" />
              </Button>
            </Popover.Trigger>
            <Popover.Content
              side="top"
              align="end"
              sideOffset={8}
              collisionPadding={16}
              className="z-[1000] border-none bg-transparent p-0 shadow-none"
            >
              <StickerPicker onStickerSelect={sendSticker} />
            </Popover.Content>
          </Popover.Root>
          <Popover.Root open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen} modal={false}>
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                className="size-8 text-[#b5bac1] hover:text-[#dbdee1]"
              >
                <Smile className="size-5" />
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
                        id: `guild-${g.id}`,
                        label: g.name,
                        icon: g.icon ? (
                          <img src={g.icon} className="size-5 rounded-full" />
                        ) : (
                          <Hash className="size-[20px]" />
                        ),
                      })),
                      { id: 'people', label: 'People', icon: <Smile className="size-[20px]" /> },
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
      {typingText && (
        <div className="flex items-center gap-1 px-3 pt-1 text-xs text-gray-400">
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce [animation-delay:0ms]">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
          <span>{typingText}</span>
        </div>
      )}
    </div>
  );
};

export default ChannelInput;
