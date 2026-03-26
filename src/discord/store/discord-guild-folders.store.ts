import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { GuildFolder } from '../utils/proto-decode';
import { encodeGuildFolders } from '../utils/proto-decode';
import { DiscordApiService } from '../services/discord-api.service';

export type { GuildFolder } from '../utils/proto-decode';

type DiscordGuildFoldersStore = {
  /** All folders from all accounts, keyed by account user ID */
  foldersByAccount: Record<string, GuildFolder[]>;

  /** Flat convenience getter — all folders concatenated (for backward compat) */
  folders: GuildFolder[];

  setFolders: (folders: GuildFolder[], accountId?: string) => void;

  /** Reorder a folder entry from one position to another. */
  reorderFolders: (fromIndex: number, toIndex: number, accountId?: string) => void;

  /**
   * Add a guild (dragged) into an existing folder.
   * Removes the guild from its current folder entry first.
   */
  addGuildToFolder: (guildId: string, targetFolderId: string, nearGuildId?: string, position?: 'before' | 'after', accountId?: string) => void;

  /**
   * Merge two standalone guilds into a new folder.
   * The new folder is placed where the target guild was.
   */
  createFolderFromGuilds: (draggedGuildId: string, targetGuildId: string, accountId?: string) => void;

  /**
   * Remove a guild from its folder and place it as a standalone entry
   * at the given position in the folder list.
   */
  removeGuildFromFolder: (guildId: string, insertAtIndex: number, accountId?: string) => void;

  /** Reorder guilds within a folder. */
  reorderWithinFolder: (folderId: string, fromGuildId: string, toGuildId: string, position?: 'before' | 'after', accountId?: string) => void;

  /** Update a folder's name/color and persist. */
  updateFolder: (folderId: string, updates: { name?: string | null; color?: number | null }, accountId?: string) => void;

  /** Delete a folder, ungrouping its guilds into standalone entries. */
  deleteFolder: (folderId: string, accountId?: string) => void;

  clearAccount: (accountId: string) => void;
  clear: () => void;
};

// Debounce persist calls per account to avoid hitting Discord's rate limit
const persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function persistFolders(folders: GuildFolder[], accountId?: string) {
  const key = accountId || '_default';
  if (persistTimers[key]) clearTimeout(persistTimers[key]);
  persistTimers[key] = setTimeout(() => {
    delete persistTimers[key];
    try {
      const encoded = encodeGuildFolders(folders);
      DiscordApiService.updateSettingsProto(encoded, accountId).catch((err) => {
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

/** Resolve which account owns a guild by checking all accounts' folders */
function resolveAccountId(
  foldersByAccount: Record<string, GuildFolder[]>,
  guildId: string,
  hint?: string,
): string | undefined {
  if (hint) return hint;
  for (const [accId, folders] of Object.entries(foldersByAccount)) {
    if (folders.some((f) => f.guild_ids.includes(guildId))) return accId;
  }
  return undefined;
}

/** Compute flat folders array from per-account map */
function flatFolders(foldersByAccount: Record<string, GuildFolder[]>): GuildFolder[] {
  return Object.values(foldersByAccount).flat();
}

export const useDiscordGuildFoldersStore = create<DiscordGuildFoldersStore>((set, get) => ({
  foldersByAccount: {},
  folders: [],

  setFolders: (folders, accountId) => {
    if (accountId) {
      set((state) => {
        const newMap = { ...state.foldersByAccount, [accountId]: folders };
        return { foldersByAccount: newMap, folders: flatFolders(newMap) };
      });
    } else {
      // Legacy: set as a single default account
      set((state) => {
        const newMap = { ...state.foldersByAccount, _default: folders };
        return { foldersByAccount: newMap, folders: flatFolders(newMap) };
      });
    }
  },

  reorderFolders: (fromIndex, toIndex, accountId) => {
    const accId = accountId || Object.keys(get().foldersByAccount)[0];
    if (!accId) return;
    const folders = get().foldersByAccount[accId] || [];
    if (fromIndex < 0 || fromIndex >= folders.length || toIndex < 0 || toIndex >= folders.length) return;
    if (fromIndex === toIndex) return;
    const newFolders = arrayMove(folders, fromIndex, toIndex);
    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId]: newFolders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(newFolders, accId);
  },

  addGuildToFolder: (guildId, targetFolderId, nearGuildId, position, accountId) => {
    const accId = resolveAccountId(get().foldersByAccount, guildId, accountId)
      || resolveAccountId(get().foldersByAccount, targetFolderId)
      || Object.keys(get().foldersByAccount)[0];
    if (!accId) return;

    const folders = (get().foldersByAccount[accId] || []).map((f) => ({ ...f, guild_ids: [...f.guild_ids] }));
    const targetFolder = folders.find((f) => f.id === targetFolderId);
    if (!targetFolder || targetFolder.guild_ids.includes(guildId)) return;

    removeGuildFromFolders(folders, guildId);

    if (nearGuildId) {
      const nearIdx = targetFolder.guild_ids.indexOf(nearGuildId);
      if (nearIdx !== -1) {
        const insertIdx = position === 'after' ? nearIdx + 1 : nearIdx;
        targetFolder.guild_ids.splice(insertIdx, 0, guildId);
      } else {
        targetFolder.guild_ids.push(guildId);
      }
    } else {
      targetFolder.guild_ids.push(guildId);
    }

    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId]: folders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(folders, accId);
  },

  createFolderFromGuilds: (draggedGuildId, targetGuildId, accountId) => {
    if (draggedGuildId === targetGuildId) return;
    const accId = resolveAccountId(get().foldersByAccount, targetGuildId, accountId)
      || Object.keys(get().foldersByAccount)[0];
    if (!accId) return;

    const folders = (get().foldersByAccount[accId] || []).map((f) => ({ ...f, guild_ids: [...f.guild_ids] }));

    const targetEntryIdx = folders.findIndex(
      (f) => f.id === null && f.guild_ids.includes(targetGuildId),
    );
    if (targetEntryIdx === -1) return;

    removeGuildFromFolders(folders, draggedGuildId);

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

    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId]: folders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(folders, accId);
  },

  reorderWithinFolder: (folderId, fromGuildId, toGuildId, position = 'after', accountId) => {
    const accId = resolveAccountId(get().foldersByAccount, fromGuildId, accountId)
      || Object.keys(get().foldersByAccount)[0];
    if (!accId) return;

    const folders = (get().foldersByAccount[accId] || []).map((f) => {
      if (f.id !== folderId) return f;
      const guildIds = [...f.guild_ids];
      const fromIdx = guildIds.indexOf(fromGuildId);
      const toIdx = guildIds.indexOf(toGuildId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return f;
      guildIds.splice(fromIdx, 1);
      const newToIdx = guildIds.indexOf(toGuildId);
      const insertIdx = position === 'after' ? newToIdx + 1 : newToIdx;
      if (insertIdx === fromIdx) return f;
      guildIds.splice(insertIdx, 0, fromGuildId);
      return { ...f, guild_ids: guildIds };
    });

    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId]: folders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(folders, accId);
  },

  removeGuildFromFolder: (guildId, insertAtIndex, accountId) => {
    const accId = resolveAccountId(get().foldersByAccount, guildId, accountId)
      || Object.keys(get().foldersByAccount)[0];
    if (!accId) return;

    const folders = (get().foldersByAccount[accId] || []).map((f) => ({ ...f, guild_ids: [...f.guild_ids] }));
    const sourceFolder = folders.find((f) => f.id !== null && f.guild_ids.includes(guildId));
    if (!sourceFolder) return;

    removeGuildFromFolders(folders, guildId);

    const clamped = Math.min(insertAtIndex, folders.length);
    folders.splice(clamped, 0, {
      id: null,
      guild_ids: [guildId],
      name: null,
      color: null,
    });

    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId]: folders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(folders, accId);
  },

  updateFolder: (folderId, updates, accountId) => {
    // Find which account this folder belongs to
    let accId = accountId;
    if (!accId) {
      for (const [id, folders] of Object.entries(get().foldersByAccount)) {
        if (folders.some((f) => f.id === folderId)) {
          accId = id;
          break;
        }
      }
    }
    if (!accId) return;

    const folders = (get().foldersByAccount[accId] || []).map((f) => {
      if (f.id !== folderId) return f;
      return { ...f, ...updates };
    });

    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId!]: folders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(folders, accId);
  },

  deleteFolder: (folderId, accountId) => {
    let accId = accountId;
    if (!accId) {
      for (const [id, flds] of Object.entries(get().foldersByAccount)) {
        if (flds.some((f) => f.id === folderId)) {
          accId = id;
          break;
        }
      }
    }
    if (!accId) return;

    const folders: GuildFolder[] = [];
    for (const f of get().foldersByAccount[accId] || []) {
      if (f.id !== folderId) {
        folders.push(f);
      } else {
        for (const guildId of f.guild_ids) {
          folders.push({ id: null, guild_ids: [guildId], name: null, color: null });
        }
      }
    }

    set((state) => {
      const newMap = { ...state.foldersByAccount, [accId!]: folders };
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    });
    persistFolders(folders, accId);
  },

  clearAccount: (accountId) =>
    set((state) => {
      const newMap = { ...state.foldersByAccount };
      delete newMap[accountId];
      return { foldersByAccount: newMap, folders: flatFolders(newMap) };
    }),

  clear: () => set({ foldersByAccount: {}, folders: [] }),
}));
