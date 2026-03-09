import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import SharedGuildLayout from '../../layouts/GuildLayout';
import DiscordGuildChannelsSidebar from '../components/DiscordGuildChannelsSidebar';
import DiscordChannelHeader from '../components/DiscordChannelHeader';
import DiscordMemberList from '../components/DiscordMemberList';
import DiscordSearchPanel from '../components/DiscordSearchPanel';

const DiscordGuildLayout = ({ children, guild, channel, dmInfo }) => {
  const { channelId } = useParams();
  const [memberListOpen, setMemberListOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isDM = false;
  const displayName = channel?.name;
  const guildName = guild?.properties?.name || guild?.name || 'Server';
  const toggleMemberList = useCallback(() => setMemberListOpen((v) => !v), []);
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const sidebar = <DiscordGuildChannelsSidebar guild={guild} />;

  return (
    <SharedGuildLayout guild={guild} sidebar={sidebar} sidebarId="discord-guild-sidebar" defaultWidth={360}>
      <main className="relative flex min-w-0 flex-1 flex-col bg-[#1a1a1e]">
        {channel && (
          <DiscordChannelHeader
            channel={channel}
            displayName={displayName}
            isDM={isDM}
            dmInfo={dmInfo}
            guildName={guildName}
            memberListOpen={memberListOpen}
            onToggleMemberList={toggleMemberList}
            searchOpen={searchOpen}
            onSearch={handleSearch}
          />
        )}
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          {guild?.id && channelId && memberListOpen && !searchOpen && <DiscordMemberList guildId={guild.id} />}
          {guild?.id && searchOpen && <DiscordSearchPanel key={searchQuery} guildId={guild.id} initialQuery={searchQuery} onClose={closeSearch} />}
        </div>
      </main>
    </SharedGuildLayout>
  );
};

export default DiscordGuildLayout;
