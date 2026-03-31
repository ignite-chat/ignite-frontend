import { useState } from 'react';
import ResizableSidebar from '@/components/ResizableSidebar';
import TelegramChatsSidebar from '../components/TelegramChatsSidebar';

const TelegramChatLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ResizableSidebar
          id="telegram-chat-sidebar"
          defaultWidth={280}
          minWidth={220}
          maxWidth={1000}
        >
          <TelegramChatsSidebar />
        </ResizableSidebar>
        <main className="relative flex min-w-0 flex-1 flex-col bg-[#1a1a1e]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TelegramChatLayout;
