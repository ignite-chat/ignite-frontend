import { create } from 'zustand';

export type ChannelUnread = {
  channel_id: string;
  last_read_message_id?: string;
  mentioned_message_ids?: string[];
};

type UnreadsStore = {
  channelUnreads: ChannelUnread[];
  channelUnreadsLoaded: boolean;

  setChannelUnreads: (channelUnreads: ChannelUnread[]) => void;
};

export const useUnreadsStore = create<UnreadsStore>((set) => ({
  channelUnreads: [],
  channelUnreadsLoaded: false,

  setChannelUnreads: (channelUnreads) => set({ channelUnreads, channelUnreadsLoaded: true }),
}));
