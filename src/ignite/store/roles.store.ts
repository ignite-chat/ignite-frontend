import { create } from 'zustand';

export type Role = {
  id: string;
  guild_id: string;
  name: string;
  color: number | null;
  permissions: number;
  position: number;
  hoist: boolean;
  mentionable: boolean;
};

type RolesStore = {
  guildRoles: { [guildId: string]: Role[] };

  setGuildRoles: (guildId: string, roles: Role[]) => void;
};

export const useRolesStore = create<RolesStore>((set) => ({
  guildRoles: {},

  setGuildRoles: (guildId, roles) =>
    set((state) => ({
      guildRoles: {
        ...state.guildRoles,
        [guildId]: roles,
      },
    })),
}));
