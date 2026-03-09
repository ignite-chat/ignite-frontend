import { create } from 'zustand';
import type { DiscordMember } from '../types';

export type { DiscordMember } from '../types';

type DiscordMembersStore = {
  /** members[guildId][userId] = DiscordMember */
  members: { [guildId: string]: { [userId: string]: DiscordMember } };

  /** Set all members for a guild (replaces existing) */
  setGuildMembers: (guildId: string, members: DiscordMember[]) => void;

  /** Add or update a single member */
  addMember: (guildId: string, member: DiscordMember) => void;

  /** Add or update multiple members */
  addMembers: (guildId: string, members: DiscordMember[]) => void;

  /** Remove a member from a guild */
  removeMember: (guildId: string, userId: string) => void;

  /** Remove all members for a guild */
  removeGuild: (guildId: string) => void;

  /** Clear all data */
  clear: () => void;
};

const getMemberId = (member: DiscordMember): string | undefined =>
  member.user?.id || member.user_id;

export const useDiscordMembersStore = create<DiscordMembersStore>((set) => ({
  members: {},

  setGuildMembers: (guildId, members) =>
    set((state) => {
      const map: { [userId: string]: DiscordMember } = {};
      for (const m of members) {
        const id = getMemberId(m);
        if (id) map[id] = m;
      }
      return { members: { ...state.members, [guildId]: map } };
    }),

  addMember: (guildId, member) =>
    set((state) => {
      const id = getMemberId(member);
      if (!id) return state;
      const guild = state.members[guildId] || {};
      return {
        members: {
          ...state.members,
          [guildId]: { ...guild, [id]: { ...guild[id], ...member } },
        },
      };
    }),

  addMembers: (guildId, members) =>
    set((state) => {
      const guild = { ...(state.members[guildId] || {}) };
      for (const m of members) {
        const id = getMemberId(m);
        if (id) guild[id] = { ...guild[id], ...m };
      }
      return { members: { ...state.members, [guildId]: guild } };
    }),

  removeMember: (guildId, userId) =>
    set((state) => {
      const guild = state.members[guildId];
      if (!guild || !guild[userId]) return state;
      const { [userId]: _, ...rest } = guild;
      return { members: { ...state.members, [guildId]: rest } };
    }),

  removeGuild: (guildId) =>
    set((state) => {
      const { [guildId]: _, ...rest } = state.members;
      return { members: rest };
    }),

  clear: () => set({ members: {} }),
}));
