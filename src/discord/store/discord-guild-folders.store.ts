import { create } from 'zustand';
import type { GuildFolder } from '../utils/proto-decode';

export type { GuildFolder } from '../utils/proto-decode';

type DiscordGuildFoldersStore = {
  /** Ordered list of guild folders from user_settings_proto */
  folders: GuildFolder[];

  setFolders: (folders: GuildFolder[]) => void;
  clear: () => void;
};

export const useDiscordGuildFoldersStore = create<DiscordGuildFoldersStore>((set) => ({
  folders: [],

  setFolders: (folders) => set({ folders }),

  clear: () => set({ folders: [] }),
}));
