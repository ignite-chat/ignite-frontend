import { useState, useCallback, useRef, useEffect } from 'react';
import { DiscordService } from '../services/discord.service';
import { useDiscordHasPermission } from '../hooks/useDiscordPermission';
import { SEND_MESSAGES } from '../constants/permissions';

const DiscordChannelInput = ({ channel, channelName, onMessageSent }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const channelId = channel?.id;
  const guildId = channel?.guild_id;
  const canSend = useDiscordHasPermission(guildId, channel, SEND_MESSAGES);
  const isDM = channel?.type === 1 || channel?.type === 3;

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
    <div className="p-2">
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
