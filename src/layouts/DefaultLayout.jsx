import { GuildContextProvider } from '@/contexts/GuildContext';
import GuildsSidebar from '../components/GuildsSidebar';
import UserBar from '../components/UserBar';

const DefaultLayout = ({ children, sidebar }) => {
  return (
    <GuildContextProvider>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative flex shrink-0">
            <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
              <GuildsSidebar />
              {sidebar}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
              <UserBar />
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </GuildContextProvider>
  );
};

export default DefaultLayout;
