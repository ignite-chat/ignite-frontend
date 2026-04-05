import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUsersStore } from '@/ignite/store/users.store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Avatar from '@/ignite/components/Avatar';
import { Button } from '@/components/ui/button';
import { SheetDescription } from '@/components/ui/sheet';
import { User, UserCircle, Mic, Bot, LogOut, X, Menu, Bell, Activity, History, Volume2, Settings, Smartphone, Shield, UserX, Edit } from 'lucide-react';
import { useAuthStore } from '@/ignite/store/auth.store';
import { useModalStore } from '@/ignite/store/modal.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useTelegramStore } from '@/telegram/store/telegram.store';
import { cn } from '@/lib/utils';
import TabMyAccount from '@/ignite/components/user-settings/tabs/TabMyAccount';
import TabProfiles from '@/ignite/components/user-settings/tabs/TabProfiles';
import TabVoiceAudio from '@/ignite/components/user-settings/tabs/TabVoiceAudio';
import TabNotificationSounds from '@/ignite/components/user-settings/tabs/TabNotificationSounds';
import TabBots from '@/ignite/components/user-settings/tabs/TabBots';
import TabPerformance from '@/ignite/components/user-settings/tabs/TabPerformance';
import TabDiscord from '@/ignite/components/user-settings/tabs/TabDiscord';
import TabMessageLogger from '@/ignite/components/user-settings/tabs/TabMessageLogger';
import TabDiscordAudio from '@/ignite/components/user-settings/tabs/TabDiscordAudio';
import { useTelegramPreferencesStore } from '@/telegram/store/telegram-preferences.store';
import { TelegramService } from '@/telegram/services/telegram.service';
import { TelegramClientService } from '@/telegram/services/telegram-client.service';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Api } from 'telegram';

const buildNavigationSections = (hasIgnite, hasDiscord, hasTelegram) => {
  const sections = [];

  // Ignite section
  if (hasIgnite) {
    sections.push({
      label: 'IGNITE',
      items: [
        { id: 'account', title: 'My Account', icon: User },
        { id: 'profiles', title: 'Profiles', icon: UserCircle },
        { id: 'voice', title: 'Voice & Audio', icon: Mic },
        { id: 'notifications', title: 'Notification Sounds', icon: Bell },
        { id: 'bots', title: 'Bots', icon: Bot },
      ],
    });
  }

  // Discord section
  if (hasDiscord && window.IgniteNative) {
    sections.push({
      label: 'DISCORD',
      items: [
        { id: 'discord', title: 'Settings', icon: Settings },
        { id: 'discord-audio', title: 'User Volumes', icon: Volume2 },
        { id: 'message-logger', title: 'Message Logger', icon: History },
      ],
    });
  }

  // Telegram section
  if (hasTelegram) {
    sections.push({
      label: 'TELEGRAM',
      items: [
        { id: 'tg-profile', title: 'Edit Profile', icon: Edit },
        { id: 'tg-devices', title: 'Linked Devices', icon: Smartphone },
        { id: 'tg-privacy', title: 'Privacy & Security', icon: Shield },
        { id: 'tg-blocked', title: 'Blocked Users', icon: UserX },
        { id: 'telegram', title: 'Settings', icon: Settings },
      ],
    });
  }

  // App settings (always shown)
  sections.push({
    label: 'APP SETTINGS',
    items: [
      { id: 'performance', title: 'Performance', icon: Activity },
    ],
  });

  return sections;
};

// ─── Telegram: Edit Profile ──────────────────────────────────────

const TabTelegramProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [about, setAbout] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    (async () => {
      const me = await TelegramService.getMe();
      if (me) {
        setFirstName(me.firstName || '');
        setLastName(me.lastName || '');
        setUsername(me.username || '');
        // Get bio via full user
        const client = TelegramClientService.getClient();
        if (client) {
          try {
            const full = await client.invoke(new Api.users.GetFullUser({ id: new Api.InputUserSelf() }));
            setAbout(full.fullUser?.about || '');
          } catch {}
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await TelegramService.updateProfile({ firstName, lastName, about });
    if (username) {
      await TelegramService.updateUsername(username);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="mt-2 h-4 w-60 rounded" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Edit Profile</h2>
        <p className="mt-1 text-sm text-gray-400">Update your Telegram profile information.</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase text-gray-400">First Name</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white/5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase text-gray-400">Last Name</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white/5" placeholder="Optional" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase text-gray-400">Bio</label>
          <Input value={about} onChange={(e) => setAbout(e.target.value)} className="bg-white/5" placeholder="Tell something about yourself" maxLength={70} />
          <p className="text-xs text-gray-500">{about.length}/70</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase text-gray-400">Username</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">@</span>
            <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="bg-white/5" placeholder="username" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || !firstName.trim()}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};

// ─── Telegram: Linked Devices ────────────────────────────────────

const TabTelegramDevices = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  const loadSessions = async () => {
    setLoading(true);
    const auths = await TelegramService.getAuthorizations();
    setSessions(auths);
    setLoading(false);
  };

  useEffect(() => { loadSessions(); }, []);

  const handleTerminate = async (hash) => {
    const success = await TelegramService.terminateSession(hash);
    if (success) {
      setSessions((prev) => prev.filter((s) => s.hash?.toString() !== hash?.toString()));
    }
  };

  const handleTerminateAll = async () => {
    const success = await TelegramService.terminateAllOtherSessions();
    if (success) {
      setSessions((prev) => prev.filter((s) => s.current));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="mt-2 h-4 w-60 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.current);
  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Linked Devices</h2>
        <p className="mt-1 text-sm text-gray-400">Manage your active Telegram sessions.</p>
      </div>

      {currentSession && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This Device</h3>
          <div className="rounded-lg bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-200">{currentSession.appName || 'Unknown App'} {currentSession.appVersion}</p>
                <p className="text-sm text-gray-400">{currentSession.deviceModel} — {currentSession.platform} {currentSession.systemVersion}</p>
                <p className="text-xs text-gray-500">{currentSession.ip} — {currentSession.country}</p>
              </div>
              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">Current</span>
            </div>
          </div>
        </div>
      )}

      {otherSessions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other Sessions ({otherSessions.length})</h3>
            <button
              type="button"
              onClick={handleTerminateAll}
              className="text-xs font-medium text-red-400 transition-colors hover:text-red-300"
            >
              Terminate All
            </button>
          </div>
          <div className="space-y-2">
            {otherSessions.map((session, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <div>
                  <p className="font-medium text-gray-200">{session.appName || 'Unknown App'} {session.appVersion}</p>
                  <p className="text-sm text-gray-400">{session.deviceModel} — {session.platform} {session.systemVersion}</p>
                  <p className="text-xs text-gray-500">
                    {session.ip} — {session.country}
                    {session.dateActive && ` — Last active: ${new Date(session.dateActive * 1000).toLocaleString()}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTerminate(session.hash)}
                  className="shrink-0 rounded bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
                >
                  Terminate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherSessions.length === 0 && (
        <div className="rounded-lg bg-white/5 p-4 text-center">
          <p className="text-sm text-gray-400">No other active sessions.</p>
        </div>
      )}
    </div>
  );
};

// ─── Telegram: Privacy & Security ────────────────────────────────

const PRIVACY_KEYS = [
  { key: 'StatusTimestamp', label: 'Last Seen & Online', description: 'Who can see when you were last online' },
  { key: 'ChatInvite', label: 'Groups & Channels', description: 'Who can add you to groups and channels' },
  { key: 'PhoneCall', label: 'Calls', description: 'Who can call you' },
  { key: 'PhoneP2P', label: 'Peer-to-Peer in Calls', description: 'Who can use peer-to-peer in calls' },
  { key: 'Forwards', label: 'Forwarded Messages', description: 'Who can link to your account when forwarding messages' },
  { key: 'ProfilePhoto', label: 'Profile Photo', description: 'Who can see your profile photo' },
  { key: 'PhoneNumber', label: 'Phone Number', description: 'Who can see your phone number' },
  { key: 'About', label: 'Bio', description: 'Who can see your bio' },
];

const PRIVACY_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'contacts', label: 'My Contacts' },
  { value: 'nobody', label: 'Nobody' },
];

const privacyRuleToValue = (rules) => {
  if (!rules || rules.length === 0) return 'everyone';
  const first = rules[0];
  if (first.className === 'PrivacyValueAllowAll') return 'everyone';
  if (first.className === 'PrivacyValueAllowContacts') return 'contacts';
  if (first.className === 'PrivacyValueDisallowAll') return 'nobody';
  return 'everyone';
};

const valueToInputRule = (value) => {
  switch (value) {
    case 'contacts': return new Api.InputPrivacyValueAllowContacts();
    case 'nobody': return new Api.InputPrivacyValueDisallowAll();
    default: return new Api.InputPrivacyValueAllowAll();
  }
};

const TabTelegramPrivacy = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverSettings, setServerSettings] = useState({});
  const [localSettings, setLocalSettings] = useState({});

  useEffect(() => {
    (async () => {
      const settings = {};
      for (const { key } of PRIVACY_KEYS) {
        const apiKey = new Api[`InputPrivacyKey${key}`]();
        const result = await TelegramService.getPrivacy(apiKey);
        if (result) {
          settings[key] = privacyRuleToValue(result.rules);
        }
      }
      setServerSettings(settings);
      setLocalSettings(settings);
      setLoading(false);
    })();
  }, []);

  const hasChanges = Object.keys(localSettings).some(
    (key) => localSettings[key] !== serverSettings[key]
  );

  const handleSave = async () => {
    setSaving(true);
    const changedKeys = Object.keys(localSettings).filter(
      (key) => localSettings[key] !== serverSettings[key]
    );
    let allSuccess = true;
    for (const key of changedKeys) {
      const apiKey = new Api[`InputPrivacyKey${key}`]();
      const rule = valueToInputRule(localSettings[key]);
      const success = await TelegramService.setPrivacy(apiKey, [rule]);
      if (!success) allSuccess = false;
    }
    if (allSuccess) {
      setServerSettings({ ...localSettings });
      toast.success('Privacy settings saved');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="mt-2 h-4 w-60 rounded" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Privacy & Security</h2>
        <p className="mt-1 text-sm text-gray-400">Control who can see your information and contact you.</p>
      </div>

      <div className="space-y-2">
        {PRIVACY_KEYS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between rounded-lg bg-white/5 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-200">{label}</p>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
            <select
              value={localSettings[key] || 'everyone'}
              onChange={(e) => setLocalSettings((prev) => ({ ...prev, [key]: e.target.value }))}
              className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-[#1e1f22] px-3 py-1.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-[#2AABEE]"
            >
              {PRIVACY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving || !hasChanges}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};

// ─── Telegram: Blocked Users ─────────────────────────────────────

const TabTelegramBlocked = () => {
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState([]);

  const loadBlocked = async () => {
    setLoading(true);
    const result = await TelegramService.getBlockedUsers();
    const users = (result.users || []).map((u) => ({
      id: u.id?.toString(),
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      username: u.username || '',
    }));
    setBlockedUsers(users);
    setLoading(false);
  };

  useEffect(() => { loadBlocked(); }, []);

  const handleUnblock = async (userId) => {
    const success = await TelegramService.unblockUser(userId);
    if (success) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="mt-2 h-4 w-60 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Blocked Users</h2>
        <p className="mt-1 text-sm text-gray-400">
          {blockedUsers.length > 0
            ? `You have ${blockedUsers.length} blocked user${blockedUsers.length !== 1 ? 's' : ''}.`
            : 'You have no blocked users.'}
        </p>
      </div>

      {blockedUsers.length > 0 ? (
        <div className="space-y-2">
          {blockedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div>
                <p className="font-medium text-gray-200">
                  {user.firstName} {user.lastName}
                </p>
                {user.username && <p className="text-sm text-gray-400">@{user.username}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(user.id)}
                className="shrink-0 rounded bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/15"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-white/5 p-4 text-center">
          <p className="text-sm text-gray-400">No blocked users.</p>
        </div>
      )}
    </div>
  );
};

// ─── Telegram: Settings ──────────────────────────────────────────

const TabTelegram = () => {
  const showUnreadBanner = useTelegramPreferencesStore((s) => s.showUnreadBanner);
  const setShowUnreadBanner = useTelegramPreferencesStore((s) => s.setShowUnreadBanner);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Telegram</h2>
        <p className="mt-1 text-sm text-gray-400">Manage your Telegram integration settings.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chat</h3>
        <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
          <div>
            <p className="font-medium text-gray-200">Unread Message Banner</p>
            <p className="text-sm text-gray-400">
              Show a banner at the top of chats with a button to manually mark messages as read.
            </p>
          </div>
          <Switch checked={showUnreadBanner} onCheckedChange={setShowUnreadBanner} />
        </div>
      </div>
    </div>
  );
};

const UserSettingsModal = ({ modalId }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const { logout } = useAuthStore();
  const hasIgnite = !!localStorage.getItem('token');
  const hasDiscord = useDiscordStore((s) => s.accounts.length > 0);
  const hasTelegram = !!useTelegramStore((s) => s.session);

  const navigationSections = buildNavigationSections(hasIgnite, hasDiscord, hasTelegram);
  const defaultTab = hasIgnite ? 'account' : hasDiscord ? 'discord' : hasTelegram ? 'telegram' : 'performance';
  const [tab, setTab] = useState(defaultTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    window.IgniteNative?.getAppVersion?.().then(setAppVersion).catch(() => {});
  }, []);

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
      case 'performance':
        return <TabPerformance />;
      case 'discord':
        return <TabDiscord />;
      case 'discord-audio':
        return <TabDiscordAudio />;
      case 'message-logger':
        return <TabMessageLogger />;
      case 'telegram':
        return <TabTelegram />;
      case 'tg-profile':
        return <TabTelegramProfile />;
      case 'tg-devices':
        return <TabTelegramDevices />;
      case 'tg-privacy':
        return <TabTelegramPrivacy />;
      case 'tg-blocked':
        return <TabTelegramBlocked />;
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
              onClick={() => { useModalStore.getState().close(modalId); logout(); }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </nav>

        {/* Version info */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground/60">
            {appVersion
              ? `Ignite v${appVersion}`
              : 'Ignite Web'}
          </p>
          {window.IgniteNative?.electronVersion && (
            <p className="text-xs text-muted-foreground/60">
              Electron {window.IgniteNative.electronVersion}
            </p>
          )}
        </div>
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
