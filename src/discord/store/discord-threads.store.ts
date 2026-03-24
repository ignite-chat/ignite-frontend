import { create } from 'zustand';
import type { ForumThread, FirstMessage, ChannelThreadData } from '../types';

type DiscordThreadsStore = {
  channels: { [channelId: string]: ChannelThreadData };

  upsertThreads: (channelId: string, threads: ForumThread[]) => void;
  setThreads: (channelId: string, threads: ForumThread[]) => void;

  upsertFirstMessageIds: (channelId: string, messages: FirstMessage[]) => void;
  setFirstMessageIds: (channelId: string, messages: FirstMessage[]) => void;

  setHasMore: (channelId: string, hasMore: boolean) => void;
  setOffset: (channelId: string, offset: number) => void;

  /** Get the first message ID for a thread */
  getFirstMessageId: (threadId: string) => string | undefined;

  clearChannel: (channelId: string) => void;
  clear: () => void;
};

const emptyChannel: ChannelThreadData = {
  threads: [],
  firstMessageIds: {},
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

  setFirstMessageIds: (channelId, messages) =>
    set((state) => {
      const idMap: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.id) idMap[msg.channel_id] = msg.id;
      }
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...getChannel(state, channelId), firstMessageIds: idMap },
        },
      };
    }),

  upsertFirstMessageIds: (channelId, messages) =>
    set((state) => {
      const channel = getChannel(state, channelId);
      const merged = { ...channel.firstMessageIds };
      for (const msg of messages) {
        if (msg.id) merged[msg.channel_id] = msg.id;
      }
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...channel, firstMessageIds: merged },
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

  getFirstMessageId: (threadId) => {
    const channels = useDiscordThreadsStore.getState().channels;
    for (const channelData of Object.values(channels) as ChannelThreadData[]) {
      if (channelData.firstMessageIds[threadId]) return channelData.firstMessageIds[threadId];
    }
    return undefined;
  },

  clearChannel: (channelId) =>
    set((state) => {
      const { [channelId]: _, ...rest } = state.channels;
      return { channels: rest };
    }),

  clear: () => set({ channels: {} }),
}));
