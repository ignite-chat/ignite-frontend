import { create } from 'zustand';

export type PendingInteraction = {
  nonce: string;
  channelId: string;
  commandName: string;
  applicationId: string;
  botName: string;
  botAvatar: string | null;
  botId: string;
  /** 'sending' = POST sent, 'thinking' = INTERACTION_CREATE received */
  status: 'sending' | 'thinking';
  timestamp: string;
};

type DiscordInteractionsStore = {
  pending: Record<string, PendingInteraction>; // keyed by nonce
  add: (interaction: PendingInteraction) => void;
  setThinking: (nonce: string) => void;
  remove: (nonce: string) => void;
  removeByChannel: (channelId: string, applicationId: string) => void;
  getForChannel: (channelId: string) => PendingInteraction[];
  clear: () => void;
};

export const useDiscordInteractionsStore = create<DiscordInteractionsStore>((set, get) => ({
  pending: {},

  add: (interaction) =>
    set((state) => ({ pending: { ...state.pending, [interaction.nonce]: interaction } })),

  setThinking: (nonce) =>
    set((state) => {
      const p = state.pending[nonce];
      if (!p) return state;
      return { pending: { ...state.pending, [nonce]: { ...p, status: 'thinking' } } };
    }),

  remove: (nonce) =>
    set((state) => {
      const { [nonce]: _, ...rest } = state.pending;
      return { pending: rest };
    }),

  removeByChannel: (channelId, applicationId) =>
    set((state) => {
      const filtered: Record<string, PendingInteraction> = {};
      for (const [k, v] of Object.entries(state.pending)) {
        if (!(v.channelId === channelId && v.applicationId === applicationId)) {
          filtered[k] = v;
        }
      }
      return { pending: filtered };
    }),

  getForChannel: (channelId) =>
    Object.values(get().pending).filter((p) => p.channelId === channelId),

  clear: () => set({ pending: {} }),
}));
