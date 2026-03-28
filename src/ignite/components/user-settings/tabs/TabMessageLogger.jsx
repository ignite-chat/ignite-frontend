import { useState, useMemo } from 'react';
import { MagnifyingGlass, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useDiscordMessageLogStore } from '@/discord/store/discord-message-log.store';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordGuildsStore } from '@/discord/store/discord-guilds.store';
import { DiscordMessageLogService } from '@/discord/services/discord-message-log.service';

const CHANNEL_TYPES_WITH_MESSAGES = [0, 2, 5, 10, 11, 12, 13, 15];

const TabMessageLogger = () => {
  const settings = useDiscordMessageLogStore((s) => s.settings);
  const {
    setEnabled,
    setLogAllChannels,
    setPermanentStorage,
    setStoreImages,
    setExcludeLargeGuilds,
    setChannelConfig,
    removeChannelConfig,
    clearAllLogs,
  } = useDiscordMessageLogStore();

  const channels = useDiscordChannelsStore((s) => s.channels);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const [search, setSearch] = useState('');

  const isElectron = !!window.IgniteNative;

  const guildChannels = useMemo(() => {
    const filtered = channels.filter(
      (c) =>
        CHANNEL_TYPES_WITH_MESSAGES.includes(c.type) &&
        c.guild_id &&
        c.name?.toLowerCase().includes(search.toLowerCase()),
    );
    const grouped = {};
    for (const ch of filtered) {
      const guild = guilds.find((g) => g.id === ch.guild_id);
      const guildName = guild?.properties?.name || guild?.name || ch.guild_id;
      if (!grouped[ch.guild_id]) {
        grouped[ch.guild_id] = { name: guildName, channels: [] };
      }
      grouped[ch.guild_id].channels.push(ch);
    }
    return grouped;
  }, [channels, guilds, search]);

  const handleClearAll = async () => {
    clearAllLogs();
    await DiscordMessageLogService.clearPersistedData();
    toast.success('All message logs cleared.');
  };

  if (!isElectron) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Message Logger</h2>
          <p className="mt-1 text-sm text-gray-400">
            Capture deleted and edited messages before they are lost.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
          <p className="font-medium text-gray-200">Electron app required</p>
          <p className="mt-1 text-sm text-gray-400">
            Message logging is only available in the Ignite desktop app. Download it to use this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Message Logger</h2>
        <p className="mt-1 text-sm text-gray-400">
          Capture deleted and edited messages before they are lost.
        </p>
      </div>

      {/* General settings */}
      <div className="space-y-4">
        <SettingRow
          label="Enable Message Logger"
          description="Capture deleted and edited messages before they are lost"
        >
          <Switch
            checked={settings.enabled}
            onCheckedChange={setEnabled}
          />
        </SettingRow>

        <SettingRow
          label="Exclude Large Guilds"
          description="Skip logging in servers with 250+ members (Discord's 'large' flag). Recommended to avoid noise and memory usage."
        >
          <Switch
            checked={settings.excludeLargeGuilds}
            onCheckedChange={setExcludeLargeGuilds}
            disabled={!settings.enabled}
          />
        </SettingRow>

        <SettingRow
          label="Log All Channels"
          description="When enabled, all channels are logged by default. You can exclude specific channels below."
        >
          <Switch
            checked={settings.logAllChannels}
            onCheckedChange={setLogAllChannels}
            disabled={!settings.enabled}
          />
        </SettingRow>

        <SettingRow
          label="Permanent Storage"
          description={
            isElectron
              ? 'Persist logs to disk so they survive app restarts'
              : 'Persist logs to browser storage (IndexedDB) so they survive page reloads'
          }
        >
          <Switch
            checked={settings.permanentStorage}
            onCheckedChange={setPermanentStorage}
            disabled={!settings.enabled}
          />
        </SettingRow>

        <SettingRow
          label="Store Images & Attachments"
          description={
            isElectron
              ? 'Download and save attachments from deleted messages to your local files'
              : 'Download and save attachments to browser storage (Electron recommended for large files)'
          }
        >
          <Switch
            checked={settings.storeImages}
            onCheckedChange={setStoreImages}
            disabled={!settings.enabled || (!isElectron && !settings.permanentStorage)}
          />
        </SettingRow>

        {!isElectron && (
          <p className="text-xs text-gray-500">
            Note: On web, only messages are stored in memory. Use the Electron app for file-based
            attachment storage.
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
          <div>
            <p className="font-medium text-gray-200">Clear All Logs</p>
            <p className="text-sm text-gray-400">
              Remove all logged messages and saved attachments
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 rounded bg-[#da373c] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#a12d31]"
          >
            <Trash size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Channel configuration */}
      <div>
        <h3 className="mb-2 text-base font-semibold text-white">Channel Configuration</h3>
        <p className="mb-3 text-xs text-gray-400">
          {settings.logAllChannels
            ? 'All channels are logged by default. Toggle off specific channels to exclude them.'
            : 'No channels are logged by default. Toggle on specific channels to include them.'}
        </p>

        <div className="flex items-center rounded-lg bg-white/5 px-3">
          <MagnifyingGlass size={16} className="shrink-0 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full bg-transparent px-2 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
          />
        </div>

        <div className="mt-3 space-y-4">
          {Object.entries(guildChannels).map(([guildId, group]) => (
            <div key={guildId}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                {group.name}
              </p>
              <div className="space-y-0.5">
                {group.channels
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((ch) => {
                    const config = settings.channelConfigs[ch.id];
                    const isLogged = config ? config.enabled : settings.logAllChannels;
                    return (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between rounded px-2 py-1 hover:bg-white/5"
                      >
                        <span className="text-sm text-gray-300">
                          <span className="text-gray-500">#</span> {ch.name}
                        </span>
                        <Switch
                          checked={isLogged}
                          onCheckedChange={(checked) => {
                            if (
                              (settings.logAllChannels && !checked) ||
                              (!settings.logAllChannels && checked)
                            ) {
                              setChannelConfig({
                                channelId: ch.id,
                                guildId: ch.guild_id || null,
                                channelName: ch.name || ch.id,
                                enabled: checked,
                              });
                            } else {
                              removeChannelConfig(ch.id);
                            }
                          }}
                          disabled={!settings.enabled}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
          {Object.keys(guildChannels).length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              {search ? 'No channels match your search.' : 'No channels available.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingRow = ({ label, description, children }) => (
  <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
    <div className="min-w-0">
      <p className="font-medium text-gray-200">{label}</p>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default TabMessageLogger;
