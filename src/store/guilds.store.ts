import { create } from 'zustand';

type GuildsStore = {
  guilds: any[];
  guildMembers: { [guildId: string]: any[] };

  setGuilds: (guilds: any[]) => void;
  setGuildMembers: (guildId: string, members: any[]) => void;

  addGuild: (guild: any) => void;
  editGuild: (guildId: string, updates: Partial<any>) => void;
  editGuildChannel: (guildId: string, channelId: string, updates: Partial<any>) => void;
  removeGuild: (guildId: any) => void;
};

export const useGuildsStore = create<GuildsStore>((set) => ({
  guilds: [],
  guildMembers: {},

  setGuilds: (guilds) => set({ guilds }),
  setGuildMembers: (guildId, members) =>
    set((state) => ({
      guildMembers: {
        ...state.guildMembers,
        [guildId]: members,
      },
    })),

  addGuild: (guild) => set((state) => ({ guilds: [...state.guilds, guild] })),
  editGuild: (guildId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) => (g.id === guildId ? { ...g, ...updates } : g)),
    })),
  editGuildChannel: (guildId, channelId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) => {
        if (g.id == guildId) {
          return {
            ...g,
            channels: g.channels.map((c: any) =>
              c.channel_id == channelId ? { ...c, ...updates } : c
            ),
          };
        }
        return g;
      }),
    })),
  removeGuild: (guildId) => set((state) => ({ guilds: state.guilds.filter((g) => g.id !== guildId) })),
}));
