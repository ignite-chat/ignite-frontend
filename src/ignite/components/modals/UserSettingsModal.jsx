import { useState } from 'react';
import { useUsersStore } from '../../store/users.store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Avatar from '../Avatar';
import { Button } from '@/components/ui/button';
import { SheetDescription } from '@/components/ui/sheet';
import { User, UserCircle, Mic, Bot, LogOut, X, Menu, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useModalStore } from '@/ignite/store/modal.store';
import { cn } from '@/lib/utils';
import TabMyAccount from '../user-settings/tabs/TabMyAccount';
import TabProfiles from '../user-settings/tabs/TabProfiles';
import TabVoiceAudio from '../user-settings/tabs/TabVoiceAudio';
import TabNotificationSounds from '../user-settings/tabs/TabNotificationSounds';
import TabBots from '../user-settings/tabs/TabBots';

const navigationSections = [
  {
    label: 'USER SETTINGS',
    items: [
      { id: 'account', title: 'My Account', icon: User },
      { id: 'profiles', title: 'Profiles', icon: UserCircle },
    ],
  },
  {
    label: 'APP SETTINGS',
    items: [
      { id: 'voice', title: 'Voice & Audio', icon: Mic },
      { id: 'notifications', title: 'Notification Sounds', icon: Bell },
    ],
  },
  {
    label: 'BOTS & INTEGRATIONS',
    items: [{ id: 'bots', title: 'Bots', icon: Bot }],
  },
];

const UserSettingsModal = ({ modalId }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const { logout } = useAuthStore();

  const [tab, setTab] = useState('account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setIsMobileMenuOpen(false);
  };

  const allItems = navigationSections.flatMap((s) => s.items);
  const activeItem = allItems.find((item) => item.id === tab);

  const renderContent = () => {
    switch (tab) {
      case 'account':
        return <TabMyAccount onNavigateToProfiles={() => setTab('profiles')} />;
      case 'profiles':
        return <TabProfiles />;
      case 'voice':
        return <TabVoiceAudio />;
      case 'notifications':
        return <TabNotificationSounds />;
      case 'bots':
        return <TabBots />;
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={() => useModalStore.getState().close(modalId)}>
    <DialogContent className="!inset-0 m-auto flex size-full !max-h-[90vh] !max-w-[90vw] !translate-x-0 !translate-y-0 flex-row overflow-hidden p-0">
      <DialogTitle className="sr-only">User Settings</DialogTitle>
      <SheetDescription className="sr-only">
        Manage your user settings and preferences.
      </SheetDescription>

      {/* Sidebar */}
      <div
        className={cn(
          'flex w-60 shrink-0 flex-col bg-muted/30',
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-10 w-full md:static md:w-60'
            : 'hidden md:flex'
        )}
      >
        {/* User header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <Avatar user={currentUser} size={40} className="text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{currentUser?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{currentUser?.username}</p>
          </div>
          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
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
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                        tab === item.id
                          ? 'bg-background text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Separator + Log Out */}
          <div className="mx-2.5 border-t border-border" />
          <div className="space-y-0.5">
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Content area */}
      <div
        className={cn(
          'flex h-full flex-1 flex-col overflow-hidden bg-background',
          isMobileMenuOpen ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Mobile header */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="-ml-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>
          <span className="text-base font-semibold">{activeItem?.title}</span>
        </div>

        {/* Desktop header */}
        <div className="hidden h-14 shrink-0 items-center border-b border-border px-10 md:flex">
          <h1 className="text-base font-semibold">
            {activeItem?.title || 'User Settings'}
          </h1>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
          {renderContent()}
        </div>
      </div>
    </DialogContent>
    </Dialog>
  );
};

export default UserSettingsModal;
