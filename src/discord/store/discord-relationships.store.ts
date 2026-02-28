import { create } from 'zustand';

// Discord relationship types
export const RelationshipType = {
  FRIEND: 1,
  BLOCKED: 2,
  INCOMING_REQUEST: 3,
  OUTGOING_REQUEST: 4,
} as const;

export type DiscordRelationship = {
  id: string; // user ID
  type: number;
  nickname: string | null;
  since?: string | null;
};

type DiscordRelationshipsStore = {
  relationships: DiscordRelationship[];

  setRelationships: (relationships: DiscordRelationship[]) => void;
  addRelationship: (relationship: DiscordRelationship) => void;
  removeRelationship: (userId: string) => void;
  updateRelationship: (userId: string, updates: Partial<DiscordRelationship>) => void;

  clear: () => void;
};

export const useDiscordRelationshipsStore = create<DiscordRelationshipsStore>((set) => ({
  relationships: [],

  setRelationships: (relationships) => set({ relationships }),

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

  clear: () => set({ relationships: [] }),
}));
