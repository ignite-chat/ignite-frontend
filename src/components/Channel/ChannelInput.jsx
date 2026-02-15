import * as Popover from '@radix-ui/react-popover';
import { InputGroup } from '../ui/input-group';
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from '../ui/emoji-picker';
import { useChannelInputContext, useChannelContext } from '../../contexts/ChannelContext.jsx';
import { useChannelsStore } from '../../store/channels.store';
import { X, Hash, Megaphone, ChatText } from '@phosphor-icons/react';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { ChannelType } from '../../enums/ChannelType';
import useStore from '../../hooks/useStore';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Smile } from 'lucide-react';
import { ChannelsService } from '../../services/channels.service';
import { PermissionsService } from '../../services/permissions.service';
import { Permissions } from '../../enums/Permissions';
import { toast } from 'sonner';
import { emojiMap, registerEmoji } from '../../utils/emoji.utils';
import { useEmojisStore } from '../../store/emojis.store';
import { useTypingStore } from '../../store/typing.store';

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
  const { replyingId, setReplyingId } = useChannelContext();
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();
  const { guildEmojis } = useEmojisStore();
  const customEmojis = guildEmojis[guildId] || [];
  const currentUser = useStore((s) => s.user);
  const members = guildsStore.guildMembers[guildId] || [];
  const guild = guildsStore.guilds.find((g) => g.id === guildId);
  const channels = guild?.channels || [];
  const channelMessages = useChannelsStore((s) => s.channelMessages);

  const typingUsers = useTypingStore((s) => s.typing[channel?.channel_id] || []);
  const clearExpired = useTypingStore((s) => s.clearExpired);

  useEffect(() => {
    const interval = setInterval(clearExpired, 1000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  const typingText = useMemo(() => {
    console.log(typingUsers);
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

  const [emojiQuery, setEmojiQuery] = useState(null);
  const [emojiIndex, setEmojiIndex] = useState(0);

  const filteredEmojis = useMemo(() => {
    if (!emojiQuery) return [];
    const q = emojiQuery.toLowerCase();

    // Custom guild emojis first
    const results = customEmojis
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, SUGGESTIONS_LIMIT)
      .map((e) => ({
        shortcode: `:${e.name}:`,
        emoji: null,
        custom: true,
        imageUrl: `${import.meta.env.VITE_CDN_BASE_URL}/emojis/${e.id}`,
      }));

    // Fill remaining slots with standard emojis
    for (const [shortcode, emoji] of emojiMap) {
      if (results.length >= SUGGESTIONS_LIMIT) break;
      if (shortcode.toLowerCase().includes(`:${q}`)) {
        results.push({ shortcode, emoji, custom: false });
      }
    }
    return results;
  }, [emojiQuery, customEmojis]);

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
    setMentionQuery(getMentionQuery(editorRef.current));
    setChannelQuery(getChannelQuery(editorRef.current));
    setEmojiQuery(getEmojiQuery(editorRef.current));
    setMentionIndex(0);
    setChannelIndex(0);
    setEmojiIndex(0);

    // Clean up empty editor to show placeholder
    if (editorRef.current && editorRef.current.textContent.trim() === '') {
      editorRef.current.innerHTML = '';
    }

    if (channel?.channel_id && editorRef.current.textContent.trim() !== '') {
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

    ChannelsService.sendChannelMessage(channel.channel_id, inputMessage, replyingId || null);
    setInputMessage('');
    setReplyingId(null);
    editorRef.current.innerHTML = '';
  };

  const otherRecipient =
    channel?.type === ChannelType.DM
      ? (channel.recipients || []).find((r) => r.id !== currentUser?.id)
      : {};

  /* ---------------- render ---------------- */

  return (
    <div className="bg-gray-[#1a1a1e] px-2 pb-2 pt-2">
      {replyingMessage && (
        <div className="flex items-center gap-2 rounded-t-md bg-gray-800 px-3 py-2 text-sm text-gray-300">
          <span className="shrink-0 text-gray-400">Replying to</span>
          <span className="shrink-0 font-semibold text-white">
            {replyingMessage.author.name || replyingMessage.author.username}
          </span>
          <span className="truncate text-gray-400">{replyingMessage.content}</span>
          <button
            type="button"
            onClick={() => setReplyingId(null)}
            className="ml-auto rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(156, 163, 175);
          pointer-events: none;
        }
      `}</style>
      <InputGroup className="relative flex h-auto items-center border border-white/5 bg-[#222327]">
        <Popover.Root open={!!mentionQuery && filteredMembers.length > 0} modal={false}>
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
              className={`max-h-[50vh] min-h-[44px] w-full overflow-y-auto px-3 py-3 text-sm outline-none ${
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
              className="z-50 w-full rounded bg-gray-800 p-2 shadow"
            >
              {filteredMembers.map((m, i) => (
                <button
                  key={m.user_id}
                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left ${
                    i === mentionIndex ? 'bg-gray-700' : 'hover:bg-gray-700/60'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    replaceAtQueryWithMention(mentionQuery, m, resolveUser);
                    setMentionQuery(null);
                    syncValue();
                  }}
                >
                  <div className="flex-1 truncate">{m.user.name}</div>
                  <div className="text-xs text-gray-400">@{m.user.username}</div>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root open={channelQuery !== null && filteredChannels.length > 0} modal={false}>
          {/* Anchor to the input group roughly, or just absolute full width */}
          <Popover.Anchor className="absolute left-0 top-0 w-full" />
          <Popover.Portal>
            <Popover.Content
              side="top"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="z-50 rounded bg-[#2b2d31] p-0 shadow-lg"
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
                    {c.type === 5 ? (
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

        {emojiQuery && filteredEmojis.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 flex max-h-[300px] w-full flex-col rounded border border-white/5 bg-[#2c2f33] shadow-lg">
            <div className="flex-shrink-0 border-b border-white/5 px-4 py-3 text-xs font-bold text-gray-400">
              EMOJI MATCHING :{emojiQuery}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredEmojis.map((item, i) => (
                <button
                  key={item.shortcode}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    i === emojiIndex ? 'bg-gray-700' : 'hover:bg-gray-700/50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    replaceEmojiQueryWithEmoji(emojiQuery, item.shortcode);
                    setEmojiQuery(null);
                    syncValue();
                  }}
                >
                  {item.custom ? (
                    <img
                      src={item.imageUrl}
                      alt={item.shortcode}
                      className="h-6 w-6 flex-shrink-0 object-contain"
                    />
                  ) : (
                    <div className="flex-shrink-0 text-xl">{item.emoji}</div>
                  )}
                  <div className="flex-1 truncate font-medium text-gray-200">{item.shortcode}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Popover.Root modal={false}>
          <Popover.Trigger asChild>
            <Button variant="ghost" className="mr-2 mt-2 h-8 w-8 self-start text-gray-400">
              <Smile className="size-5" />
            </Button>
          </Popover.Trigger>
          <Popover.Content
            side="top"
            align="end"
            sideOffset={8}
            collisionPadding={16}
            className="flex h-[400px] w-[350px] flex-col overflow-hidden p-0"
          >
            <EmojiPicker
              onEmojiSelect={({ label, emoji }) => {
                // Register the emoji in our map for conversion
                registerEmoji(label, emoji);

                // Restore focus and selection to the editor
                restoreSelection();

                // Convert label to Discord-style shortcode
                const shortcode = `:${label.toLowerCase().replace(/\s+/g, '_')}:`;
                insertTextAtCaret(shortcode);
                syncValue();
              }}
            >
              <EmojiPickerSearch />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </Popover.Content>
        </Popover.Root>
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
