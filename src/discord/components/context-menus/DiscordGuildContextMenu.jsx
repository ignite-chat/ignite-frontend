import { Copy } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  ContextMenuContent,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { Separator } from '@/components/ui/separator';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordReadStatesStore } from '../../store/discord-readstates.store';
import { useDiscordGuildSettingsStore } from '../../store/discord-guild-settings.store';
import { DiscordApiService } from '../../services/discord-api.service';

const RadioIndicator = ({ checked }) => (
  <div className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-[#5865f2] bg-[#5865f2]' : 'border-[#4e5058]'}`}>
    {checked && <div className="size-2 rounded-full bg-white" />}
  </div>
);

const CheckboxIndicator = ({ checked }) => (
  <div className={`flex size-[18px] shrink-0 items-center justify-center rounded-[3px] ${checked ? 'bg-[#5865f2]' : 'border-2 border-[#4e5058]'}`}>
    {checked && (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3.5 7L6 9.5L10.5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </div>
);

const MUTE_DURATIONS = [
  { label: 'For 15 Minutes', seconds: 900 },
  { label: 'For 1 Hour', seconds: 3600 },
  { label: 'For 3 Hours', seconds: 10800 },
  { label: 'For 8 Hours', seconds: 28800 },
  { label: 'For 24 Hours', seconds: 86400 },
  { label: 'Until I turn it back on', seconds: null },
];

const NOTIFICATION_OPTIONS = [
  { label: 'All Messages', value: 0 },
  { label: 'Only @mentions', value: 1 },
  { label: 'Nothing', value: 2 },
];

const updateSettings = (guildId, settings) => {
  useDiscordGuildSettingsStore.getState().updateGuildSettings(guildId, settings);
  DiscordApiService.updateUserGuildSettings(guildId, settings);
};

const DiscordGuildContextMenu = ({ guild }) => {
  const channels = useDiscordChannelsStore((s) => s.channels);
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const guildSettings = useDiscordGuildSettingsStore((s) => s.settings[guild.id]);

  const isMuted = guildSettings?.muted ?? false;
  const messageNotifications = guildSettings?.message_notifications ?? 1;
  const suppressEveryone = guildSettings?.suppress_everyone ?? false;
  const suppressRoles = guildSettings?.suppress_roles ?? false;
  const mobilePush = guildSettings?.mobile_push ?? true;
  const notifyHighlights = guildSettings?.notify_highlights ?? 0;
  const muteScheduledEvents = guildSettings?.mute_scheduled_events ?? false;

  const handleMarkAsRead = () => {
    const guildChannels = channels.filter((c) => c.guild_id === guild.id);

    const unreadEntries = [];
    for (const ch of guildChannels) {
      if (!ch.last_message_id) continue;
      const entry = readStates[ch.id];
      const isUnread = entry?.last_message_id
        ? BigInt(ch.last_message_id) > BigInt(entry.last_message_id)
        : true;

      if (isUnread) {
        unreadEntries.push({ channel_id: ch.id, message_id: ch.last_message_id, read_state_type: 0 });
      }
    }

    if (unreadEntries.length === 0) {
      toast.info('Server is already read.');
      return;
    }

    for (const e of unreadEntries) {
      useDiscordReadStatesStore.getState().ackChannel(e.channel_id, e.message_id);
    }
    DiscordApiService.ackBulk(unreadEntries);
    toast.success('Marked server as read');
  };

  const handleMute = (seconds) => {
    let muteConfig;
    if (seconds === null) {
      muteConfig = { selected_time_window: -1, end_time: null };
    } else {
      const endTime = new Date(Date.now() + seconds * 1000).toISOString();
      muteConfig = { selected_time_window: seconds, end_time: endTime };
    }
    updateSettings(guild.id, { muted: true, mute_config: muteConfig });
  };

  const handleUnmute = () => {
    updateSettings(guild.id, { muted: false, mute_config: null });
  };

  const handleNotificationChange = (value) => {
    updateSettings(guild.id, { message_notifications: value });
  };

  const handleToggle = (key, currentValue) => {
    updateSettings(guild.id, { [key]: !currentValue });
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(guild.id);
    toast.success('Copied Server ID');
  };

  return (
    <ContextMenuContent className="w-56">
      <button
        type="button"
        className="flex w-full items-center rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
        onClick={handleMarkAsRead}
      >
        Mark As Read
      </button>

      <Separator className="my-1 bg-white/5" />

      {isMuted ? (
        <button
          type="button"
          className="flex w-full items-center rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
          onClick={handleUnmute}
        >
          <div className="flex flex-col">
            <span>Unmute Server</span>
            {guildSettings?.mute_config?.end_time && (
              <span className="text-xs font-normal text-gray-400">
                Muted until {new Date(guildSettings.mute_config.end_time).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>
        </button>
      ) : (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5">
            Mute Server
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 p-1.5">
            {MUTE_DURATIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className="flex w-full rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
                onClick={() => handleMute(option.seconds)}
              >
                {option.label}
              </button>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5">
          <div className="flex flex-col">
            <span>Notification Settings</span>
            <span className="text-xs font-normal text-gray-400">
              {NOTIFICATION_OPTIONS.find((o) => o.value === messageNotifications)?.label ?? 'Only @mentions'}
            </span>
          </div>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-68 p-1.5">
          {NOTIFICATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
              onClick={() => handleNotificationChange(option.value)}
            >
              <span>{option.label}</span>
              <RadioIndicator checked={messageNotifications === option.value} />
            </button>
          ))}

          <Separator className="mx-1 my-1.5 bg-white/5" />

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
            onClick={() => handleToggle('suppress_everyone', suppressEveryone)}
          >
            <span>Suppress @everyone and @here</span>
            <CheckboxIndicator checked={suppressEveryone} />
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
            onClick={() => handleToggle('suppress_roles', suppressRoles)}
          >
            <span>Suppress All Role @mentions</span>
            <CheckboxIndicator checked={suppressRoles} />
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
            onClick={() => handleToggle('notify_highlights', notifyHighlights === 0)}
          >
            <span>Suppress Highlights</span>
            <CheckboxIndicator checked={notifyHighlights === 1} />
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
            onClick={() => handleToggle('mute_scheduled_events', muteScheduledEvents)}
          >
            <span>Mute New Events</span>
            <CheckboxIndicator checked={muteScheduledEvents} />
          </button>

          <Separator className="mx-1 my-1.5 bg-white/5" />

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
            onClick={() => handleToggle('mobile_push', mobilePush)}
          >
            <span>Mobile Push Notifications</span>
            <CheckboxIndicator checked={mobilePush} />
          </button>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <Separator className="my-1 bg-white/5" />

      <button
        type="button"
        className="flex w-full items-center rounded p-2 text-left text-sm font-medium text-red-300 hover:bg-white/5"
        onClick={() => toast.info('Leaving Discord servers is not yet supported.')}
      >
        Leave Server
      </button>

      <Separator className="my-1 bg-white/5" />

      <button
        type="button"
        className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
        onClick={handleCopyId}
      >
        <span>Copy Server ID</span>
        <Copy className="ml-2 size-[18px]" />
      </button>
    </ContextMenuContent>
  );
};

export default DiscordGuildContextMenu;
