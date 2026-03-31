import { useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GuildContextProvider } from '@/ignite/contexts/GuildContext';
import GuildsSidebar from '@/components/GuildsSidebar';
import UserBar from '@/ignite/components/UserBar';
import WindowBar from '@/components/WindowBar';
import { useSidebarWidthStore } from '@/store/sidebar-width.store';
import { useDiscordFileDropStore } from '@/discord/store/discord-file-drop.store';

const AppLayout = () => {
  const location = useLocation();
  const isDM = location.pathname.startsWith('/channels/@me');
  const isDiscordGuild = location.pathname.startsWith('/discord/') && !location.pathname.startsWith('/discord/@me');
  const isDiscordDM = location.pathname.startsWith('/discord/@me');
  const isTelegram = location.pathname.startsWith('/telegram');

  const sidebarId = isDM ? 'dm-sidebar' : isDiscordDM ? 'discord-dm-sidebar' : isDiscordGuild ? 'discord-guild-sidebar' : isTelegram ? 'telegram-chat-sidebar' : 'guild-sidebar';
  const defaultWidth = isDiscordGuild || isTelegram ? 360 : 320;
  const sidebarWidth = useSidebarWidthStore((s) => s.widths[sidebarId] ?? defaultWidth);

  const isDragOver = useDiscordFileDropStore((s) => s.isDragOver);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCountRef.current++;
    if (e.dataTransfer?.types?.includes('Files')) {
      useDiscordFileDropStore.getState().setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      useDiscordFileDropStore.getState().setDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCountRef.current = 0;
    useDiscordFileDropStore.getState().setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      useDiscordFileDropStore.getState().addDroppedFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  return (
    <GuildContextProvider>
      <div
        className="flex h-screen flex-col overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <WindowBar />
        <div className="flex min-h-0 flex-1 overflow-hidden bg-[#121214]">
          <GuildsSidebar />
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-tl-lg border-l border-t border-white/10">
            <Outlet />
          </div>
        </div>
        <div
          className="pointer-events-none fixed bottom-0 left-0 z-50"
          style={{ width: 72 + sidebarWidth }}
        >
          <UserBar />
        </div>
        {isDragOver && (
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#5865f2] bg-[#1a1a1e] px-12 py-8">
              <p className="text-lg font-semibold text-white">Upload to Channel</p>
              <p className="text-sm text-gray-400">Drop files anywhere to upload them</p>
            </div>
          </div>
        )}
      </div>
    </GuildContextProvider>
  );
};

export default AppLayout;
