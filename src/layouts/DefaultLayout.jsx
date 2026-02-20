import { GuildContextProvider } from '@/contexts/GuildContext';
import Sidebar from '../components/Sidebar';
import UserBar from '../components/UserBar';

const DefaultLayout = ({ children, sidebar }) => {
  return (
    <GuildContextProvider>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex shrink-0 flex-col">
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <Sidebar />
              {sidebar}
            </div>
            <UserBar />
          </div>
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </GuildContextProvider>
  );
};

export default DefaultLayout;
