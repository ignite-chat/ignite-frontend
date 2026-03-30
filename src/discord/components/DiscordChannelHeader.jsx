import { useState, useMemo, useCallback } from 'react';
import { At, ChatsTeardrop, Hash, MagnifyingGlass, Users, ClockCounterClockwise } from '@phosphor-icons/react';
import { GUILD_FORUM } from '../constants/channel-types';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';
import { useDiscordMessageLogStore } from '../store/discord-message-log.store';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import { useModalStore } from '@/store/modal.store';

const TopicRenderer = ({ topic, guildId }) => {
  const ast = useMemo(() => parseMarkdown(topic), [topic]);
  return (
    <span className="min-w-0 truncate text-sm text-gray-400 [&_a]:text-blue-400 [&_a]:hover:underline">
      <DiscordMarkdownRenderer nodes={ast} guildId={guildId} />
    </span>
  );
};

const DiscordChannelHeader = ({ channel, displayName, isDM, dmInfo, dmRecipient, guildName, memberListOpen, onToggleMemberList, searchOpen, onSearch, messageLogOpen, onToggleMessageLog }) => {
  const isForum = channel?.type === GUILD_FORUM;
  const [searchValue, setSearchValue] = useState('');
  const logEnabled = useDiscordMessageLogStore((s) => s.settings.enabled);
  const logCount = useDiscordMessageLogStore((s) => (s.logs[channel?.id] || []).length);

  const icon = isDM ? (
    dmInfo?.properties?.icon ? (
      <img
        src={dmInfo.properties?.icon}
        alt={dmInfo.properties?.name}
        className="mr-2 size-6 shrink-0 rounded-full object-cover"
      />
    ) : (
      <At className="mr-1 size-5 shrink-0 text-gray-400" />
    )
  ) : isForum ? (
    <ChatsTeardrop className="mr-1 size-5 shrink-0 text-gray-400" weight="fill" />
  ) : (
    <Hash className="mr-1 size-5 shrink-0 text-gray-400" />
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center border-b border-white/5 px-2 shadow-sm">
      <div
        className={`flex min-w-0 items-center px-2 select-none ${dmRecipient ? 'cursor-pointer' : ''}`}
        onClick={dmRecipient ? () => useModalStore.getState().push(DiscordUserProfileModal, { userId: dmRecipient.id }) : undefined}
      >
        {icon}
        <span className="truncate text-[15px] font-semibold text-white">{displayName || channel?.name}</span>
      </div>

      {channel?.topic && (
        <>
          <div className="mx-2 h-6 w-px shrink-0 bg-white/10" />
          <TopicRenderer topic={channel.topic} guildId={channel.guild_id} />
        </>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Message Log toggle */}
        {logEnabled && onToggleMessageLog && (
          <button
            type="button"
            onClick={onToggleMessageLog}
            className={`relative rounded p-1.5 transition hover:bg-white/10 ${messageLogOpen ? 'text-white' : 'text-gray-400'}`}
            aria-label="Toggle message log"
            title="Message Log"
          >
            <ClockCounterClockwise size={20} weight={messageLogOpen ? 'fill' : 'regular'} />
            {logCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#f23f42] text-[8px] font-bold text-white">
                {logCount > 99 ? '99' : logCount}
              </span>
            )}
          </button>
        )}

        {onToggleMemberList && (
          <button
            type="button"
            onClick={onToggleMemberList}
            className={`rounded p-1.5 transition hover:bg-white/10 ${memberListOpen ? 'text-white' : 'text-gray-400'}`}
            aria-label="Toggle member list"
          >
            <Users size={20} weight={memberListOpen ? 'fill' : 'regular'} />
          </button>
        )}

        <div className={`flex h-8 w-56 items-center rounded-sm border bg-[#111214] transition ${searchOpen ? 'border-white/20' : 'border-white/10'}`}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${guildName || 'Server'}`}
            className="h-full w-full bg-transparent px-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
          />
          <MagnifyingGlass size={16} className="mr-2 shrink-0 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default DiscordChannelHeader;
