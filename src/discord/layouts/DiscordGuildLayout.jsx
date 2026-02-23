import { useEffect, useState } from 'react';
import DefaultLayout from '../../layouts/DefaultLayout';
import DiscordGuildChannelsSidebar from '../components/DiscordGuildChannelsSidebar';

const DiscordGuildLayout = ({ children, guild }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

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
        className={`fixed inset-y-0 left-0 z-40 w-80 shrink-0 transition-transform duration-300 ease-out md:static md:translate-x-0 ${
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
      <main className="relative flex h-full min-w-0 flex-1 flex-col bg-black">
        {children}
      </main>
    </DefaultLayout>
  );
};

export default DiscordGuildLayout;
