import { create } from 'zustand';
import type { ForumThread, FirstMessage, ChannelThreadData } from '../types';

type DiscordThreadsStore = {
  channels: { [channelId: string]: ChannelThreadData };

  upsertThreads: (channelId: string, threads: ForumThread[]) => void;
  setThreads: (channelId: string, threads: ForumThread[]) => void;

  upsertFirstMessages: (channelId: string, messages: FirstMessage[]) => void;
  setFirstMessages: (channelId: string, messages: FirstMessage[]) => void;

  setHasMore: (channelId: string, hasMore: boolean) => void;
  setOffset: (channelId: string, offset: number) => void;

  findFirstMessage: (threadId: string) => FirstMessage | undefined;
  updateFirstMessage: (threadId: string, updates: Partial<FirstMessage>) => void;

  clearChannel: (channelId: string) => void;
  clear: () => void;
};

const emptyChannel: ChannelThreadData = {
  threads: [],
  firstMessages: {},
  hasMore: false,
  offset: 0,
};

const getChannel = (state: DiscordThreadsStore, channelId: string): ChannelThreadData =>
  state.channels[channelId] || emptyChannel;

export const useDiscordThreadsStore = create<DiscordThreadsStore>((set) => ({
  channels: {},

  setThreads: (channelId, threads) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: { ...getChannel(state, channelId), threads },
      },
    })),

  upsertThreads: (channelId, threads) =>
    set((state) => {
      const channel = getChannel(state, channelId);
      const existing = new Map(channel.threads.map((t) => [t.id, t]));
      for (const thread of threads) {
        existing.set(thread.id, { ...existing.get(thread.id), ...thread });
      }
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...channel, threads: Array.from(existing.values()) },
        },
      };
    }),

  setFirstMessages: (channelId, messages) =>
    set((state) => {
      const msgMap: Record<string, FirstMessage> = {};
      for (const msg of messages) {
        msgMap[msg.channel_id] = msg;
      }
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...getChannel(state, channelId), firstMessages: msgMap },
        },
      };
    }),

  upsertFirstMessages: (channelId, messages) =>
    set((state) => {
      const channel = getChannel(state, channelId);
      const merged = { ...channel.firstMessages };
      for (const msg of messages) {
        merged[msg.channel_id] = { ...merged[msg.channel_id], ...msg };
      }
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...channel, firstMessages: merged },
        },
      };
    }),

  setHasMore: (channelId, hasMore) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: { ...getChannel(state, channelId), hasMore },
      },
    })),

  setOffset: (channelId, offset) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: { ...getChannel(state, channelId), offset },
      },
    })),

  findFirstMessage: (threadId) => {
    for (const channelData of Object.values(useDiscordThreadsStore.getState().channels)) {
      if (channelData.firstMessages[threadId]) return channelData.firstMessages[threadId];
    }
    return undefined;
  },

  updateFirstMessage: (threadId, updates) =>
    set((state) => {
      for (const [channelId, channelData] of Object.entries(state.channels)) {
        if (channelData.firstMessages[threadId]) {
          return {
            channels: {
              ...state.channels,
              [channelId]: {
                ...channelData,
                firstMessages: {
                  ...channelData.firstMessages,
                  [threadId]: { ...channelData.firstMessages[threadId], ...updates },
                },
              },
            },
          };
        }
      }
      return state;
    }),

  clearChannel: (channelId) =>
    set((state) => {
      const { [channelId]: _, ...rest } = state.channels;
      return { channels: rest };
    }),

  clear: () => set({ channels: {} }),
}));
