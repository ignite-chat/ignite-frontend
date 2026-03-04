import { create } from 'zustand';

type DiscordReplyStore = {
  replyingMessageId: string | null;
  replyingMessage: any | null;
  setReplyingMessage: (messageId: string | null, message?: any) => void;
  clearReply: () => void;
};

export const useDiscordReplyStore = create<DiscordReplyStore>((set) => ({
  replyingMessageId: null,
  replyingMessage: null,

  setReplyingMessage: (messageId, message = null) =>
    set({ replyingMessageId: messageId, replyingMessage: message }),

  clearReply: () =>
    set({ replyingMessageId: null, replyingMessage: null }),
}));
