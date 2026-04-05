import { create } from 'zustand';
import type { TelegramUser } from '../types';

type TelegramStore = {
  session: string | null;
  user: TelegramUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionFailed: boolean;
  phoneNumber: string | null;

  setSession: (session: string | null) => void;
  setUser: (user: TelegramUser | null) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionFailed: (failed: boolean) => void;
  setPhoneNumber: (phone: string | null) => void;
  disconnect: () => void;
};

function loadSession(): string | null {
  try {
    return localStorage.getItem('telegram_session') || null;
  } catch {
    return null;
  }
}

function persistSession(session: string | null) {
  if (session) {
    localStorage.setItem('telegram_session', session);
  } else {
    localStorage.removeItem('telegram_session');
  }
}

export const useTelegramStore = create<TelegramStore>((set) => ({
  session: loadSession(),
  user: null,
  isConnected: false,
  isConnecting: false,
  connectionFailed: false,
  phoneNumber: null,

  setSession: (session) => {
    persistSession(session);
    set({ session });
  },

  setUser: (user) => set({ user }),
  setConnected: (isConnected) => set({ isConnected }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setConnectionFailed: (connectionFailed) => set({ connectionFailed }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),

  disconnect: () => {
    localStorage.removeItem('telegram_session');
    set({
      session: null,
      user: null,
      isConnected: false,
      isConnecting: false,
      connectionFailed: false,
      phoneNumber: null,
    });
  },
}));
