import { useEffect, useMemo, useState } from 'react';
import ServerInfo from './ServerInfo';
import ServerRoleManager from './ServerRoleManager';
import ServerMemberManager from './ServerMemberManager';
import ServerInviteManager from './ServerInviteManager';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import {
  Info,
  Users,
  Ticket,
  Shield,
  Smiley,
  Sticker,
  SpeakerHigh,
  X
} from '@phosphor-icons/react';

const ServerSettings = ({ isOpen, onClose, guild, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState('info');

  const categories = useMemo(() => [
    {
      title: 'Server Settings',
      items: [
        { id: 'info', label: 'Server Profile', icon: <Info size={18} weight="duotone" />, component: <ServerInfo guild={guild} /> },
        { id: 'roles', label: 'Roles', icon: <Shield size={18} weight="duotone" />, component: <ServerRoleManager guild={guild} /> },
      ]
    },
    {
      title: 'User Management',
      items: [
        { id: 'members', label: 'Members', icon: <Users size={18} weight="duotone" />, component: <ServerMemberManager guild={guild} /> },
        { id: 'invites', label: 'Invites', icon: <Ticket size={18} weight="duotone" />, component: <ServerInviteManager guild={guild} /> },
      ]
    }
  ], [guild]);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab || 'info');
  }, [initialTab, isOpen]);

  const activeComponent = useMemo(() => {
    for (const category of categories) {
      const item = category.items.find(i => i.id === activeTab);
      if (item) return item.component;
    }
    return categories[0].items[0].component;
  }, [activeTab, categories]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose?.() : null)}>
      <DialogContent
        showCloseButton={false}
        className="fixed !top-0 !left-0 !translate-x-0 !translate-y-0 h-screen w-screen !max-w-none overflow-hidden rounded-none p-0 bg-[#2b2d31] border-none"
      >
        <DialogTitle className="sr-only">Server Settings</DialogTitle>
        <DialogDescription className="sr-only">Manage your server settings, roles, and members.</DialogDescription>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-[240px] shrink-0 bg-[#2b2d31] flex flex-col border-r border-white/5">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {categories.map((category) => (
                  <div key={category.title} className="space-y-1">
                    <h4 className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
                      {category.title}
                    </h4>
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === item.id
                          ? 'bg-white/10 text-white'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        <span className={activeTab === item.id ? 'text-[#f97316]' : 'text-muted-foreground/70'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-[#313338] min-w-0 relative">
            <div className="absolute top-6 right-10 z-50">
              <div className="flex flex-col items-center gap-1 group">
                <button
                  onClick={onClose}
                  className="size-9 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center text-muted-foreground/80 hover:text-white hover:border-white transition-all group-hover:bg-white/5"
                >
                  <X size={20} weight="bold" />
                </button>
                <span className="text-[11px] font-bold text-muted-foreground transition-colors group-hover:text-white uppercase tracking-wider">Esc</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="max-w-[1000px] w-full mx-auto px-10 py-16">
                {activeComponent}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
    <div className="size-20 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/50">
      <Gear size={40} />
    </div>
    <div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">This feature is coming soon!</p>
    </div>
  </div>
);

const Gear = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
    <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm119.8,17.46-17.76-10.25a8,8,0,0,1-2.93-10.93,88.16,88.16,0,0,0,0-20.56,8,8,0,0,1,2.93-10.93l17.76-10.25a8.06,8.06,0,0,0,2.93-10.93,104,104,0,0,0-18.06-31.27,8,8,0,0,0-10.93-2.93L206.4,110.6a8,8,0,0,1-10.93-2.93,88.16,88.16,0,0,0-17.81-10.3c-.27-.11-.54-.21-.81-.31a8,8,0,0,1-5.18-7.5l-.25-20.5A8.06,8.06,0,0,0,163.49,61,104.13,104.13,0,0,0,128,56a104.13,104.13,0,0,0-35.49,5,8.06,8.06,0,0,0-5.63,7.93l-.25,20.5a8,8,0,0,1-5.18,7.5c-.27.1-.54.2-.81.31a88.16,88.16,0,0,0-17.81,10.3,8,8,0,0,1-10.93,2.93L34.14,100.27a8,8,0,0,0-10.93,2.93,104,104,0,0,0-18.06,31.27,8.06,8.06,0,0,0,2.93,10.93l17.76,10.25a8,8,0,0,1,2.93,10.93,88.16,88.16,0,0,0,0,20.56,8,8,0,0,1-2.93,10.93L10.14,197.33a8.06,8.06,0,0,0-2.93,10.93,104,104,0,0,0,18.06,31.27,8,8,0,0,0,10.93,2.93l17.76-10.25a8,8,0,0,1,10.93,2.93,88.16,88.16,0,0,0,17.81,10.3c.27.11.54.21.81.31a8,8,0,0,1,5.18,7.5l.25,20.5a8.06,8.06,0,0,0,5.63,7.93A104.13,104.13,0,0,0,128,256a104.13,104.13,0,0,0,35.49-5,8.06,8.06,0,0,0,5.63-7.93l.25-20.5a8,8,0,0,1,5.18-7.5c.27-.1.54-.2.81-.31a88.16,88.16,0,0,0,17.81-10.3,8,8,0,0,1,10.93-2.93l17.76,10.25a8,8,0,0,0,10.93-2.93,104,104,0,0,0,18.06-31.27A8.06,8.06,0,0,0,247.8,177.46Z" />
  </svg>
);

export default ServerSettings;
