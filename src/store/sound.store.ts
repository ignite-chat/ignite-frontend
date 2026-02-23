import { create } from 'zustand';

export type SoundEventType =
  | 'message_notification'
  | 'voice_mute'
  | 'voice_unmute'
  | 'voice_deafen'
  | 'voice_undeafen'
  | 'user_join_channel'
  | 'user_leave_channel'
  | 'user_moved_channel'
  | 'viewer_join_stream'
  | 'viewer_leave_stream'
  | 'voice_disconnected'
  | 'incoming_call'
  | 'camera_on'
  | 'camera_off';

export const SOUND_EVENTS: SoundEventType[] = [
  'message_notification',
  'voice_mute',
  'voice_unmute',
  'voice_deafen',
  'voice_undeafen',
  'user_join_channel',
  'user_leave_channel',
  'user_moved_channel',
  'viewer_join_stream',
  'viewer_leave_stream',
  'voice_disconnected',
  'incoming_call',
  'camera_on',
  'camera_off',
];

export const SOUND_EVENT_LABELS: Record<SoundEventType, string> = {
  message_notification: 'Message Notifications',
  voice_mute: 'Voice Mute',
  voice_unmute: 'Voice Unmute',
  voice_deafen: 'Voice Deafen',
  voice_undeafen: 'Voice Undeafen',
  user_join_channel: 'User Joins Channel',
  user_leave_channel: 'User Leaves Channel',
  user_moved_channel: 'User Moved Channel',
  viewer_join_stream: 'Viewer Joins Stream',
  viewer_leave_stream: 'Viewer Leaves Stream',
  voice_disconnected: 'Voice Disconnected',
  incoming_call: 'Incoming Call',
  camera_on: 'Camera On',
  camera_off: 'Camera Off',
};

export interface SoundEventConfig {
  enabled: boolean;
  customSound: string | null;
}

interface SoundStore {
  disableAll: boolean;
  events: Record<SoundEventType, SoundEventConfig>;
  setDisableAll: (disabled: boolean) => void;
  setEventEnabled: (event: SoundEventType, enabled: boolean) => void;
  setCustomSound: (event: SoundEventType, dataUrl: string) => void;
  removeCustomSound: (event: SoundEventType) => void;
}

const STORAGE_KEY = 'soundSettings';

function getDefaultEvents(): Record<SoundEventType, SoundEventConfig> {
  const events = {} as Record<SoundEventType, SoundEventConfig>;
  for (const key of SOUND_EVENTS) {
    events[key] = { enabled: true, customSound: null };
  }
  return events;
}

function loadFromStorage(): { disableAll: boolean; events: Record<SoundEventType, SoundEventConfig> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { disableAll: false, events: getDefaultEvents() };
    const parsed = JSON.parse(raw);
    const defaults = getDefaultEvents();
    // Merge saved events with defaults so new event types get defaults
    const events = { ...defaults, ...parsed.events };
    return { disableAll: parsed.disableAll ?? false, events };
  } catch {
    return { disableAll: false, events: getDefaultEvents() };
  }
}

function persist(state: { disableAll: boolean; events: Record<SoundEventType, SoundEventConfig> }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ disableAll: state.disableAll, events: state.events }));
  } catch {
    // localStorage full or unavailable
  }
}

const initial = loadFromStorage();

export const useSoundStore = create<SoundStore>((set, get) => ({
  disableAll: initial.disableAll,
  events: initial.events,

  setDisableAll: (disabled) => {
    set({ disableAll: disabled });
    persist(get());
  },

  setEventEnabled: (event, enabled) => {
    set((state) => ({
      events: { ...state.events, [event]: { ...state.events[event], enabled } },
    }));
    persist(get());
  },

  setCustomSound: (event, dataUrl) => {
    set((state) => ({
      events: { ...state.events, [event]: { ...state.events[event], customSound: dataUrl } },
    }));
    persist(get());
  },

  removeCustomSound: (event) => {
    set((state) => ({
      events: { ...state.events, [event]: { ...state.events[event], customSound: null } },
    }));
    persist(get());
  },
}));
