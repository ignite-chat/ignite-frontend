import { create } from 'zustand';
import type { GuildFolder } from '../utils/proto-decode';
import { encodeGuildFolders } from '../utils/proto-decode';
import { DiscordApiService } from '../services/discord-api.service';

export type { GuildFolder } from '../utils/proto-decode';

type DiscordGuildFoldersStore = {
  folders: GuildFolder[];

  setFolders: (folders: GuildFolder[]) => void;

  /** Reorder a folder entry from one position to another. */
  reorderFolders: (fromIndex: number, toIndex: number) => void;

  /**
   * Add a guild (dragged) into an existing folder.
   * Removes the guild from its current folder entry first.
   */
  addGuildToFolder: (guildId: string, targetFolderId: string) => void;

  /**
   * Merge two standalone guilds into a new folder.
   * The new folder is placed where the target guild was.
   */
  createFolderFromGuilds: (draggedGuildId: string, targetGuildId: string) => void;

  /**
   * Remove a guild from its folder and place it as a standalone entry
   * at the given position in the folder list.
   */
  removeGuildFromFolder: (guildId: string, insertAtIndex: number) => void;

  /** Reorder guilds within a folder. */
  reorderWithinFolder: (folderId: string, fromGuildId: string, toGuildId: string) => void;

  /** Update a folder's name/color and persist. */
  updateFolder: (folderId: string, updates: { name?: string | null; color?: number | null }) => void;

  /** Delete a folder, ungrouping its guilds into standalone entries. */
  deleteFolder: (folderId: string) => void;

  clear: () => void;
};

// Debounce persist calls to avoid hitting Discord's rate limit during rapid reordering
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistFolders(folders: GuildFolder[]) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const encoded = encodeGuildFolders(folders);
      DiscordApiService.updateSettingsProto(encoded).catch((err) => {
        console.error('[Discord Guild Folders] Failed to persist folder order:', err);
      });
    } catch (err) {
      console.error('[Discord Guild Folders] Failed to encode folders:', err);
    }
  }, 10000);
}

/** Remove a guild from whatever folder entry it's in. Cleans up empty standalone entries. */
function removeGuildFromFolders(folders: GuildFolder[], guildId: string): number {
  for (let i = folders.length - 1; i >= 0; i--) {
    const idx = folders[i].guild_ids.indexOf(guildId);
    if (idx !== -1) {
      folders[i].guild_ids.splice(idx, 1);
      if (folders[i].guild_ids.length === 0) {
        folders.splice(i, 1);
      }
      return i;
    }
  }
  return -1;
}

/** Generate a simple numeric folder id (Discord uses these). */
function generateFolderId(): string {
  return String(Math.floor(Math.random() * 9000000000) + 1000000000);
}

export const useDiscordGuildFoldersStore = create<DiscordGuildFoldersStore>((set, get) => ({
  folders: [],

  setFolders: (folders) => set({ folders }),

  reorderFolders: (fromIndex, toIndex) => {
    const folders = [...get().folders];
    if (fromIndex < 0 || fromIndex >= folders.length || toIndex < 0 || toIndex >= folders.length) return;
    if (fromIndex === toIndex) return;
    const [moved] = folders.splice(fromIndex, 1);
    folders.splice(toIndex, 0, moved);
    set({ folders });
    persistFolders(folders);
  },

  addGuildToFolder: (guildId, targetFolderId) => {
    const folders = get().folders.map((f) => ({ ...f, guild_ids: [...f.guild_ids] }));

    // Don't add if already in that folder
    const targetFolder = folders.find((f) => f.id === targetFolderId);
    if (!targetFolder || targetFolder.guild_ids.includes(guildId)) return;

    removeGuildFromFolders(folders, guildId);
    targetFolder.guild_ids.push(guildId);

    set({ folders });
    persistFolders(folders);
  },

  createFolderFromGuilds: (draggedGuildId, targetGuildId) => {
    if (draggedGuildId === targetGuildId) return;
    const folders = get().folders.map((f) => ({ ...f, guild_ids: [...f.guild_ids] }));

    // Find the target's folder entry index (should be standalone, id === null)
    const targetEntryIdx = folders.findIndex(
      (f) => f.id === null && f.guild_ids.includes(targetGuildId),
    );
    if (targetEntryIdx === -1) return;

    // Remove dragged guild from its current location
    removeGuildFromFolders(folders, draggedGuildId);

    // Replace the target's standalone entry with a new folder containing both
    // Recalc target index since removal may have shifted it
    const newTargetIdx = folders.findIndex(
      (f) => f.id === null && f.guild_ids.includes(targetGuildId),
    );
    if (newTargetIdx === -1) return;

    folders[newTargetIdx] = {
      id: generateFolderId(),
      guild_ids: [targetGuildId, draggedGuildId],
      name: null,
      color: null,
    };

    set({ folders });
    persistFolders(folders);
  },

  reorderWithinFolder: (folderId, fromGuildId, toGuildId) => {
    const folders = get().folders.map((f) => {
      if (f.id !== folderId) return f;
      const guildIds = [...f.guild_ids];
      const fromIdx = guildIds.indexOf(fromGuildId);
      const toIdx = guildIds.indexOf(toGuildId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return f;
      const [moved] = guildIds.splice(fromIdx, 1);
      guildIds.splice(toIdx, 0, moved);
      return { ...f, guild_ids: guildIds };
    });
    set({ folders });
    persistFolders(folders);
  },

  removeGuildFromFolder: (guildId, insertAtIndex) => {
    const folders = get().folders.map((f) => ({ ...f, guild_ids: [...f.guild_ids] }));

    // Check the guild is actually inside a real folder (id !== null)
    const sourceFolder = folders.find((f) => f.id !== null && f.guild_ids.includes(guildId));
    if (!sourceFolder) return;

    removeGuildFromFolders(folders, guildId);

    // Insert as standalone at the requested position
    const clamped = Math.min(insertAtIndex, folders.length);
    folders.splice(clamped, 0, {
      id: null,
      guild_ids: [guildId],
      name: null,
      color: null,
    });

    set({ folders });
    persistFolders(folders);
  },

  updateFolder: (folderId, updates) => {
    const folders = get().folders.map((f) => {
      if (f.id !== folderId) return f;
      return { ...f, ...updates };
    });
    set({ folders });
    persistFolders(folders);
  },

  deleteFolder: (folderId) => {
    const folders: GuildFolder[] = [];
    for (const f of get().folders) {
      if (f.id !== folderId) {
        folders.push(f);
      } else {
        // Ungroup: each guild becomes a standalone entry
        for (const guildId of f.guild_ids) {
          folders.push({ id: null, guild_ids: [guildId], name: null, color: null });
        }
      }
    }
    set({ folders });
    persistFolders(folders);
  },

  clear: () => set({ folders: [] }),
}));
