import { create } from 'zustand';
import type { User } from './users.store';
import type { Channel } from './channels.store';
import type { Role } from './roles.store';
import type { Emoji } from './emojis.store';
import type { Sticker } from './stickers.store';

export type Guild = {
  id: string;
  name: string;
  description?: string | null;
  icon_file_id?: string | null;
  banner_file_id?: string | null;
  owner_id: string;
  default_permissions: number;
  is_discoverable: boolean;
  channels: Channel[];
  roles: Role[];
  emojis?: Emoji[];
  stickers?: Sticker[];
  member_count?: number;
  member?: GuildMember;
  created_at?: string;
  updated_at?: string;
};

export type GuildMember = {
  user_id: string;
  user: User;
  nickname?: string | null;
  roles: Role[];
  avatar?: string | null;
  banner?: string | null;
  joined_at?: string;
};

type GuildsStore = {
  guilds: Guild[];
  guildMembers: { [guildId: string]: GuildMember[] };

  setGuilds: (guilds: Guild[]) => void;
  setGuildMembers: (guildId: string, members: GuildMember[]) => void;

  addGuild: (guild: Guild) => void;
  editGuild: (guildId: string, updates: Partial<Guild>) => void;
  editGuildChannel: (guildId: string, channelId: string, updates: Partial<Channel>) => void;
  removeGuild: (guildId: string) => void;
};

export const useGuildsStore = create<GuildsStore>((set) => ({
  guilds: [],
  guildMembers: {},

  setGuilds: (guilds) => set({ guilds }),
  setGuildMembers: (guildId, members) =>
    set((state) => ({
      guildMembers: {
        ...state.guildMembers,
        [guildId]: members,
      },
    })),

  addGuild: (guild) => set((state) => ({ guilds: [...state.guilds, guild] })),
  editGuild: (guildId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) => (g.id === guildId ? { ...g, ...updates } : g)),
    })),
  editGuildChannel: (guildId, channelId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) => {
        if (g.id == guildId) {
          return {
            ...g,
            channels: g.channels.map((c) =>
              c.channel_id == channelId ? { ...c, ...updates } : c
            ),
          };
        }
        return g;
      }),
    })),
  removeGuild: (guildId) => set((state) => ({ guilds: state.guilds.filter((g) => g.id !== guildId) })),
}));
