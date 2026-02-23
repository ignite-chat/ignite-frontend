import { Bell, BellSlash, Lock, ArrowLeft, Check, SignOut } from '@phosphor-icons/react';
import { Separator } from '@/components/ui/separator';
import { GuildSettingsService } from '@/services/guild-settings.service';
import { useNotificationStore } from '@/store/notification.store';

const MUTE_DURATIONS = [
  { label: 'For 15 Minutes', minutes: 15 },
  { label: 'For 1 Hour', minutes: 60 },
  { label: 'For 3 Hours', minutes: 180 },
  { label: 'For 8 Hours', minutes: 480 },
  { label: 'For 24 Hours', minutes: 1440 },
  { label: 'Until I turn it back on', minutes: null },
];

const GuildMenuContent = ({ guild, view, setView, topContent, bottomContent, onLeave }) => {
  const { guildSettings } = useNotificationStore();
  const settings = guildSettings[guild?.id] || {};
  const isMuted = settings.muted_until === 'forever' ||
    (settings.muted_until && new Date(settings.muted_until) > new Date());

  const handleMute = (minutes) => {
    let muted_until;
    if (minutes === null) {
      muted_until = 'forever';
    } else {
      const date = new Date();
      date.setMinutes(date.getMinutes() + minutes);
      muted_until = date.toISOString();
    }
    GuildSettingsService.updateGuildSettings(guild.id, { muted_until });
    setView('main');
  };

  const handleUnmute = () => {
    GuildSettingsService.updateGuildSettings(guild.id, { muted_until: null });
  };

  const handleNotificationChange = (value) => {
    GuildSettingsService.updateGuildSettings(guild.id, { message_notifications: Number(value) });
  };

  const handleToggleSuppressEveryone = () => {
    GuildSettingsService.updateGuildSettings(guild.id, {
      suppress_everyone: !settings.suppress_everyone,
    });
  };

  const handleToggleSuppressRoles = () => {
    GuildSettingsService.updateGuildSettings(guild.id, {
      suppress_roles: !settings.suppress_roles,
    });
  };

  if (view === 'mute') {
    return (
      <>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
          onClick={() => setView('main')}
        >
          <ArrowLeft className="size-4" />
          <span>Mute Server</span>
        </button>
        <Separator className="my-1 bg-white/5" />
        {MUTE_DURATIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className="flex w-full rounded p-2 text-left text-sm text-gray-300 hover:bg-white/5"
            onClick={() => handleMute(option.minutes)}
          >
            {option.label}
          </button>
        ))}
      </>
    );
  }

  if (view === 'notifications') {
    return (
      <>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
          onClick={() => setView('main')}
        >
          <ArrowLeft className="size-4" />
          <span>Notification Settings</span>
        </button>
        <Separator className="my-1 bg-white/5" />

        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Message Notifications
        </div>
        {[
          { label: 'All Messages', value: 0 },
          { label: 'Only @mentions', value: 1 },
          { label: 'Nothing', value: 2 },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            className="flex w-full items-center justify-between rounded p-2 text-left text-sm text-gray-300 hover:bg-white/5"
            onClick={() => handleNotificationChange(option.value)}
          >
            <span>{option.label}</span>
            {(settings.message_notifications ?? 0) === option.value && (
              <Check className="size-4 text-green-400" />
            )}
          </button>
        ))}

        <Separator className="my-1 bg-white/5" />

        <button
          type="button"
          className="flex w-full items-center justify-between rounded p-2 text-left text-sm text-gray-300 hover:bg-white/5"
          onClick={handleToggleSuppressEveryone}
        >
          <span>Suppress @everyone and @here</span>
          {settings.suppress_everyone && <Check className="size-4 text-green-400" />}
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded p-2 text-left text-sm text-gray-300 hover:bg-white/5"
          onClick={handleToggleSuppressRoles}
        >
          <span>Suppress Role Mentions</span>
          {settings.suppress_roles && <Check className="size-4 text-green-400" />}
        </button>
      </>
    );
  }

  return (
    <>
      {topContent}

      {isMuted ? (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
          onClick={handleUnmute}
        >
          <span>Unmute Server</span>
          <Bell className="ml-2 size-4" />
        </button>
      ) : (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
          onClick={() => setView('mute')}
        >
          <span>Mute Server</span>
          <BellSlash className="ml-2 size-4" />
        </button>
      )}

      <button
        type="button"
        className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
        onClick={() => setView('notifications')}
      >
        <span>Notification Settings</span>
        <Bell className="ml-2 size-4" />
      </button>

      <button
        type="button"
        className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-400 hover:bg-white/5 disabled:cursor-not-allowed"
        disabled
      >
        <span>Privacy Settings</span>
        <Lock className="ml-2 size-4" />
      </button>

      {bottomContent}

      <Separator className="my-1 bg-white/5" />

      <button
        type="button"
        className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-red-300 hover:bg-white/5"
        onClick={onLeave}
      >
        <span>Leave Server</span>
        <SignOut className="ml-2 size-4" />
      </button>
    </>
  );
};

export default GuildMenuContent;
