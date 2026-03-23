import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $getRoot, CLEAR_EDITOR_COMMAND } from 'lexical';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDiscordCommandsStore } from '@/discord/store/discord-commands.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { DiscordService } from '@/discord/services/discord.service';
import { generateNonce } from '@/discord/utils/snowflake';

const SUGGESTIONS_LIMIT = 10;
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

function trackCommandUsage(guildId, commandId) {
  try {
    const data = JSON.parse(localStorage.getItem(FREQUENT_KEY) || '{}');
    if (!data[guildId]) data[guildId] = {};
    data[guildId][commandId] = (data[guildId][commandId] || 0) + 1;
    localStorage.setItem(FREQUENT_KEY, JSON.stringify(data));
  } catch {}
}

class CommandMenuOption extends MenuOption {
  command;
  application;

  constructor(command, application) {
    super(command.id);
    this.command = command;
    this.application = application;
  }
}

export default function SlashCommandPlugin({ channelId, guildId, menuContainer, onStartCommand }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [frequentVersion, setFrequentVersion] = useState(0);
  const fetchGuildCommands = useDiscordCommandsStore((s) => s.fetchGuildCommands);
  const applications = useDiscordCommandsStore((s) => s.applications);
  const guildCommands = useDiscordCommandsStore((s) => guildId ? s.guildCommands[guildId] || [] : []);
  const usersMap = useDiscordUsersStore((s) => s.users);

  // Reset app filter when query changes
  useEffect(() => {
    if (queryString && queryString.length > 0) setSelectedAppId(null);
  }, [queryString]);

  // Fetch commands once per guild when entering a guild channel
  useEffect(() => {
    if (guildId) fetchGuildCommands(guildId);
  }, [guildId, fetchGuildCommands]);

  // Custom trigger: match `/` at position 0, allow hyphens and any word chars in the query
  const triggerFn = useCallback((text) => {
    const match = text.match(/^\/([a-zA-Z0-9_-]*)$/);
    if (!match) return null;
    return {
      leadOffset: 0,
      matchingString: match[1],
      replaceableString: match[0],
    };
  }, []);

  // Unique apps that have commands in this guild
  const uniqueApps = useMemo(() => {
    const appIds = new Set(guildCommands.map((cmd) => cmd.application_id));
    return [...appIds]
      .map((id) => applications[id])
      .filter(Boolean);
  }, [guildCommands, applications]);

  const frequentIds = useMemo(() => guildId ? getFrequentCommands(guildId) : [], [guildId, frequentVersion]);
  const hasFrequent = frequentIds.length > 0;

  const showAppSidebar = queryString !== null && queryString.length === 0 && (uniqueApps.length > 1 || hasFrequent);

  const options = useMemo(() => {
    if (queryString === null) return [];
    const q = queryString.toLowerCase();

    let filtered = guildCommands.filter((cmd) => {
      if (selectedAppId === '__frequent__') return frequentIds.includes(cmd.id);
      if (selectedAppId && cmd.application_id !== selectedAppId) return false;
      return !q || cmd.name?.toLowerCase().includes(q) || (cmd.description || '').toLowerCase().includes(q);
    });

    // Sort frequently used to top when no filter/query
    if (!selectedAppId && !q && hasFrequent) {
      filtered.sort((a, b) => {
        const aIdx = frequentIds.indexOf(a.id);
        const bIdx = frequentIds.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return 0;
      });
    }

    return filtered
      .slice(0, SUGGESTIONS_LIMIT)
      .map((cmd) => new CommandMenuOption(cmd, applications[cmd.application_id]));
  }, [guildCommands, queryString, applications, selectedAppId, frequentIds, hasFrequent]);

  const onSelectOption = useCallback(
    (option, textNodeContainingQuery, closeMenu) => {
      const cmd = option.command;
      const app = option.application;

      // Track usage for "Frequently Used"
      if (guildId) {
        trackCommandUsage(guildId, cmd.id);
        setFrequentVersion((v) => v + 1);
      }

      // Clear the editor
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      closeMenu();

      // If command has required options, show the option input form
      // Otherwise send the interaction immediately
      if (cmd.options && cmd.options.length > 0) {
        onStartCommand?.(cmd, app);
      } else {
        sendSlashCommand(channelId, guildId, cmd, app, []);
      }
    },
    [editor, channelId, guildId, onStartCommand]
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, options: opts }) => {
        if (opts.length === 0 || !menuContainer?.current) return null;

        return createPortal(
          <div className="absolute inset-x-0 bottom-full z-[1005] mb-1 flex max-h-[300px] overflow-hidden rounded bg-[#222327] shadow-lg">
            {/* App sidebar — only when query is empty */}
            {showAppSidebar && (
              <div className="flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/5 p-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSelectedAppId(null)}
                  className={`flex size-11 items-center justify-center rounded-lg transition-colors ${
                    !selectedAppId ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                  }`}
                  title="All"
                >
                  <span className="text-xs font-bold text-gray-300">All</span>
                </button>
                {hasFrequent && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSelectedAppId(selectedAppId === '__frequent__' ? null : '__frequent__')}
                    className={`flex size-11 items-center justify-center rounded-lg transition-colors ${
                      selectedAppId === '__frequent__' ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                    }`}
                    title="Frequently Used"
                  >
                    <svg className="size-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                )}
                {uniqueApps.map((app) => {
                  const botUser = app.bot_id ? usersMap[app.bot_id] : null;
                  const appIconUrl = botUser?.avatar
                    ? DiscordService.getUserAvatarUrl(botUser.id, botUser.avatar, 32)
                    : app.icon
                      ? `https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=32`
                      : app.bot_id
                        ? `https://cdn.discordapp.com/embed/avatars/${(BigInt(app.bot_id) >> 22n) % 6n}.png`
                        : null;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSelectedAppId(app.id === selectedAppId ? null : app.id)}
                      className={`flex size-11 items-center justify-center rounded-lg transition-colors ${
                        selectedAppId === app.id ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                      }`}
                      title={app.name}
                    >
                      {appIconUrl ? (
                        <img src={appIconUrl} alt={app.name} className="size-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-[10px] font-bold text-white">
                          {app.name?.charAt(0)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Command list */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="mb-2 px-2 text-xs font-bold uppercase text-gray-400">
                {selectedAppId === '__frequent__' ? 'Frequently Used' : selectedAppId ? (applications[selectedAppId]?.name || 'Commands') : 'Slash Commands'}
              </div>
              {opts.map((option, i) => {
                const cmd = option.command;
                const app = option.application;
                const botUser = app?.bot_id ? usersMap[app.bot_id] : null;
                const iconUrl = botUser?.avatar
                  ? DiscordService.getUserAvatarUrl(botUser.id, botUser.avatar, 32)
                  : app?.bot?.avatar
                    ? DiscordService.getUserAvatarUrl(app.bot.id, app.bot.avatar, 32)
                    : app?.icon
                      ? `https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=32`
                      : app?.bot_id
                        ? `https://cdn.discordapp.com/embed/avatars/${(BigInt(app.bot_id) >> 22n) % 6n}.png`
                        : null;

                return (
                  <button
                    key={option.key}
                    ref={(el) => option.setRefElement(el)}
                    className={`flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left ${
                      selectedIndex === i ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                    }`}
                    onClick={() => selectOptionAndCleanUp(option)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt={app?.name} className="size-5 shrink-0 rounded" />
                    ) : (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded bg-[#5865f2] text-[10px] font-bold text-white">
                        /
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white">/{cmd.name}</span>
                        {cmd.options?.filter((o) => o.required).map((o) => (
                          <span key={o.name} className="rounded bg-white/10 px-1 py-px text-[10px] text-gray-400">
                            {o.name}
                          </span>
                        ))}
                      </div>
                      <span className="truncate text-xs text-gray-400">{cmd.description}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-500">{app?.name}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          menuContainer.current
        );
      }}
    />
  );
}

/**
 * Send a slash command interaction.
 */
export async function sendSlashCommand(channelId, guildId, command, application, optionValues) {
  const { useDiscordStore } = await import('@/discord/store/discord.store');
  const { DiscordApiService } = await import('@/discord/services/discord-api.service');
  const { useDiscordInteractionsStore } = await import('@/discord/store/discord-interactions.store');

  const sessionId = useDiscordStore.getState().sessionId;
  if (!sessionId) return;

  const nonce = generateNonce();

  // Add pending interaction for UI feedback
  useDiscordInteractionsStore.getState().add({
    nonce,
    channelId,
    commandName: command.name,
    applicationId: command.application_id,
    botName: application?.bot?.username || application?.name || 'Bot',
    botAvatar: application?.bot?.avatar || null,
    botId: application?.bot_id || application?.bot?.id || application?.id || command.application_id,
    appIcon: application?.icon || null,
    appId: application?.id || command.application_id,
    status: 'sending',
    timestamp: new Date().toISOString(),
  });

  const payload = {
    type: 2, // APPLICATION_COMMAND
    application_id: command.application_id,
    channel_id: channelId,
    ...(guildId && { guild_id: guildId }),
    session_id: sessionId,
    data: {
      version: command.version,
      id: command.id,
      name: command.name,
      type: command.type || 1,
      options: optionValues.map((opt) => ({
        type: opt.type,
        name: opt.name,
        value: opt.value,
      })),
      application_command: {
        id: command.id,
        type: command.type || 1,
        application_id: command.application_id,
        version: command.version,
        name: command.name,
        description: command.description,
        options: command.options || [],
        dm_permission: command.dm_permission,
        integration_types: command.integration_types || [0],
        ...(command.global_popularity_rank != null && { global_popularity_rank: command.global_popularity_rank }),
        description_localized: command.description,
        name_localized: command.name,
      },
      attachments: [],
    },
    nonce,
    analytics_location: 'slash_ui',
  };

  try {
    await DiscordApiService.sendInteraction(payload);
  } catch (err) {
    console.error('[Discord] Failed to send slash command interaction:', err);
    useDiscordInteractionsStore.getState().remove(nonce);
  }
}
