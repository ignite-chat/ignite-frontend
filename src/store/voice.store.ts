import { create } from 'zustand';
import type { Room, RemoteParticipant, LocalParticipant } from 'livekit-client';

export interface VoiceParticipant {
    identity: string;
    name: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
}

interface VoiceState {
    room: Room | null;
    channelId: string | null;
    guildId: string | null;
    guildName: string | null;
    channelName: string | null;
    participants: VoiceParticipant[];
    isMuted: boolean;
    isDeafened: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    connectionState: 'disconnected' | 'connecting' | 'connected';

    setRoom: (room: Room | null) => void;
    setChannel: (channelId: string | null, guildId: string | null, guildName: string | null, channelName: string | null) => void;
    setParticipants: (participants: VoiceParticipant[]) => void;
    setConnectionState: (state: 'disconnected' | 'connecting' | 'connected') => void;
    setMuted: (muted: boolean) => void;
    setDeafened: (deafened: boolean) => void;
    setCameraOn: (on: boolean) => void;
    setScreenSharing: (on: boolean) => void;
    reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
    room: null,
    channelId: null,
    guildId: null,
    guildName: null,
    channelName: null,
    participants: [],
    isMuted: false,
    isDeafened: false,
    isCameraOn: false,
    isScreenSharing: false,
    connectionState: 'disconnected',

    setRoom: (room) => set({ room }),
    setChannel: (channelId, guildId, guildName, channelName) => set({ channelId, guildId, guildName, channelName }),
    setParticipants: (participants) => set({ participants }),
    setConnectionState: (connectionState) => set({ connectionState }),
    setMuted: (isMuted) => set({ isMuted }),
    setDeafened: (isDeafened) => set({ isDeafened }),
    setCameraOn: (isCameraOn) => set({ isCameraOn }),
    setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
    reset: () => set({
        room: null,
        channelId: null,
        guildId: null,
        guildName: null,
        channelName: null,
        participants: [],
        isMuted: false,
        isDeafened: false,
        isCameraOn: false,
        isScreenSharing: false,
        connectionState: 'disconnected',
    }),
}));
