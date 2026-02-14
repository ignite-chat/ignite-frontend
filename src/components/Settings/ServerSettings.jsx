import { useEffect, useMemo, useState } from 'react';
import ServerInfo from './ServerInfo';
import ServerRoleManager from './ServerRoleManager';
import ServerMemberManager from './ServerMemberManager';
import ServerInviteManager from './ServerInviteManager';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Info, Shield, Users, Mail, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ServerSettings = ({ isOpen, onClose, guild, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState('info');

  const navigationSections = useMemo(
    () => [
      {
        label: guild?.name?.toUpperCase() || 'SERVER',
        items: [
          {
            id: 'info',
            label: 'Overview',
            icon: Info,
            component: <ServerInfo guild={guild} />,
          },
        ],
      },
      {
        label: 'USER MANAGEMENT',
        items: [
          {
            id: 'members',
            label: 'Members',
            icon: Users,
            component: <ServerMemberManager guild={guild} />,
          },
          {
            id: 'invites',
            label: 'Invites',
            icon: Mail,
            component: <ServerInviteManager guild={guild} />,
          },
          {
            id: 'roles',
            label: 'Roles',
            icon: Shield,
            component: <ServerRoleManager guild={guild} />,
          },
        ],
      },
    ],
    [guild]
  );

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab || 'info');
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allItems = navigationSections.flatMap((section) => section.items);
  const activeItem = allItems.find((item) => item.id === activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose?.() : null)}>
      <DialogContent
        showCloseButton={false}
        className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:max-w-none"
      >
        <div className="flex h-full">
          {/* Sidebar Navigation */}
          <div className="flex w-60 flex-col bg-muted/30">
            <ScrollArea className="flex-1 px-2 py-14">
              <nav className="space-y-6">
                {navigationSections.map((section, sectionIdx) => (
                  <div key={sectionIdx}>
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
                                ? 'bg-background text-foreground hover:bg-background'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>

            {/* ESC Button at bottom */}
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

          {/* Content Area */}
          <div className="flex flex-1 flex-col">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-border px-10">
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

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="px-10 py-14">{activeItem?.component}</div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerSettings;
