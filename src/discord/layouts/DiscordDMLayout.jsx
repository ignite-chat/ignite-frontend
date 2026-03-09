import { useState } from 'react';
import DiscordDMChannelsSidebar from '../components/DiscordDMChannelsSidebar';
import ResizableSidebar from '@/components/ResizableSidebar';

const DiscordDMLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <>
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-transparent md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <ResizableSidebar
        id="discord-dm-sidebar"
        defaultWidth={320}
        minWidth={200}
        maxWidth={500}
        className={`fixed inset-y-0 left-0 z-40 h-full transition-transform duration-300 ease-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <DiscordDMChannelsSidebar />
      </ResizableSidebar>
      {!isSidebarOpen && (
        <button
          type="button"
          className="border-white/5/60 fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 animate-pulse rounded-r border bg-gray-800/70 shadow-sm transition-all duration-300 hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        />
      )}
      <main className="relative flex h-full min-w-0 flex-1 flex-col bg-black">
        {children}
      </main>
    </>
  );
};

export default DiscordDMLayout;
