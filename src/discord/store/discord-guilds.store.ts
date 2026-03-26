import { create } from 'zustand';
import type { DiscordGuild, DiscordChannel, DiscordMember } from '../types';

type DiscordGuildsStore = {
  guilds: DiscordGuild[];
  guildMembers: { [guildId: string]: DiscordMember[] };

  setGuilds: (guilds: DiscordGuild[], accountId?: string) => void;
  addGuild: (guild: DiscordGuild) => void;
  updateGuild: (guildId: string, updates: Partial<DiscordGuild>) => void;
  removeGuild: (guildId: string) => void;
  setGuildMembers: (guildId: string, members: DiscordMember[]) => void;
  addGuildMembers: (guildId: string, members: DiscordMember[]) => void;
  clearAccount: (accountId: string) => void;
  clear: () => void;
};

export const useDiscordGuildsStore = create<DiscordGuildsStore>((set) => ({
  guilds: [],
  guildMembers: {},

  setGuilds: (guilds, accountId) => {
    if (accountId) {
      // Replace only this account's guilds, keep others
      const tagged = guilds.map((g) => ({ ...g, _accountId: accountId }));
      set((state) => ({
        guilds: [...state.guilds.filter((g) => g._accountId !== accountId), ...tagged],
      }));
    } else {
      set({ guilds });
    }
  },

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
        Object.entries(state.guildMembers).filter(([id]) => id !== guildId),
      ),
    })),

  setGuildMembers: (guildId, members) =>
    set((state) => ({
      guildMembers: { ...state.guildMembers, [guildId]: members },
    })),

  addGuildMembers: (guildId, members) =>
    set((state) => {
      const existing = state.guildMembers[guildId] || [];
      const merged = [...existing];
      for (const member of members) {
        const userId = member.user?.id || (member as any).user_id;
        if (!userId) continue;
        const idx = merged.findIndex((m) => (m.user?.id || (m as any).user_id) === userId);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...member };
        } else {
          merged.push(member);
        }
      }
      return { guildMembers: { ...state.guildMembers, [guildId]: merged } };
    }),

  clearAccount: (accountId) =>
    set((state) => {
      const removedGuildIds = new Set(
        state.guilds.filter((g) => g._accountId === accountId).map((g) => g.id),
      );
      return {
        guilds: state.guilds.filter((g) => g._accountId !== accountId),
        guildMembers: Object.fromEntries(
          Object.entries(state.guildMembers).filter(([id]) => !removedGuildIds.has(id)),
        ),
      };
    }),

  clear: () => set({ guilds: [], guildMembers: {} }),
}));
