import { create } from 'zustand';

type ChannelsStore = {
    channels: any[];
    channelMessages: { [channelId: string]: any[] };
    channelPendingMessages: { [channelId: string]: any[] };
    pinnedChannelIds: string[];

    setChannels: (channels: any[]) => void;
    setChannelMessages: (channelId: string, messages: any[]) => void;
    setChannelPendingMessages: (channelId: string, messages: any[]) => void;
    togglePin: (channelId: string) => void;
};

export const useChannelsStore = create<ChannelsStore>((set) => ({
    channels: [],
    channelMessages: {},
    channelPendingMessages: {},
    pinnedChannelIds: JSON.parse(localStorage.getItem('pinnedChannels') || '[]'),

    setChannels: (channels) => set({ channels }),
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