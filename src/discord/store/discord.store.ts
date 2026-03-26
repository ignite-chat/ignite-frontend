import { create } from 'zustand';
import type { DiscordUser } from '../types';

export type DiscordAccount = {
  token: string;
  user: DiscordUser | null;
  isConnected: boolean;
  sessionId: string | null;
};

function loadAccounts(): DiscordAccount[] {
  try {
    const raw = localStorage.getItem('discord_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((a: any) => ({
        token: a.token,
        user: null,
        isConnected: false,
        sessionId: null,
      }));
    }
  } catch {}

  // Migrate from single-token format
  const legacy = localStorage.getItem('discord_token');
  if (legacy) {
    localStorage.setItem('discord_accounts', JSON.stringify([{ token: legacy }]));
    localStorage.removeItem('discord_token');
    return [{ token: legacy, user: null, isConnected: false, sessionId: null }];
  }

  return [];
}

function persistAccounts(accounts: DiscordAccount[]) {
  const serialized = accounts.map((a) => ({ token: a.token }));
  if (serialized.length > 0) {
    localStorage.setItem('discord_accounts', JSON.stringify(serialized));
  } else {
    localStorage.removeItem('discord_accounts');
  }
}

/**
 * Derive backward-compatible top-level fields from the accounts array.
 * - token / user / sessionId → from the active account (or first connected, or first)
 * - isConnected → true if ANY account is connected
 */
function deriveCompat(accounts: DiscordAccount[], activeAccountId: string | null) {
  const active =
    accounts.find((a) => a.user?.id === activeAccountId) ??
    accounts.find((a) => a.isConnected) ??
    accounts[0];
  return {
    token: active?.token ?? null,
    user: active?.user ?? null,
    isConnected: accounts.some((a) => a.isConnected),
    sessionId: active?.sessionId ?? null,
  };
}

type DiscordStore = {
  accounts: DiscordAccount[];
  activeAccountId: string | null;

  // Derived from active account for backward compat
  token: string | null;
  user: DiscordUser | null;
  isConnected: boolean;
  sessionId: string | null;

  // Multi-account API
  addAccount: (token: string) => void;
  removeAccount: (userId: string) => void;
  removeAccountByToken: (token: string) => void;
  setActiveAccount: (userId: string | null) => void;
  updateAccount: (token: string, updates: Partial<Omit<DiscordAccount, 'token'>>) => void;
  getAccountByToken: (token: string) => DiscordAccount | undefined;
  getAccountByUserId: (userId: string) => DiscordAccount | undefined;

  // Compat methods (operate on active/first account)
  setToken: (token: string | null) => void;
  setUser: (user: DiscordUser | null) => void;
  setConnected: (connected: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  getToken: () => string | null;
  disconnect: () => void;
};

const initialAccounts = loadAccounts();
const initialCompat = deriveCompat(initialAccounts, null);

export const useDiscordStore = create<DiscordStore>((set, get) => ({
  accounts: initialAccounts,
  activeAccountId: null,
  ...initialCompat,

  // ─── Multi-account API ─────────────────────────────────────────

  addAccount: (token) => {
    const { accounts } = get();
    if (accounts.some((a) => a.token === token)) return;
    const newAccounts = [...accounts, { token, user: null, isConnected: false, sessionId: null }];
    persistAccounts(newAccounts);
    set({ accounts: newAccounts, ...deriveCompat(newAccounts, get().activeAccountId) });
  },

  removeAccount: (userId) => {
    const { accounts, activeAccountId } = get();
    const newAccounts = accounts.filter((a) => a.user?.id !== userId);
    persistAccounts(newAccounts);
    const newActiveId = activeAccountId === userId ? null : activeAccountId;
    set({ accounts: newAccounts, activeAccountId: newActiveId, ...deriveCompat(newAccounts, newActiveId) });
  },

  removeAccountByToken: (token) => {
    const { accounts, activeAccountId } = get();
    const removing = accounts.find((a) => a.token === token);
    const newAccounts = accounts.filter((a) => a.token !== token);
    persistAccounts(newAccounts);
    const removedUserId = removing?.user?.id;
    const newActiveId = removedUserId && activeAccountId === removedUserId ? null : activeAccountId;
    set({ accounts: newAccounts, activeAccountId: newActiveId, ...deriveCompat(newAccounts, newActiveId) });
  },

  setActiveAccount: (userId) => {
    const { accounts } = get();
    set({ activeAccountId: userId, ...deriveCompat(accounts, userId) });
  },

  updateAccount: (token, updates) => {
    const { accounts, activeAccountId } = get();
    const newAccounts = accounts.map((a) => (a.token === token ? { ...a, ...updates } : a));
    set({ accounts: newAccounts, ...deriveCompat(newAccounts, activeAccountId) });
  },

  getAccountByToken: (token) => get().accounts.find((a) => a.token === token),
  getAccountByUserId: (userId) => get().accounts.find((a) => a.user?.id === userId),

  // ─── Compat methods ────────────────────────────────────────────

  setToken: (token) => {
    if (token) {
      get().addAccount(token);
    }
  },

  setUser: (user) => {
    const { accounts, activeAccountId } = get();
    const active = accounts.find((a) => a.user?.id === activeAccountId) ?? accounts[0];
    if (active) {
      get().updateAccount(active.token, { user });
    }
  },

  setConnected: (connected) => {
    const { accounts, activeAccountId } = get();
    const active = accounts.find((a) => a.user?.id === activeAccountId) ?? accounts[0];
    if (active) {
      get().updateAccount(active.token, { isConnected: connected });
    }
  },

  setSessionId: (sessionId) => {
    const { accounts, activeAccountId } = get();
    const active = accounts.find((a) => a.user?.id === activeAccountId) ?? accounts[0];
    if (active) {
      get().updateAccount(active.token, { sessionId });
    }
  },

  getToken: () => get().token,

  disconnect: () => {
    localStorage.removeItem('discord_accounts');
    localStorage.removeItem('discord_token');
    set({ accounts: [], activeAccountId: null, token: null, user: null, isConnected: false, sessionId: null });
  },
}));
