import { create } from 'zustand';
import type { TelegramMessage, TelegramPendingMessage } from '../types';

type TelegramMessagesStore = {
  chatMessages: { [chatId: string]: TelegramMessage[] };
  chatPendingMessages: { [chatId: string]: TelegramPendingMessage[] };

  setChatMessages: (chatId: string, messages: TelegramMessage[]) => void;
  appendMessage: (chatId: string, message: TelegramMessage) => void;
  updateMessage: (chatId: string, messageId: number, updates: Partial<TelegramMessage>) => void;
  removeMessage: (chatId: string, messageId: number) => void;

  addPendingMessage: (chatId: string, pending: TelegramPendingMessage) => void;
  removePendingByNonce: (chatId: string, nonce: string) => void;
  markPendingFailed: (chatId: string, nonce: string, error: { message: string }) => void;

  clearInactiveMessages: (activeChatId: string) => void;
  clear: () => void;
};

export const useTelegramMessagesStore = create<TelegramMessagesStore>((set) => ({
  chatMessages: {},
  chatPendingMessages: {},

  setChatMessages: (chatId, messages) =>
    set((state) => ({
      chatMessages: { ...state.chatMessages, [chatId]: messages },
    })),

  appendMessage: (chatId, message) =>
    set((state) => {
      const existing = state.chatMessages[chatId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        chatMessages: {
          ...state.chatMessages,
          [chatId]: [...existing, message],
        },
      };
    }),

  updateMessage: (chatId, messageId, updates) =>
    set((state) => {
      const messages = state.chatMessages[chatId];
      if (!messages) return state;
      return {
        chatMessages: {
          ...state.chatMessages,
          [chatId]: messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        },
      };
    }),

  removeMessage: (chatId, messageId) =>
    set((state) => {
      const messages = state.chatMessages[chatId];
      if (!messages) return state;
      return {
        chatMessages: {
          ...state.chatMessages,
          [chatId]: messages.filter((m) => m.id !== messageId),
        },
      };
    }),

  addPendingMessage: (chatId, pending) =>
    set((state) => ({
      chatPendingMessages: {
        ...state.chatPendingMessages,
        [chatId]: [...(state.chatPendingMessages[chatId] || []), pending],
      },
    })),

  removePendingByNonce: (chatId, nonce) =>
    set((state) => {
      const pending = state.chatPendingMessages[chatId];
      if (!pending) return state;
      return {
        chatPendingMessages: {
          ...state.chatPendingMessages,
          [chatId]: pending.filter((p) => p.nonce !== nonce),
        },
      };
    }),

  markPendingFailed: (chatId, nonce, error) =>
    set((state) => {
      const pending = state.chatPendingMessages[chatId];
      if (!pending) return state;
      return {
        chatPendingMessages: {
          ...state.chatPendingMessages,
          [chatId]: pending.map((p) =>
            p.nonce === nonce ? { ...p, status: 'failed' as const, error } : p,
          ),
        },
      };
    }),

  clearInactiveMessages: (activeChatId) =>
    set((state) => {
      const kept: { [id: string]: TelegramMessage[] } = {};
      if (state.chatMessages[activeChatId]) {
        kept[activeChatId] = state.chatMessages[activeChatId];
      }
      return { chatMessages: kept };
    }),

  clear: () => set({ chatMessages: {}, chatPendingMessages: {} }),
}));
