import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DefaultLayout from '../../layouts/DefaultLayout';
import DiscordGuildChannelsSidebar from '../components/DiscordGuildChannelsSidebar';
import DiscordChannelHeader from '../components/DiscordChannelHeader';
import DiscordMemberList from '../components/DiscordMemberList';
import DiscordSearchPanel from '../components/DiscordSearchPanel';

const DiscordGuildLayout = ({ children, guild, channel, dmInfo }) => {
  const { channelId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [memberListOpen, setMemberListOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

  const isDM = false; // Guild layout is never used for DMs
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

  const guildSidebar = (
    <>
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-transparent md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[360px] shrink-0 transition-transform duration-300 ease-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <DiscordGuildChannelsSidebar guild={guild} />
      </div>
      {!isSidebarOpen && (
        <button
          type="button"
          className="border-white/5/60 fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 animate-pulse rounded-r border bg-gray-800/70 shadow-sm transition-all duration-300 hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        />
      )}
    </>
  );

  return (
    <DefaultLayout sidebar={guildSidebar}>
      <main className="relative flex h-full min-w-0 flex-1 flex-col bg-[#1a1a1e]">
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
    </DefaultLayout>
  );
};

export default DiscordGuildLayout;
