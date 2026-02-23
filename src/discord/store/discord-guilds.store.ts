import { create } from 'zustand';

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner_id?: string;
  permissions?: string;
  channels?: DiscordChannel[];
  [key: string]: any;
};

type DiscordChannel = {
  id: string;
  type: number;
  guild_id?: string;
  name?: string;
  position?: number;
  parent_id?: string | null;
  topic?: string | null;
  last_message_id?: string | null;
  [key: string]: any;
};

type DiscordMember = {
  user?: {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
  [key: string]: any;
};

type DiscordGuildsStore = {
  guilds: DiscordGuild[];
  guildMembers: { [guildId: string]: DiscordMember[] };

  setGuilds: (guilds: DiscordGuild[]) => void;
  addGuild: (guild: DiscordGuild) => void;
  updateGuild: (guildId: string, updates: Partial<DiscordGuild>) => void;
  removeGuild: (guildId: string) => void;
  setGuildMembers: (guildId: string, members: DiscordMember[]) => void;
  clear: () => void;
};

export const useDiscordGuildsStore = create<DiscordGuildsStore>((set) => ({
  guilds: [],
  guildMembers: {},

  setGuilds: (guilds) => set({ guilds }),

  addGuild: (guild) =>
    set((state) => {
      const exists = state.guilds.some((g) => g.id === guild.id);
      if (exists) {
        return {
          guilds: state.guilds.map((g) => (g.id === guild.id ? { ...g, ...guild } : g)),
        };
      }
      return { guilds: [...state.guilds, guild] };
    }),

  updateGuild: (guildId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) => (g.id === guildId ? { ...g, ...updates } : g)),
    })),

  removeGuild: (guildId) =>
    set((state) => ({
      guilds: state.guilds.filter((g) => g.id !== guildId),
      guildMembers: Object.fromEntries(
        Object.entries(state.guildMembers).filter(([id]) => id !== guildId)
      ),
    })),

  setGuildMembers: (guildId, members) =>
    set((state) => ({
      guildMembers: { ...state.guildMembers, [guildId]: members },
    })),

  clear: () => set({ guilds: [], guildMembers: {} }),
}));
