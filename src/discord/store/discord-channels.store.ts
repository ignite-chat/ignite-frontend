import { create } from 'zustand';

type DiscordMessage = {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
  };
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  attachments: any[];
  embeds: any[];
  mentions: any[];
  referenced_message?: any;
  [key: string]: any;
};

type DiscordChannel = {
  id: string;
  type: number;
  guild_id?: string;
  name?: string;
  position?: number;
  parent_id?: string | null;
  topic?: string | null;
  last_message_id?: string | null;
  [key: string]: any;
};

type DiscordChannelsStore = {
  channels: DiscordChannel[];
  channelMessages: { [channelId: string]: DiscordMessage[] };

  setChannels: (channels: DiscordChannel[]) => void;
  addChannel: (channel: DiscordChannel) => void;
  updateChannel: (channelId: string, updates: Partial<DiscordChannel>) => void;
  removeChannel: (channelId: string) => void;
  setGuildChannels: (guildId: string, channels: DiscordChannel[]) => void;

  setChannelMessages: (channelId: string, messages: DiscordMessage[]) => void;
  appendMessage: (channelId: string, message: DiscordMessage) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<DiscordMessage>) => void;
  removeMessage: (channelId: string, messageId: string) => void;

  clear: () => void;
};

export const useDiscordChannelsStore = create<DiscordChannelsStore>((set) => ({
  channels: [],
  channelMessages: {},

  setChannels: (channels) => set({ channels }),

  addChannel: (channel) =>
    set((state) => {
      const exists = state.channels.some((c) => c.id === channel.id);
      if (exists) {
        return {
          channels: state.channels.map((c) => (c.id === channel.id ? { ...c, ...channel } : c)),
        };
      }
      return { channels: [...state.channels, channel] };
    }),

  updateChannel: (channelId, updates) =>
    set((state) => ({
      channels: state.channels.map((c) => (c.id === channelId ? { ...c, ...updates } : c)),
    })),

  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      channelMessages: Object.fromEntries(
        Object.entries(state.channelMessages).filter(([id]) => id !== channelId)
      ),
    })),

  setGuildChannels: (guildId, channels) =>
    set((state) => {
      const otherChannels = state.channels.filter((c) => c.guild_id !== guildId);
      return { channels: [...otherChannels, ...channels] };
    }),

  setChannelMessages: (channelId, messages) =>
    set((state) => ({
      channelMessages: { ...state.channelMessages, [channelId]: messages },
    })),

  appendMessage: (channelId, message) =>
    set((state) => {
      const existing = state.channelMessages[channelId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        channelMessages: {
          ...state.channelMessages,
          [channelId]: [...existing, message],
        },
      };
    }),

  updateMessage: (channelId, messageId, updates) =>
    set((state) => {
      const messages = state.channelMessages[channelId];
      if (!messages) return state;
      return {
        channelMessages: {
          ...state.channelMessages,
          [channelId]: messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        },
      };
    }),

  removeMessage: (channelId, messageId) =>
    set((state) => {
      const messages = state.channelMessages[channelId];
      if (!messages) return state;
      return {
        channelMessages: {
          ...state.channelMessages,
          [channelId]: messages.filter((m) => m.id !== messageId),
        },
      };
    }),

  clear: () => set({ channels: [], channelMessages: {} }),
}));
