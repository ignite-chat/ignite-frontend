import { toast } from 'sonner';
import api from '../api.js';
import { useUnreadsStore, type ChannelUnread } from '../store/unreads.store.js';

export const UnreadsService = {
  async loadUnreads() {
    const { setChannelUnreads } = useUnreadsStore.getState();
    try {
      const { data } = await api.get('/@me/unreads');
      setChannelUnreads(data);

      console.log('Loaded unreads:', data);
    } catch {
      toast.error('Unable to load unread messages.');
    }
  },

  async updateUnread(channelId: string, updates: Partial<ChannelUnread>) {
    const { channelUnreads, setChannelUnreads } = useUnreadsStore.getState();

    const exists = channelUnreads.some((unread) => unread.channel_id === channelId);

    if (exists) {
      const updatedUnreads = channelUnreads.map((unread) => {
        if (unread.channel_id === channelId) {
          return {
            ...unread,
            ...updates,
          };
        }
        return unread;
      });

      setChannelUnreads(updatedUnreads);
    } else {
      const updatedUnreads: ChannelUnread[] = [
        ...channelUnreads,
        {
          channel_id: channelId,
          ...updates,
        },
      ];

      setChannelUnreads(updatedUnreads);
    }
  },

  async setLastReadMessageId(channelId: string, messageId: string) {
    const { channelUnreads, setChannelUnreads } = useUnreadsStore.getState();

    // Skip if already up to date
    const current = channelUnreads.find((u) => u.channel_id === channelId);
    if (current?.last_read_message_id === messageId) return;

    const getTimestamp = (id: string) => BigInt(id) >> 22n;

    const messageTimestamp = getTimestamp(messageId);

    // Find or create the channel unread with channel_id = channelId and set the last_read_message_id to messageId
    const exists = channelUnreads.some((unread) => unread.channel_id === channelId);
    let updatedUnreads;
    if (exists) {
      updatedUnreads = channelUnreads.map((unread) => {
        if (unread.channel_id === channelId) {
          const filteredMentioned = (unread.mentioned_message_ids || []).filter(
            (mid: string) => getTimestamp(mid) > messageTimestamp
          );
          return {
            ...unread,
            last_read_message_id: messageId,
            mentioned_message_ids: filteredMentioned,
          };
        }
        return unread;
      });
    } else {
      updatedUnreads = [
        ...channelUnreads,
        { channel_id: channelId, last_read_message_id: messageId },
      ];
    }
    setChannelUnreads(updatedUnreads);
  },
};
