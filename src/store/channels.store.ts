import { create } from 'zustand';

type Reaction = {
  emoji: string;
  count: number;
  users: string[];
  me: boolean;
};

type ChannelsStore = {
  channels: any[];
  channelMessages: { [channelId: string]: any[] };
  channelPendingMessages: { [channelId: string]: any[] };
  channelReactions: { [channelId: string]: { [messageId: string]: Reaction[] } };
  pinnedChannelIds: string[];

  setChannels: (channels: any[]) => void;
  addChannel: (channel: any) => void;
  setChannelMessages: (channelId: string, messages: any[]) => void;
  setChannelPendingMessages: (channelId: string, messages: any[]) => void;
  addReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  removeReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  setMessageReactions: (channelId: string, messageId: string, reactions: Reaction[]) => void;
  updatePendingMessageProgress: (channelId: string, nonce: string, progress: number) => void;
  togglePin: (channelId: string) => void;
};

export const useChannelsStore = create<ChannelsStore>((set) => ({
  channels: [],
  channelMessages: {},
  channelPendingMessages: {},
  // FRONTEND-ONLY: channelReactions is stored in-memory only (not persisted to localStorage or server)
  // Reactions are lost on page refresh until the backend API is implemented.
  // To persist reactions:
  // 1. Implement API endpoints: PUT/DELETE /channels/{id}/messages/{id}/reactions/{emoji}/@me
  // 2. Set up WebSocket events: 'message.reaction.added', 'message.reaction.removed', 'message.reactions.set'
  // 3. Load reactions when channel/messages are loaded (e.g., in loadChannelMessages)
  channelReactions: {},
  pinnedChannelIds: JSON.parse(localStorage.getItem('pinnedChannels') || '[]'),

  setChannels: (channels) => {
    // Deduplicate by channel_id — last occurrence wins (most up-to-date data)
    const unique = Array.from(
      new Map(channels.map((c) => [String(c.channel_id || c.id), c])).values()
    );
    set({ channels: unique });
  },
  addChannel: (channel) =>
    set((state) => {
      const channelId = String(channel.channel_id || channel.id);
      const exists = state.channels.some((c) => String(c.channel_id || c.id) === channelId);
      if (exists) return {};

      return {
        channels: [...state.channels, { ...channel, channel_id: channelId }],
      };
    }),
  setChannelMessages: (channelId, messages) =>
    set((state) => ({
      channelMessages: {
        ...state.channelMessages,
        [channelId]: messages,
      },
    })),
  setChannelPendingMessages: (channelId, messages) =>
    set((state) => ({
      channelPendingMessages: {
        ...state.channelPendingMessages,
        [channelId]: messages,
      },
    })),
  updatePendingMessageProgress: (channelId, nonce, progress) =>
    set((state) => ({
      channelPendingMessages: {
        ...state.channelPendingMessages,
        [channelId]: (state.channelPendingMessages[channelId] || []).map((msg) =>
          msg.nonce === nonce ? { ...msg, uploadProgress: progress } : msg
        ),
      },
    })),
  addReaction: (channelId, messageId, emoji, userId) =>
    set((state) => {
      const channelReactions = state.channelReactions[channelId] || {};
      const messageReactions = channelReactions[messageId] || [];

      const existingIndex = messageReactions.findIndex((r) => r.emoji === emoji);
      let newReactions;

      if (existingIndex !== -1) {
        const existing = messageReactions[existingIndex];
        if (!existing.users.includes(userId)) {
          newReactions = [...messageReactions];
          newReactions[existingIndex] = {
            ...existing,
            users: [...existing.users, userId],
            count: existing.count + 1,
            me: existing.me || false,
          };
        } else {
          newReactions = messageReactions;
        }
      } else {
        newReactions = [
          ...messageReactions,
          {
            emoji,
            count: 1,
            users: [userId],
            me: false,
          },
        ];
      }

      return {
        channelReactions: {
          ...state.channelReactions,
          [channelId]: {
            ...channelReactions,
            [messageId]: newReactions,
          },
        },
      };
    }),
  removeReaction: (channelId, messageId, emoji, userId) =>
    set((state) => {
      const channelReactions = state.channelReactions[channelId] || {};
      const messageReactions = channelReactions[messageId] || [];

      const newReactions = messageReactions
        .map((r) => {
          if (r.emoji === emoji) {
            const newUsers = r.users.filter((id) => id !== userId);
            if (newUsers.length === 0) return null;
            return {
              ...r,
              users: newUsers,
              count: newUsers.length,
              me: false,
            };
          }
          return r;
        })
        .filter((r) => r !== null) as Reaction[];

      return {
        channelReactions: {
          ...state.channelReactions,
          [channelId]: {
            ...channelReactions,
            [messageId]: newReactions,
          },
        },
      };
    }),
  setMessageReactions: (channelId, messageId, reactions) =>
    set((state) => ({
      channelReactions: {
        ...state.channelReactions,
        [channelId]: {
          ...(state.channelReactions[channelId] || {}),
          [messageId]: reactions,
        },
      },
    })),
  togglePin: (channelId) =>
    set((state) => {
      const isPinned = state.pinnedChannelIds.includes(channelId);
      const newPinned = isPinned
        ? state.pinnedChannelIds.filter((id) => id !== channelId)
        : [...state.pinnedChannelIds, channelId];

      localStorage.setItem('pinnedChannels', JSON.stringify(newPinned));
      return { pinnedChannelIds: newPinned };
    }),
}));
