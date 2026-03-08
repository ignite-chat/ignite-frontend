import { Outlet, useLocation } from 'react-router-dom';
import { GuildContextProvider } from '@/ignite/contexts/GuildContext';
import GuildsSidebar from '@/components/GuildsSidebar';
import UserBar from '@/ignite/components/UserBar';

const AppLayout = () => {
  const location = useLocation();
  const isDiscordGuild = location.pathname.startsWith('/discord/') && !location.pathname.startsWith('/discord/@me');
  // Discord guild sidebar is 360px, everything else is 320px (w-80)
  const sidebarWidth = isDiscordGuild ? 360 : 320;

  return (
    <GuildContextProvider>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <GuildsSidebar />
          <Outlet />
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
