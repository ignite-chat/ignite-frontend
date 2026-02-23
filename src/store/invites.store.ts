import { create } from 'zustand';
import api from '../api';

type InviteGuild = {
  id: string;
  name: string;
  icon_file_id?: string;
  member_count?: number;
  online_count?: number;
};

type InviteUser = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
};

type Invite = {
  code: string;
  guild: InviteGuild;
  user?: InviteUser;
  expires_at?: string;
  [key: string]: any;
};

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

    const { data } = await api.get(`/invites/${code}`);
    set((state) => ({
      invites: { ...state.invites, [code]: data },
    }));
    return data;
  },

  removeInvite: (code) =>
    set((state) => {
      const { [code]: _, ...rest } = state.invites;
      return { invites: rest };
    }),
}));
