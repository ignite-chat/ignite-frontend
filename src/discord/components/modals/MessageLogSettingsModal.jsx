import { useState, useMemo } from 'react';
import { X, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useModalStore } from '@/store/modal.store';
import { useDiscordMessageLogStore } from '../../store/discord-message-log.store';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordGuildsStore } from '../../store/discord-guilds.store';
import { DiscordMessageLogService } from '../../services/discord-message-log.service';

const CHANNEL_TYPES_WITH_MESSAGES = [0, 2, 5, 10, 11, 12, 13, 15];

const MessageLogSettingsModal = ({ modalId }) => {
  const onClose = () => useModalStore.getState().close(modalId);
  const settings = useDiscordMessageLogStore((s) => s.settings);
  const {
    setEnabled,
    setLogAllChannels,
    setPermanentStorage,
    setStoreImages,
    setChannelConfig,
    removeChannelConfig,
    clearAllLogs,
  } = useDiscordMessageLogStore();

  const channels = useDiscordChannelsStore((s) => s.channels);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('general');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-[#1e1f22] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Message Logger</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'general'
              ? 'border-b-2 border-[#5865f2] text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'channels'
              ? 'border-b-2 border-[#5865f2] text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Channels
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'general' && (
          <div className="space-y-5">
            {/* Master toggle */}
            <SettingRow
              label="Enable Message Logger"
              description="Capture deleted and edited messages before they are lost"
            >
              <Switch
                checked={settings.enabled}
                onCheckedChange={setEnabled}
                className="data-[state=checked]:bg-[#248046] data-[state=unchecked]:bg-[#4e5058]"
              />
            </SettingRow>

            <div className="h-px bg-white/5" />

            {/* Log all channels */}
            <SettingRow
              label="Log All Channels"
              description="When enabled, all channels are logged by default. You can exclude specific channels in the Channels tab."
            >
              <Switch
                checked={settings.logAllChannels}
                onCheckedChange={setLogAllChannels}
                disabled={!settings.enabled}
                className="data-[state=checked]:bg-[#248046] data-[state=unchecked]:bg-[#4e5058]"
              />
            </SettingRow>

            <div className="h-px bg-white/5" />

            {/* Permanent storage */}
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
                className="data-[state=checked]:bg-[#248046] data-[state=unchecked]:bg-[#4e5058]"
              />
            </SettingRow>

            <div className="h-px bg-white/5" />

            {/* Store images */}
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
                className="data-[state=checked]:bg-[#248046] data-[state=unchecked]:bg-[#4e5058]"
              />
            </SettingRow>

            {!isElectron && (
              <p className="text-xs text-gray-500">
                Note: On web, only messages are stored in memory. Use the Electron app for file-based
                attachment storage.
              </p>
            )}

            <div className="h-px bg-white/5" />

            {/* Clear logs */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Clear All Logs</p>
                <p className="text-xs text-gray-500">
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
        )}

        {activeTab === 'channels' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {settings.logAllChannels
                ? 'All channels are logged by default. Toggle off specific channels to exclude them.'
                : 'No channels are logged by default. Toggle on specific channels to include them.'}
            </p>

            {/* Search */}
            <div className="flex items-center rounded bg-[#111214] px-2">
              <MagnifyingGlass size={16} className="shrink-0 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none"
              />
            </div>

            {/* Channel list grouped by guild */}
            <div className="space-y-4">
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
                              className="data-[state=checked]:bg-[#248046] data-[state=unchecked]:bg-[#4e5058]"
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
        )}
      </div>
      </div>
    </div>
  );
};

const SettingRow = ({ label, description, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-200">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default MessageLogSettingsModal;
