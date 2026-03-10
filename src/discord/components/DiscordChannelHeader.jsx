import { useState, useMemo } from 'react';
import { At, ChatsTeardrop, Hash, MagnifyingGlass, Users } from '@phosphor-icons/react';
import { GUILD_FORUM } from '../constants/channel-types';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';

const TopicRenderer = ({ topic, guildId }) => {
  const ast = useMemo(() => parseMarkdown(topic), [topic]);
  return (
    <span className="min-w-0 truncate text-sm text-gray-400 [&_a]:text-blue-400 [&_a]:hover:underline">
      <DiscordMarkdownRenderer nodes={ast} guildId={guildId} />
    </span>
  );
};

const DiscordChannelHeader = ({ channel, displayName, isDM, dmInfo, guildName, memberListOpen, onToggleMemberList, searchOpen, onSearch }) => {
  const isForum = channel?.type === GUILD_FORUM;
  const [searchValue, setSearchValue] = useState('');

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
      <div className="flex min-w-0 items-center px-2">
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
