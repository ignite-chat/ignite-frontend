import { create } from 'zustand';
import type { VoiceState } from '../types';

type DiscordVoiceStatesStore = {
  /** voice states keyed by guild_id -> user_id -> VoiceState */
  voiceStates: Record<string, Record<string, VoiceState>>;
  /** Set initial voice states for a guild (from READY / GUILD_CREATE) */
  setGuildVoiceStates: (guildId: string, states: VoiceState[]) => void;
  /** Update a single voice state (from VOICE_STATE_UPDATE) */
  updateVoiceState: (state: VoiceState) => void;
  /** Batch update voice states (from VOICE_STATE_UPDATE_BATCH) */
  updateVoiceStateBatch: (states: VoiceState[]) => void;
  /** Remove all voice states for a guild */
  removeGuild: (guildId: string) => void;
  /** Get all voice states for a specific channel */
  getChannelVoiceStates: (guildId: string, channelId: string) => VoiceState[];
};

function applyVoiceState(
  guildStates: Record<string, VoiceState>,
  state: VoiceState
): Record<string, VoiceState> {
  const updated = { ...guildStates };
  if (!state.channel_id) {
    // User left voice
    delete updated[state.user_id];
  } else {
    updated[state.user_id] = state;
  }
  return updated;
}

export const useDiscordVoiceStatesStore = create<DiscordVoiceStatesStore>((set, get) => ({
  voiceStates: {},

  setGuildVoiceStates: (guildId, states) =>
    set((s) => {
      const guildStates: Record<string, VoiceState> = {};
      for (const vs of states) {
        if (vs.channel_id) {
          guildStates[vs.user_id] = vs;
        }
      }
      return { voiceStates: { ...s.voiceStates, [guildId]: guildStates } };
    }),

  updateVoiceState: (state) =>
    set((s) => {
      const guildId = state.guild_id;
      const guildStates = s.voiceStates[guildId] || {};
      return {
        voiceStates: {
          ...s.voiceStates,
          [guildId]: applyVoiceState(guildStates, state),
        },
      };
    }),

  updateVoiceStateBatch: (states) =>
    set((s) => {
      const updated = { ...s.voiceStates };
      for (const state of states) {
        const guildId = state.guild_id;
        updated[guildId] = applyVoiceState(updated[guildId] || {}, state);
      }
      return { voiceStates: updated };
    }),

  removeGuild: (guildId) =>
    set((s) => {
      const { [guildId]: _, ...rest } = s.voiceStates;
      return { voiceStates: rest };
    }),

  getChannelVoiceStates: (guildId, channelId) => {
    const guildStates = get().voiceStates[guildId] || {};
    return Object.values(guildStates).filter((vs) => vs.channel_id === channelId);
  },
}));
