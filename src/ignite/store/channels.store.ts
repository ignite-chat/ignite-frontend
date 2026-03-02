import { create } from 'zustand';
import type { User } from './users.store';
import type { VoiceState } from './voice.store';

export type ChannelRolePermission = {
  role_id: string;
  allowed_permissions: number;
  denied_permissions: number;
};

export type Channel = {
  channel_id: string;
  id?: string;
  guild_id?: string;
  name: string;
  type: number;
  position?: number;
  parent_id?: string | null;
  last_message_id?: string | null;
  allowed_permissions?: number;
  denied_permissions?: number;
  role_permissions?: ChannelRolePermission[];
  voice_states?: VoiceState[];
  recipients?: User[];
};

export type Attachment = {
  id: string;
  filename: string;
  size: number;
  url?: string;
  content_type?: string;
  title?: string;
  flags?: number;
};

export type MessageReference = {
  guild_id?: string | null;
  channel_id?: string | null;
  message_id: string;
};

export type Message = {
  id: string;
  content: string;
  nonce?: string;
  author: User;
  channel_id?: string;
  created_at: string;
  updated_at?: string;
  attachments?: Attachment[];
  message_reference?: MessageReference | null;
  message_references?: MessageReference[];
  sticker_ids?: string[];
  mentions?: { user_id: string }[];
  mention_everyone?: boolean;
  mention_roles?: string[];
  pinned?: boolean;
};

export type PendingMessage = {
  nonce: string;
  content: string;
  author?: User;
  created_at: string;
  message_references: MessageReference[];
  attachments: { id: string; filename: string; size: number }[];
  uploadProgress?: number;
};

export type Reaction = {
  emoji: string;
  count: number;
  users: string[];
  me: boolean;
};

type ChannelsStore = {
  channels: Channel[];
  channelMessages: { [channelId: string]: Message[] };
  channelPendingMessages: { [channelId: string]: PendingMessage[] };
  channelReactions: { [channelId: string]: { [messageId: string]: Reaction[] } };
  pinnedChannelIds: string[];

  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  setChannelMessages: (channelId: string, messages: Message[]) => void;
  setChannelPendingMessages: (channelId: string, messages: PendingMessage[]) => void;
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
        .filter((r): r is Reaction => r !== null);

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
