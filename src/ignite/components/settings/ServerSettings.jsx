import { useEffect, useMemo, useState } from 'react';
import ServerInfo from './ServerInfo';
import ServerRoleManager from './roles/ServerRoleManager';
import ServerMemberManager from './ServerMemberManager';
import ServerInviteManager from './ServerInviteManager';
import ServerEmojiManager from './ServerEmojiManager';
import ServerStickerManager from './ServerStickerManager';
import ServerBanManager from './ServerBanManager';
import { Button } from '@/components/ui/button';
import { Info, Shield, Users, Mail, X, Smile, StickyNote, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const ServerSettings = ({ isOpen, onClose, guild, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState('info');

  const navigationSections = useMemo(
    () => [
      {
        label: guild?.name?.toUpperCase() || 'SERVER',
        items: [
          { id: 'info', label: 'Overview', icon: Info, component: <ServerInfo guild={guild} /> },
          { id: 'emoji', label: 'Emoji', icon: Smile, component: <ServerEmojiManager guild={guild} /> },
          { id: 'stickers', label: 'Stickers', icon: StickyNote, component: <ServerStickerManager guild={guild} /> },
        ],
      },
      {
        label: 'USER MANAGEMENT',
        items: [
          { id: 'members', label: 'Members', icon: Users, component: <ServerMemberManager guild={guild} /> },
          { id: 'bans', label: 'Bans', icon: Ban, component: <ServerBanManager guild={guild} /> },
          { id: 'invites', label: 'Invites', icon: Mail, component: <ServerInviteManager guild={guild} /> },
          { id: 'roles', label: 'Roles', icon: Shield, component: <ServerRoleManager guild={guild} /> },
        ],
      },
    ],
    [guild]
  );

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab || 'info');
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allItems = navigationSections.flatMap((s) => s.items);
  const activeItem = allItems.find((item) => item.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Sidebar */}
      <div className="flex w-60 shrink-0 flex-col bg-muted/30">
        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-14">
          {navigationSections.map((section, i) => (
            <div key={i}>
              <h3 className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                        activeTab === item.id
                          ? 'bg-background text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span className="text-xs font-medium uppercase">ESC</span>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-10">
          <h1 className="text-base font-semibold">{activeItem?.label || 'Server Settings'}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-14">
          {activeItem?.component}
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
