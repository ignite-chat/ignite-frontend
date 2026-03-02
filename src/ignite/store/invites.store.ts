import { create } from 'zustand';
import api from '@/ignite/api';

export type InviteGuild = {
  id: string;
  name: string;
  icon_file_id?: string;
  member_count?: number;
  online_count?: number;
};

export type InviteUser = {
  id: string;
  username: string;
  name: string;
  avatar_url?: string | null;
};

export type Invite = {
  code: string;
  guild: InviteGuild;
  user?: InviteUser;
  expires_at?: string;
};

const pendingFetches = new Map<string, Promise<Invite>>();

type InvitesStore = {
  invites: Record<string, Invite>;

  getInvite: (code: string) => Invite | undefined;
  setInvite: (code: string, invite: Invite) => void;
  fetchInvite: (code: string) => Promise<Invite>;
  removeInvite: (code: string) => void;
};

export const useInvitesStore = create<InvitesStore>((set, get) => ({
  invites: {},

  getInvite: (code) => get().invites[code],

  setInvite: (code, invite) =>
    set((state) => ({
      invites: { ...state.invites, [code]: invite },
    })),

  fetchInvite: async (code) => {
    const existing = get().invites[code];
    if (existing) return existing;

    const pending = pendingFetches.get(code);
    if (pending) return pending;

    const promise = api.get(`/invites/${code}`).then(({ data }) => {
      set((state) => ({
        invites: { ...state.invites, [code]: data },
      }));
      pendingFetches.delete(code);
      return data;
    }).catch((err) => {
      pendingFetches.delete(code);
      throw err;
    });
    pendingFetches.set(code, promise);
    return promise;
  },

  removeInvite: (code) =>
    set((state) => {
      const { [code]: _, ...rest } = state.invites;
      return { invites: rest };
    }),
}));
