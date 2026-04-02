import { create } from 'zustand';
import type { DiscordRelationship } from '../types';

// Discord relationship types
export const RelationshipType = {
  FRIEND: 1,
  BLOCKED: 2,
  INCOMING_REQUEST: 3,
  OUTGOING_REQUEST: 4,
} as const;

export type { DiscordRelationship } from '../types';

type DiscordRelationshipsStore = {
  relationships: DiscordRelationship[];

  setRelationships: (relationships: DiscordRelationship[], accountId?: string) => void;
  addRelationship: (relationship: DiscordRelationship) => void;
  removeRelationship: (userId: string) => void;
  updateRelationship: (userId: string, updates: Partial<DiscordRelationship>) => void;
  clearAccount: (accountId: string) => void;

  clear: () => void;
};

export const useDiscordRelationshipsStore = create<DiscordRelationshipsStore>((set) => ({
  relationships: [],

  setRelationships: (relationships, accountId) => {
    if (accountId) {
      const tagged = relationships.map((r) => ({ ...r, _accountId: accountId }));
      set((state) => ({
        relationships: [...state.relationships.filter((r) => (r as any)._accountId !== accountId), ...tagged],
      }));
    } else {
      set({ relationships });
    }
  },

  addRelationship: (relationship) =>
    set((state) => {
      const filtered = state.relationships.filter((r) => r.id !== relationship.id);
      return { relationships: [...filtered, relationship] };
    }),

  removeRelationship: (userId) =>
    set((state) => ({
      relationships: state.relationships.filter((r) => r.id !== userId),
    })),

  updateRelationship: (userId, updates) =>
    set((state) => ({
      relationships: state.relationships.map((r) =>
        r.id === userId ? { ...r, ...updates } : r
      ),
    })),

  clearAccount: (accountId) =>
    set((state) => ({
      relationships: state.relationships.filter((r) => (r as any)._accountId !== accountId),
    })),

  clear: () => set({ relationships: [] }),
}));
