import { useState, useCallback, useRef, useEffect } from 'react';
import { DiscordService } from '../services/discord.service';
import { useDiscordHasPermission } from '../hooks/useDiscordPermission';
import { SEND_MESSAGES } from '../constants/permissions';
import { useDiscordTypingStore } from '../store/discord-typing.store';
import TypingDots from '@/components/ui/typing-dots';

const DiscordChannelInput = ({ channel, channelName, onMessageSent }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const channelId = channel?.id;
  const guildId = channel?.guild_id;
  const canSend = useDiscordHasPermission(guildId, channel, SEND_MESSAGES);
  const isDM = channel?.type === 1 || channel?.type === 3;
  const typingUsers = useDiscordTypingStore((s) => (channelId ? s.typing[channelId] || [] : []));
  const clearExpired = useDiscordTypingStore((s) => s.clearExpired);

  useEffect(() => {
    const interval = setInterval(clearExpired, 500);
    return () => clearInterval(interval);
  }, [clearExpired]);

  // Focus input when channel changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const sendMessage = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || !channelId) return;

    DiscordService.sendMessage(channelId, trimmed);
    setValue('');
    onMessageSent?.();
  }, [value, channelId, onMessageSent]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // DMs always allow sending; guild channels check permissions
  if (!isDM && !canSend) {
    return (
      <div className="p-2">
        <div className="flex items-center rounded-md border border-white/5 bg-[#222327] px-3 py-3">
          <span className="text-sm text-gray-500">You do not have permission to send messages in this channel</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-2">
      {typingUsers.length > 0 && (
        <div className="absolute bottom-[calc(100%-8px)] left-0 right-0 flex items-center gap-1 bg-gradient-to-t from-[#1a1a1e] to-transparent px-5 pb-0.5 pt-4 text-xs text-gray-400">
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
      <div className="flex items-center rounded-md border border-white/5 bg-[#222327]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${channelName || 'channel'}`}
          className="max-h-[50vh] min-h-[44px] w-full resize-none bg-transparent p-3 text-sm text-gray-200 outline-none placeholder:text-gray-500"
          rows={1}
        />
      </div>
    </div>
  );
};

export default DiscordChannelInput;
