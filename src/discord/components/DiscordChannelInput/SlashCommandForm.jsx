import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { X } from '@phosphor-icons/react';
import { DiscordService } from '../../services/discord.service';
import { useDiscordUsersStore } from '../../store/discord-users.store';
import { useDiscordCommandsStore } from '../../store/discord-commands.store';
import { sendSlashCommand } from './plugins/SlashCommandPlugin';

const OPTION_TYPE_PLACEHOLDER = {
  3: 'Enter text...',
  4: 'Enter a number...',
  5: 'true or false',
  6: 'Enter user ID...',
  7: 'Enter channel ID...',
  8: 'Enter role ID...',
  9: 'Enter ID...',
  10: 'Enter a number...',
};

const FREQUENT_KEY = 'discord_frequent_commands';
const FREQUENT_LIMIT = 5;

function getFrequentCommands(guildId) {
  try {
    const data = JSON.parse(localStorage.getItem(FREQUENT_KEY) || '{}');
    const guild = data[guildId] || {};
    return Object.entries(guild)
      .sort(([, a], [, b]) => b - a)
      .slice(0, FREQUENT_LIMIT)
      .map(([id]) => id);
  } catch { return []; }
}

function resolveAppIcon(app, botUser) {
  if (botUser?.avatar) return DiscordService.getUserAvatarUrl(botUser.id, botUser.avatar, 32);
  if (app?.bot?.avatar) return DiscordService.getUserAvatarUrl(app.bot.id, app.bot.avatar, 32);
  if (app?.icon) return `https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=32`;
  if (app?.bot_id) return `https://cdn.discordapp.com/embed/avatars/${(BigInt(app.bot_id) >> 22n) % 6n}.png`;
  return null;
}

export default function SlashCommandForm({ command, application, channelId, guildId, onClose, onSwitchCommand }) {
  const options = command.options || [];
  const [values, setValues] = useState(() =>
    Object.fromEntries(options.map((o) => [o.name, '']))
  );
  const firstInputRef = useRef(null);
  const usersMap = useDiscordUsersStore((s) => s.users);
  const guildCommands = useDiscordCommandsStore((s) => guildId ? s.guildCommands[guildId] || [] : []);
  const storeApplications = useDiscordCommandsStore((s) => s.applications);
  const [selectedAppId, setSelectedAppId] = useState(null);

  // Reset values when command changes
  useEffect(() => {
    setValues(Object.fromEntries((command.options || []).map((o) => [o.name, ''])));
  }, [command.id]);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, [command.id]);

  const botUser = application?.bot_id ? usersMap[application.bot_id] : null;
  const iconUrl = resolveAppIcon(application, botUser);

  // Unique apps for sidebar
  const uniqueApps = useMemo(() => {
    const appIds = new Set(guildCommands.map((cmd) => cmd.application_id));
    return [...appIds].map((id) => storeApplications[id]).filter(Boolean);
  }, [guildCommands, storeApplications]);

  const frequentIds = useMemo(() => guildId ? getFrequentCommands(guildId) : [], [guildId]);
  const hasFrequent = frequentIds.length > 0;
  const showSidebar = uniqueApps.length > 1 || hasFrequent;

  // Filtered commands for quick-switch list
  const filteredCommands = useMemo(() => {
    if (!selectedAppId) return [];
    return guildCommands
      .filter((cmd) => {
        if (selectedAppId === '__frequent__') return frequentIds.includes(cmd.id);
        return cmd.application_id === selectedAppId;
      })
      .slice(0, 10);
  }, [guildCommands, selectedAppId, frequentIds]);

  const handleSubmit = useCallback(() => {
    const missing = options.filter((o) => o.required && !values[o.name]);
    if (missing.length > 0) return;

    const optionValues = options
      .filter((o) => values[o.name] !== '')
      .map((o) => {
        let value = values[o.name];
        if (o.type === 4) value = parseInt(value, 10);
        else if (o.type === 10) value = parseFloat(value);
        else if (o.type === 5) value = value === 'true';
        return { type: o.type, name: o.name, value };
      });

    sendSlashCommand(channelId, guildId, command, application, optionValues);
    onClose();
  }, [command, application, channelId, guildId, options, values, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

  const handleSelectCommand = useCallback((cmd) => {
    const app = storeApplications[cmd.application_id];
    if (cmd.options && cmd.options.length > 0) {
      onSwitchCommand?.(cmd, app);
    } else {
      sendSlashCommand(channelId, guildId, cmd, app, []);
      onClose();
    }
    setSelectedAppId(null);
  }, [storeApplications, onSwitchCommand, channelId, guildId, onClose]);

  return (
    <div className="flex border-b border-white/5 bg-discord-secondary">
      {/* App sidebar */}
      {showSidebar && (
        <div className="flex w-14 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/5 p-1.5">
          <button
            type="button"
            onClick={() => setSelectedAppId(null)}
            className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
              !selectedAppId ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
            }`}
            title="Current"
          >
            <span className="text-[10px] font-bold text-gray-300">/</span>
          </button>
          {hasFrequent && (
            <button
              type="button"
              onClick={() => setSelectedAppId(selectedAppId === '__frequent__' ? null : '__frequent__')}
              className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
                selectedAppId === '__frequent__' ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
              }`}
              title="Frequently Used"
            >
              <svg className="size-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          )}
          {uniqueApps.map((app) => {
            const bu = app.bot_id ? usersMap[app.bot_id] : null;
            const appIcon = resolveAppIcon(app, bu);
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedAppId(app.id === selectedAppId ? null : app.id)}
                className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
                  selectedAppId === app.id ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                }`}
                title={app.name}
              >
                {appIcon ? (
                  <img src={appIcon} alt={app.name} className="size-7 rounded-full object-cover" />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#5865f2] text-[9px] font-bold text-white">
                    {app.name?.charAt(0)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Command quick-switch list when an app is selected in sidebar */}
        {selectedAppId && filteredCommands.length > 0 ? (
          <div className="flex max-h-[200px] flex-col gap-0.5 overflow-y-auto">
            <div className="mb-1 text-xs font-bold uppercase text-gray-400">
              {selectedAppId === '__frequent__' ? 'Frequently Used' : storeApplications[selectedAppId]?.name || 'Commands'}
            </div>
            {filteredCommands.map((cmd) => {
              const app = storeApplications[cmd.application_id];
              const bu = app?.bot_id ? usersMap[app.bot_id] : null;
              const cmdIcon = resolveAppIcon(app, bu);
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => handleSelectCommand(cmd)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${
                    cmd.id === command.id ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                  }`}
                >
                  {cmdIcon ? (
                    <img src={cmdIcon} alt={app?.name} className="size-4 shrink-0 rounded" />
                  ) : (
                    <div className="flex size-4 shrink-0 items-center justify-center rounded bg-[#5865f2] text-[8px] font-bold text-white">/</div>
                  )}
                  <span className="font-medium text-gray-200">/{cmd.name}</span>
                  <span className="truncate text-xs text-gray-500">{cmd.description}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Current command header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {iconUrl ? (
                  <img src={iconUrl} alt={application?.name} className="size-5 rounded" />
                ) : (
                  <div className="flex size-5 items-center justify-center rounded bg-[#5865f2] text-[10px] font-bold text-white">/</div>
                )}
                <span className="text-sm font-medium text-white">/{command.name}</span>
                <span className="text-xs text-gray-400">{application?.name}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* Option inputs */}
            <div className="flex flex-wrap gap-2">
              {options.map((opt, i) => (
                <div key={opt.name} className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-400">
                    {opt.name}
                    {opt.required && <span className="text-red-400">*</span>}
                  </label>
                  {opt.choices && opt.choices.length > 0 ? (
                    <select
                      ref={i === 0 ? firstInputRef : undefined}
                      value={values[opt.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [opt.name]: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="h-7 rounded border border-white/10 bg-[#1e1f22] px-2 text-xs text-gray-200 outline-none focus:border-[#5865f2]"
                    >
                      <option value="">Select...</option>
                      {opt.choices.map((c) => (
                        <option key={c.value} value={c.value}>{c.name}</option>
                      ))}
                    </select>
                  ) : opt.type === 5 ? (
                    <select
                      ref={i === 0 ? firstInputRef : undefined}
                      value={values[opt.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [opt.name]: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="h-7 rounded border border-white/10 bg-[#1e1f22] px-2 text-xs text-gray-200 outline-none focus:border-[#5865f2]"
                    >
                      <option value="">Select...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      ref={i === 0 ? firstInputRef : undefined}
                      type={opt.type === 4 || opt.type === 10 ? 'number' : 'text'}
                      value={values[opt.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [opt.name]: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      placeholder={OPTION_TYPE_PLACEHOLDER[opt.type] || 'Enter value...'}
                      className="h-7 w-32 rounded border border-white/10 bg-[#1e1f22] px-2 text-xs text-gray-200 outline-none placeholder:text-gray-500 focus:border-[#5865f2]"
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleSubmit}
                className="h-7 rounded bg-[#5865f2] px-3 text-xs font-medium text-white transition-colors hover:bg-[#4752c4]"
              >
                Send
              </button>
            </div>

            {command.description && (
              <p className="mt-1.5 text-[11px] text-gray-500">{command.description}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
