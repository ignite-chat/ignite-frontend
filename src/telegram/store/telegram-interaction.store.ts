import { create } from 'zustand';
import type { TelegramMessage } from '../types';

type TelegramInteractionStore = {
  replyingTo: { chatId: string; message: TelegramMessage } | null;
  editing: { chatId: string; message: TelegramMessage } | null;

  setReplyingTo: (chatId: string, message: TelegramMessage) => void;
  setEditing: (chatId: string, message: TelegramMessage) => void;
  clearReplyingTo: () => void;
  clearEditing: () => void;
  clearAll: () => void;
};

export const useTelegramInteractionStore = create<TelegramInteractionStore>((set) => ({
  replyingTo: null,
  editing: null,

  setReplyingTo: (chatId, message) => set({ replyingTo: { chatId, message }, editing: null }),
  setEditing: (chatId, message) => set({ editing: { chatId, message }, replyingTo: null }),
  clearReplyingTo: () => set({ replyingTo: null }),
  clearEditing: () => set({ editing: null }),
  clearAll: () => set({ replyingTo: null, editing: null }),
}));
