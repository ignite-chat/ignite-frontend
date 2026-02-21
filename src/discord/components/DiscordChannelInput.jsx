import { useState, useCallback, useRef, useEffect } from 'react';
import { DiscordService } from '../services/discord.service';

const DiscordChannelInput = ({ channelId, channelName }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  // Focus input when channel changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  const sendMessage = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || !channelId) return;

    DiscordService.sendMessage(channelId, trimmed);
    setValue('');
  }, [value, channelId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="p-2">
      <div className="flex items-center rounded-md border border-white/5 bg-[#222327]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName || 'channel'}`}
          className="max-h-[50vh] min-h-[44px] w-full resize-none bg-transparent p-3 text-sm text-gray-200 outline-none placeholder:text-gray-500"
          rows={1}
        />
      </div>
    </div>
  );
};

export default DiscordChannelInput;
