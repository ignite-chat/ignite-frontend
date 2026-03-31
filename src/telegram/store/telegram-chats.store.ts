import { create } from 'zustand';
import type { TelegramChat } from '../types';

type TelegramChatsStore = {
  chats: TelegramChat[];

  setChats: (chats: TelegramChat[]) => void;
  addChat: (chat: TelegramChat) => void;
  updateChat: (chatId: string, updates: Partial<TelegramChat>) => void;
  removeChat: (chatId: string) => void;
  clear: () => void;
};

export const useTelegramChatsStore = create<TelegramChatsStore>((set) => ({
  chats: [],

  setChats: (chats) => set({ chats }),

  addChat: (chat) =>
    set((state) => {
      const exists = state.chats.some((c) => c.id === chat.id);
      if (exists) {
        return {
          chats: state.chats.map((c) => (c.id === chat.id ? { ...c, ...chat } : c)),
        };
      }
      return { chats: [chat, ...state.chats] };
    }),

  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
    })),

  removeChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
    })),

  clear: () => set({ chats: [] }),
}));
