import { useEffect, useState } from 'react';
import ResizableSidebar from '@/components/ResizableSidebar';

const GuildLayout = ({ children, guild, sidebar, sidebarId = 'guild-sidebar', defaultWidth = 320 }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

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
        id={sidebarId}
        defaultWidth={defaultWidth}
        minWidth={200}
        maxWidth={500}
        className={`fixed inset-y-0 left-0 z-40 h-full transition-transform duration-300 ease-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </ResizableSidebar>
      {!isSidebarOpen && (
        <button
          type="button"
          className="border-white/5/60 fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 animate-pulse rounded-r border bg-gray-800/70 shadow-sm transition-all duration-300 hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        />
      )}
      {children}
    </>
  );
};

export default GuildLayout;
