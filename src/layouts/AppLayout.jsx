import { Outlet, useLocation } from 'react-router-dom';
import { GuildContextProvider } from '@/ignite/contexts/GuildContext';
import GuildsSidebar from '@/components/GuildsSidebar';
import UserBar from '@/ignite/components/UserBar';
import WindowBar from '@/components/WindowBar';
import { useSidebarWidthStore } from '@/store/sidebar-width.store';

const AppLayout = () => {
  const location = useLocation();
  const isDM = location.pathname.startsWith('/channels/@me');
  const isDiscordGuild = location.pathname.startsWith('/discord/') && !location.pathname.startsWith('/discord/@me');
  const isDiscordDM = location.pathname.startsWith('/discord/@me');

  const sidebarId = isDM ? 'dm-sidebar' : isDiscordDM ? 'discord-dm-sidebar' : isDiscordGuild ? 'discord-guild-sidebar' : 'guild-sidebar';
  const defaultWidth = isDiscordGuild ? 360 : 320;
  const sidebarWidth = useSidebarWidthStore((s) => s.widths[sidebarId] ?? defaultWidth);

  return (
    <GuildContextProvider>
      <div className="flex h-screen flex-col overflow-hidden">
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
      </div>
    </GuildContextProvider>
  );
};

export default AppLayout;
