import { useState, useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelInputContext } from '../../contexts/ChannelContext';
import ChannelBar from './ChannelBar.jsx';
import ChannelInput from './ChannelInput';
import ChannelMessages from './ChannelMessages';
import { ChannelType } from '../../constants/ChannelType';
import MemberList from './MemberList';
import DMProfilePanel from './DMProfilePanel';
import VoiceChannelView from '../voice/VoiceChannelView';

const Channel = ({ channel, messageId }) => {
  const { guildId } = useGuildContext();
  const { addFiles } = useChannelInputContext();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

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

  if (channel?.type === ChannelType.GUILD_VOICE) {
    return (
      <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[#1a1a1e]">
        {channel?.type !== ChannelType.GUILD_VOICE && (
          <>
            <ChannelBar channel={channel} />
            <hr className="m-0 w-full border border-t-0 border-white/5 bg-gray-900 p-0" />
          </>
        )}
        <VoiceChannelView channel={channel} />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col bg-[#1a1a1e]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ChannelBar channel={channel} onJumpToMessage={() => {}} />
      <hr className="m-0 w-full border border-t-0 border-white/5 bg-gray-900 p-0" />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex size-full flex-1 flex-col overflow-hidden">
          <ChannelMessages channel={channel} messageId={messageId} />
          <ChannelInput channel={channel} />
        </div>

        {channel?.type === ChannelType.DM ? (
          <div className="hidden lg:flex">
            <DMProfilePanel channel={channel} />
          </div>
        ) : (
          <div className="hidden lg:flex">
            <MemberList guildId={guildId} />
          </div>
        )}
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#1a1a1e]/90">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#5865f2] bg-[#5865f2]/10 px-12 py-10">
            <Upload className="size-12 text-[#5865f2]" />
            <span className="text-lg font-semibold text-[#dbdee1]">
              Upload to {channel?.type === ChannelType.DM ? `@${(channel.recipients || [])[0]?.name || 'DM'}` : `#${channel?.name || 'channel'}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channel;
