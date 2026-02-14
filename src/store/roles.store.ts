import { create } from 'zustand';

type RolesStore = {
  guildRoles: { [guildId: string]: any[] };

  setGuildRoles: (guildId: string, roles: any[]) => void;
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
