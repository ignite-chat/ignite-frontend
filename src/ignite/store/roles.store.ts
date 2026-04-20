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

// Drop duplicate roles by id (keeps the last occurrence). Guards against
// payloads — from either the HTTP seed or a gateway replay — that happen
// to ship the same role more than once.
const dedupeById = (roles: Role[]): Role[] => {
  const byId = new Map<string, Role>();
  for (const r of roles) byId.set(String(r.id), r);
  return Array.from(byId.values());
};

export const useRolesStore = create<RolesStore>((set) => ({
  guildRoles: {},

  setGuildRoles: (guildId, roles) =>
    set((state) => ({
      guildRoles: {
        ...state.guildRoles,
        [guildId]: dedupeById(roles),
      },
    })),
}));
