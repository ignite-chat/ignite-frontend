import { GuildContextProvider } from '@/contexts/GuildContext';
import Sidebar from './Sidebar';

const DefaultLayout = ({ children }) => {
  return (
    <GuildContextProvider>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </GuildContextProvider>
  );
};

export default DefaultLayout;
