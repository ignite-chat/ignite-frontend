import { create } from 'zustand';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordUsersStore } from './discord-users.store';
import { DiscordGatewayService } from '../services/discord-gateway.service';

export type CommandOption = {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  options?: CommandOption[];
  min_value?: number;
  max_value?: number;
  autocomplete?: boolean;
  channel_types?: number[];
};

export type ApplicationCommand = {
  id: string;
  application_id: string;
  name: string;
  description: string;
  type: number;
  version: string;
  options?: CommandOption[];
  dm_permission?: boolean;
  integration_types?: number[];
  global_popularity_rank?: number;
};

export type CommandApplication = {
  id: string;
  name: string;
  icon: string | null;
  bot_id?: string;
  bot?: { id: string; username: string; avatar: string | null };
};

type DiscordCommandsStore = {
  /** Cached commands per guild */
  guildCommands: Record<string, ApplicationCommand[]>;
  /** Application info keyed by application_id */
  applications: Record<string, CommandApplication>;
  /** Track which guilds have been fetched */
  _fetched: Set<string>;
  /** In-flight dedup */
  _inflight: Record<string, Promise<void>>;

  fetchGuildCommands: (guildId: string) => Promise<ApplicationCommand[]>;
  getGuildCommands: (guildId: string) => ApplicationCommand[];
  clear: () => void;
};

export const useDiscordCommandsStore = create<DiscordCommandsStore>((set, get) => ({
  guildCommands: {},
  applications: {},
  _fetched: new Set(),
  _inflight: {},

  fetchGuildCommands: async (guildId) => {
    // Already fetched — return cached
    if (get()._fetched.has(guildId)) {
      return get().guildCommands[guildId] || [];
    }

    // Deduplicate in-flight requests
    const existing = get()._inflight[guildId];
    if (existing) {
      await existing;
      return get().guildCommands[guildId] || [];
    }

    const request = (async () => {
      try {
        const data = await DiscordApiService.getGuildApplicationCommandIndex(guildId);
        const commands: ApplicationCommand[] = data.application_commands || [];
        const apps: Record<string, CommandApplication> = {};
        if (data.applications) {
          for (const app of data.applications) {
            apps[app.id] = app;
          }
        }

        set((state) => {
          const fetched = new Set(state._fetched);
          fetched.add(guildId);
          return {
            guildCommands: { ...state.guildCommands, [guildId]: commands },
            applications: { ...state.applications, ...apps },
            _fetched: fetched,
          };
        });

        // Request bot user data for avatars (for bots not already in the users store)
        const usersStore = useDiscordUsersStore.getState();
        const unknownBotIds = Object.values(apps)
          .map((app) => app.bot_id)
          .filter((id): id is string => !!id && !usersStore.users[id]);
        if (unknownBotIds.length > 0) {
          DiscordGatewayService.requestGuildMembers(guildId, unknownBotIds);
        }
      } catch (err) {
        console.error('[Discord] Failed to fetch guild application commands:', err);
      } finally {
        set((state) => {
          const { [guildId]: _, ...rest } = state._inflight;
          return { _inflight: rest };
        });
      }
    })();

    set((state) => ({ _inflight: { ...state._inflight, [guildId]: request } }));
    await request;
    return get().guildCommands[guildId] || [];
  },

  getGuildCommands: (guildId) => get().guildCommands[guildId] || [],

  clear: () => set({ guildCommands: {}, applications: {}, _fetched: new Set(), _inflight: {} }),
}));
