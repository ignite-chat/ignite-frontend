import * as Popover from '@radix-ui/react-popover';
import { InputGroup } from '../ui/input-group';
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
  EmojiPickerSidebar,
} from '../ui/emoji-picker';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { useChannelInputContext, useChannelContext } from '../../contexts/ChannelContext.jsx';
import Avatar from '../Avatar.jsx';
import { cn } from '@/lib/utils';
import { useChannelsStore } from '../../store/channels.store';
import { X, Hash, Megaphone, SpeakerHigh, Keyboard } from '@phosphor-icons/react';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { ChannelType } from '../../constants/ChannelType';
import useStore from '../../hooks/useStore';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
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
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { ChannelsService } from '../../services/channels.service';
import { toast } from 'sonner';
import { emojiMap, registerEmoji, getTwemojiUrl } from '../../utils/emoji.utils';
import { useEmojisStore } from '../../store/emojis.store';
import emojisData from '../../assets/emojis/emojis.json';
import { useTypingStore } from '../../store/typing.store';
import { useUsersStore } from '@/store/users.store';
import StickerPicker from './StickerPicker';
import { Sticker } from 'lucide-react';

const MAX_MESSAGE_LENGTH = 2000;
const SUGGESTIONS_LIMIT = 10;

/* -------------------------------- utils -------------------------------- */

const serializeFromDom = (root) => {
  let out = '';

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue ?? '';
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.dataset?.mention === 'user') {
      out += `<@${node.dataset.id}>`;
      return;
    }

    if (node.dataset?.mention === 'channel') {
      out += `<#${node.dataset.id}>`;
      return;
    }

    if (node.tagName === 'BR') {
      out += '\n';
      return;
    }

    for (const c of node.childNodes) walk(c);
  };

  for (const c of root.childNodes) walk(c);
  return out;
};

const insertTextAtCaret = (text) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const getMentionQuery = (root) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);

  const text = pre.toString();
  const idx = text.lastIndexOf('@');

  if (idx === -1) return null;
  if (idx > 0 && ![' ', '\n'].includes(text[idx - 1])) return null;

  const query = text.slice(idx + 1);
  if (query.includes(' ') || query.includes('\n')) return null;

  return query;
};

const getChannelQuery = (root) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);

  const text = pre.toString();
  const idx = text.lastIndexOf('#');

  if (idx === -1) return null;
  if (idx > 0 && ![' ', '\n'].includes(text[idx - 1])) return null;

  const query = text.slice(idx + 1);
  if (query.includes(' ') || query.includes('\n')) return null;

  return query;
};

const getEmojiQuery = (root) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);

  const text = pre.toString();
  const idx = text.lastIndexOf(':');

  if (idx === -1) return null;
  if (idx > 0 && ![' ', '\n'].includes(text[idx - 1])) return null;

  const query = text.slice(idx + 1);
  if (query.includes(' ') || query.includes('\n')) return null;
  if (query.includes(':')) return null; // Closing colon found

  return query;
};

const replaceEmojiQueryWithEmoji = (query, emojiChar) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  // delete ":query"
  const del = range.cloneRange();
  del.setStart(range.startContainer, Math.max(0, range.startOffset - (query.length + 1)));
  del.deleteContents();

  // Insert emoji
  const node = document.createTextNode(emojiChar + ' ');
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const replaceAtQueryWithMention = (query, user, resolveUser) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  // delete "@query"
  const del = range.cloneRange();
  del.setStart(range.startContainer, Math.max(0, range.startOffset - (query.length + 1)));
  del.deleteContents();

  const mention = document.createElement('span');
  mention.contentEditable = 'false';
  mention.dataset.mention = 'user';
  mention.dataset.id = user.user_id;

  const resolved = resolveUser(user.user_id);
  mention.textContent = resolved.label;
  mention.className = 'inline-flex rounded px-1.5 py-0.5 mx-[1px] select-none';
  mention.style.background =
    resolved.color !== 'inherit' ? `${resolved.color}33` : 'rgba(88,101,242,0.18)';
  mention.style.color = resolved.color !== 'inherit' ? resolved.color : 'rgb(88,101,242)';

  range.insertNode(mention);
  mention.after(document.createTextNode(' '));

  range.setStartAfter(mention.nextSibling);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const replaceHashQueryWithChannel = (query, channel) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  // delete "#query"
  const del = range.cloneRange();
  del.setStart(range.startContainer, Math.max(0, range.startOffset - (query.length + 1)));
  del.deleteContents();

  const mention = document.createElement('span');
  mention.contentEditable = 'false';
  mention.dataset.mention = 'channel';
  mention.dataset.id = channel.channel_id || channel.id; // Support both structures

  mention.textContent = `#${channel.name}`;
  mention.className =
    'inline-flex items-center rounded bg-[#2b2d31] px-1.5 py-0.5 mx-[1px] text-[#949cf7] hover:bg-[#2b2d31]/70 cursor-pointer select-none';

  range.insertNode(mention);
  mention.after(document.createTextNode(' '));

  range.setStartAfter(mention.nextSibling);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const convertSerializedMentions = (root, members, resolveUser) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    const match = node.nodeValue.match(/<@(\d+)>/);
    if (!match) continue;

    const userId = match[1];
    const user = members.find((m) => m.user_id === userId) ?? { user_id: userId };

    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    range.deleteContents();

    replaceAtQueryWithMention('', user, resolveUser);
  }
};

/* ------------------------------- component ------------------------------- */

const ChannelInput = ({ channel }) => {
  const { inputMessage, setInputMessage } = useChannelInputContext();
  const { replyingId, setReplyingId, setEditingId } = useChannelContext();
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);

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
  const channels = useMemo(() => guild?.channels || [], [guild?.channels]);
  const channelMessages = useChannelsStore((s) => s.channelMessages);

  const typingUsers = useTypingStore((s) => s.typing[channel?.channel_id] || []);
  const clearExpired = useTypingStore((s) => s.clearExpired);

  useEffect(() => {
    const interval = setInterval(clearExpired, 1000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  // Auto-focus the editor when switching channels or replying
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [channel?.channel_id, replyingId]);

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map((t) => t.username);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]}, ${names[1]}, and others are typing...`;
  }, [typingUsers]);

  const replyingMessage = useMemo(() => {
    if (!replyingId || !channel?.channel_id) return null;
    return (channelMessages[channel.channel_id] || []).find((m) => m.id === replyingId);
  }, [replyingId, channel?.channel_id, channelMessages]);

  // Check if user can send messages in this channel
  // const canSendMessages = useMemo(() => {
  //   // DM channels (no guildId) always allow sending
  //   if (!guildId || !channel?.channel_id) return true;
  //   return PermissionsService.hasPermission(guildId, channel.channel_id, Permissions.SEND_MESSAGES);
  // }, [guildId, channel?.channel_id]);
  const canSendMessages = true;

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

  /* ---------------- mentions ---------------- */

  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter(
        (m) =>
          m.user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          m.user.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      .slice(0, SUGGESTIONS_LIMIT);
  }, [members, mentionQuery]);

  /* ---------------- channel mentions ---------------- */

  const [channelQuery, setChannelQuery] = useState(null);
  const [channelIndex, setChannelIndex] = useState(0);

  const filteredChannels = useMemo(() => {
    if (channelQuery === null) return [];

    // Filterable channels
    const available = channels.filter((c) => c.type !== 4);

    if (channelQuery === '') {
      // Random recommendations if query is empty
      // Using a simple shuffle copy
      return [...available].sort(() => 0.5 - Math.random()).slice(0, SUGGESTIONS_LIMIT);
    }

    return available
      .filter((c) => {
        return c.name.toLowerCase().includes(channelQuery.toLowerCase());
      })
      .sort((a, b) => {
        const q = channelQuery.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;

        if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
        if (bName.startsWith(q) && !aName.startsWith(q)) return 1;

        return 0;
      })
      .slice(0, SUGGESTIONS_LIMIT);
  }, [channels, channelQuery]);

  /* ---------------- emojis ---------------- */
  const { recentEmojis, addRecentEmoji } = useEmojisStore();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    recentEmojis.length > 0 ? 'recent' : `guild-${guildId}`
  );

  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const [emojiQuery, setEmojiQuery] = useState(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [shouldMention] = useState(true);
  const [silentTyping, setSilentTyping] = useState(() => localStorage.getItem('silentTyping') === 'true');

  const filteredEmojis = useMemo(() => {
    if (emojiQuery === null) return [];
    const q = emojiQuery.toLowerCase();

    const results = [];

    // Collect all unique custom emojis from all available guilds
    const allCustom = [];

    // Priority 1: Current guild emojis
    const currentGuildEmojis = guildEmojis[guildId] || [];
    currentGuildEmojis.forEach((e) => {
      if (e.name.toLowerCase().includes(q)) {
        allCustom.push({ ...e, fromCurrent: true });
      }
    });

    // Priority 2: Other guilds
    Object.entries(guildEmojis).forEach(([gid, emojis]) => {
      if (gid === guildId) return;
      emojis.forEach((e) => {
        if (e.name.toLowerCase().includes(q) && !allCustom.find((ac) => ac.id === e.id)) {
          allCustom.push({ ...e, fromCurrent: false });
        }
      });
    });

    // Map custom emojis to results
    allCustom.slice(0, SUGGESTIONS_LIMIT).forEach((e) => {
      results.push({
        shortcode: e.fromCurrent ? `:${e.name}:` : `<${e.id}:${e.name}>`,
        displayName: `:${e.name}:`,
        id: e.id,
        emoji: null,
        custom: true,
        imageUrl: `${import.meta.env.VITE_CDN_BASE_URL}/emojis/${e.id}`,
      });
    });

    // Priority 3: Standard emojis
    for (const [shortcode, emoji] of emojiMap) {
      if (results.length >= SUGGESTIONS_LIMIT) break;
      if (shortcode.toLowerCase().includes(`:${q}`)) {
        results.push({ shortcode, displayName: shortcode, emoji, custom: false });
      }
    }
    return results;
  }, [emojiQuery, guildEmojis, guildId]);

  /* ---------------- handlers ---------------- */

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (!editorRef.current) return;

    // Focus the editor first
    editorRef.current.focus();

    // If we have a saved selection, restore it
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    } else {
      // Otherwise, move cursor to the end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const syncValue = useCallback(() => {
    if (!editorRef.current) return;
    setInputMessage(serializeFromDom(editorRef.current));
  }, [setInputMessage]);

  const handleInput = () => {
    saveSelection();
    syncValue();

    const mq = getMentionQuery(editorRef.current);
    const cq = getChannelQuery(editorRef.current);
    const eq = getEmojiQuery(editorRef.current);

    setMentionQuery(mq);
    setChannelQuery(cq);
    setEmojiQuery(eq);
    setMentionIndex(0);
    setChannelIndex(0);
    setEmojiIndex(0);

    // If any suggestion is active, close the full emoji picker to prevent overlapping
    if (mq !== null || cq !== null || eq !== null) {
      if (isEmojiPickerOpen) setIsEmojiPickerOpen(false);
    }

    // Clean up empty editor to show placeholder
    if (editorRef.current && editorRef.current.textContent.trim() === '') {
      editorRef.current.innerHTML = '';
    }

    if (channel?.channel_id && editorRef.current.textContent.trim() !== '' && !silentTyping) {
      ChannelsService.sendTypingIndicator(channel.channel_id);
    }
  };

  const handleKeyDown = (e) => {
    // Handle emoji suggestions first (higher priority than mentions)
    if (emojiQuery && filteredEmojis.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setEmojiIndex((i) => Math.min(i + 1, filteredEmojis.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setEmojiIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        replaceEmojiQueryWithEmoji(emojiQuery, filteredEmojis[emojiIndex].shortcode);
        setEmojiQuery(null);
        syncValue();
        return;
      }
    }

    if (mentionQuery && filteredMembers.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        replaceAtQueryWithMention(mentionQuery, filteredMembers[mentionIndex], resolveUser);
        setMentionQuery(null);
        syncValue();
        return;
      }
    }

    if (channelQuery && filteredChannels.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setChannelIndex((i) => Math.min(i + 1, filteredChannels.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setChannelIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        replaceHashQueryWithChannel(channelQuery, filteredChannels[channelIndex]);
        setChannelQuery(null);
        syncValue();
        return;
      }
    }

    if (e.key === 'ArrowUp' && editorRef.current?.textContent.trim() === '') {
      e.preventDefault();
      const messages = channelMessages[channel?.channel_id] || [];
      const lastOwnMessage = [...messages].reverse().find((m) => m.author.id == currentUser?.id);
      if (lastOwnMessage) setEditingId(lastOwnMessage.id);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    insertTextAtCaret(e.clipboardData.getData('text/plain'));
    convertSerializedMentions(editorRef.current, members, resolveUser);
    syncValue();
  };

  const sendMessage = () => {
    if (!canSendMessages) {
      toast.error('You do not have permission to send messages in this channel.');
      return;
    }
    if (!channel?.channel_id || !inputMessage.trim()) return;
    if (inputMessage.length > MAX_MESSAGE_LENGTH) return;

    ChannelsService.sendChannelMessage(
      channel.channel_id,
      inputMessage,
      replyingId || null,
      shouldMention
    );
    setInputMessage('');
    setReplyingId(null);
    editorRef.current.innerHTML = '';
  };

  const sendSticker = (sticker) => {
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
  };

  const otherRecipient =
    channel?.type === ChannelType.DM
      ? (channel.recipients || []).find((r) => r.id !== currentUser?.id)
      : {};

  /* ---------------- render ---------------- */

  return (
    <div className="bg-[#1a1a1e] p-2">
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
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(156, 163, 175);
          pointer-events: none;
        }
      `}</style>
      <InputGroup
        className={cn(
          'relative flex h-auto items-center border border-white/5 bg-[#222327] transition-all duration-200',
          replyingMessage ? 'rounded-t-none border-t-0' : 'rounded-t-md'
        )}
      >
        <Popover.Root
          open={mentionQuery !== null && filteredMembers.length > 0 && !isEmojiPickerOpen}
          modal={false}
        >
          <Popover.Anchor asChild>
            <div
              ref={editorRef}
              contentEditable={canSendMessages}
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onKeyUp={saveSelection}
              onClick={saveSelection}
              onPaste={handlePaste}
              className={`max-h-[50vh] min-h-[44px] w-full overflow-y-auto p-3 text-sm outline-none ${
                !canSendMessages ? 'cursor-not-allowed opacity-50' : ''
              }`}
              data-placeholder={
                canSendMessages
                  ? channel?.type === ChannelType.DM
                    ? `Message @${otherRecipient.name || 'Unknown'}`
                    : `Message #${channel?.name || 'unknown'}`
                  : 'You cannot send messages in this channel'
              }
            />
          </Popover.Anchor>

          <Popover.Portal>
            <Popover.Content
              side="top"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="z-[1005] rounded bg-[#2b2d31] p-0 shadow-lg"
              style={{ width: editorRef.current?.parentElement?.offsetWidth ?? 300 }}
            >
              <div className="p-2">
                <div className="mb-2 px-2 text-xs font-bold uppercase text-gray-400">Members</div>
                {filteredMembers.map((m, i) => (
                  <button
                    key={m.user_id}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-200 ${
                      i === mentionIndex ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      replaceAtQueryWithMention(mentionQuery, m, resolveUser);
                      setMentionQuery(null);
                      syncValue();
                    }}
                  >
                    <Avatar user={m.user} className="size-6 shrink-0" />
                    <div className="flex-1 truncate font-medium">{m.user.name}</div>
                    <div className="text-xs font-normal text-gray-400">@{m.user.username}</div>
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root
          open={channelQuery !== null && filteredChannels.length > 0 && !isEmojiPickerOpen}
          modal={false}
        >
          {/* Anchor to the input group roughly, or just absolute full width */}
          <Popover.Anchor className="absolute left-0 top-0 w-full" />
          <Popover.Portal>
            <Popover.Content
              side="top"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="z-[1005] rounded bg-[#2b2d31] p-0 shadow-lg"
              style={{ width: editorRef.current?.parentElement?.offsetWidth ?? 300 }}
            >
              <div className="p-2">
                <div className="mb-2 px-2 text-xs font-bold uppercase text-gray-400">
                  Text Channels
                </div>
                {filteredChannels.map((c, i) => (
                  <button
                    key={c.id || c.channel_id}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-200 ${
                      i === channelIndex ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      replaceHashQueryWithChannel(channelQuery, c);
                      setChannelQuery(null);
                      syncValue();
                    }}
                  >
                    {c.type === 2 ? (
                      <SpeakerHigh className="size-4 text-gray-400" />
                    ) : c.type === 5 ? (
                      <Megaphone className="size-4 text-gray-400" />
                    ) : (
                      <Hash className="size-4 text-gray-400" />
                    )}
                    <div className="flex-1 truncate font-medium">{c.name}</div>
                    {c.parent_id && (
                      <div className="text-xs text-gray-500">
                        {/* Category name could go here if available */}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {emojiQuery !== null && filteredEmojis.length > 0 && !isEmojiPickerOpen && (
          <div className="absolute inset-x-0 bottom-full z-[1005] mb-2 flex max-h-[300px] w-full flex-col rounded border border-white/5 bg-[#2c2f33] shadow-lg">
            <div className="shrink-0 border-b border-white/5 px-4 py-3 text-xs font-bold uppercase text-[#949ba4]">
              Emoji matching :{emojiQuery}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredEmojis.map((item, i) => (
                <button
                  key={item.shortcode}
                  className={`flex w-full items-center gap-3 bg-gray-700/50 px-4 py-2 text-left text-sm transition-colors ${
                    i === emojiIndex ? 'bg-gray-700' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    replaceEmojiQueryWithEmoji(emojiQuery, item.shortcode);
                    setEmojiQuery(null);
                    syncValue();
                  }}
                >
                  <div className="flex-1 truncate font-medium text-gray-200">
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div className="flex w-full cursor-default items-center gap-3">
                          {item.custom ? (
                            <img
                              src={item.imageUrl}
                              alt={item.shortcode}
                              className="size-6 shrink-0 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <img
                              src={getTwemojiUrl(item.emoji)}
                              alt={item.emoji}
                              className="size-6 shrink-0 object-contain"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1 truncate font-medium text-gray-200">
                            {item.displayName}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      {item.custom && (
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.id) {
                                navigator.clipboard.writeText(item.id);
                                toast.success('Emoji ID copied to clipboard');
                              }
                            }}
                          >
                            Copy Emoji ID
                          </ContextMenuItem>
                        </ContextMenuContent>
                      )}
                    </ContextMenu>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
          <Popover.Portal forceMount>
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
                  onEmojiSelect={({ id, label, emoji, url }) => {
                    // Record in recent emojis
                    addRecentEmoji({
                      id,
                      label,
                      surrogates: emoji,
                      url,
                      isCustom: !!url,
                    });

                    // Register the emoji in our map for conversion (standard emojis)
                    if (emoji) registerEmoji(label, emoji);

                    // Restore focus and selection to the editor
                    restoreSelection();

                    console.log(id, customEmojis);

                    // Use local shortcode if from current guild, global ID format otherwise
                    const isCurrentGuildEmoji = !!id && customEmojis.some((e) => e.id === id);
                    const shortcode = id && !isCurrentGuildEmoji ? `<${id}:${label}>` : `:${label}:`;
                    insertTextAtCaret(shortcode);
                    syncValue();
                  }}
                />
                <EmojiPickerFooter hoveredEmoji={hoveredEmoji} />
              </div>
            </EmojiPicker>
          </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        </div>
      </InputGroup>
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
