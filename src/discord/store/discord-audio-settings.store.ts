import { create } from 'zustand';

export type AudioContextEntry = {
  id: string; // userId or stream key
  muted: boolean;
  volume: number; // 0–200 (100 = normal)
  soundboardMuted: boolean;
  modifiedAt: bigint;
};

type ProtoEntry = { muted: boolean; volume: number; soundboardMuted: boolean; modifiedAt: bigint };

type DiscordAudioSettingsStore = {
  /** userId -> per-user audio settings */
  users: Record<string, AudioContextEntry>;
  /** streamKey -> per-stream audio settings */
  streams: Record<string, AudioContextEntry>;

  loadFromProto: (
    protoUserMap: Record<string, ProtoEntry> | undefined,
    protoStreamMap: Record<string, ProtoEntry> | undefined,
  ) => void;

  setUserVolume: (id: string, volume: number) => void;
  setUserMuted: (id: string, muted: boolean) => void;
  removeUser: (id: string) => void;

  setStreamVolume: (id: string, volume: number) => void;
  setStreamMuted: (id: string, muted: boolean) => void;
  removeStream: (id: string) => void;
};

function parseMap(map: Record<string, ProtoEntry> | undefined): Record<string, AudioContextEntry> {
  if (!map) return {};
  const result: Record<string, AudioContextEntry> = {};
  for (const [id, entry] of Object.entries(map)) {
    result[id] = {
      id,
      muted: entry.muted,
      volume: Math.round(entry.volume),
      soundboardMuted: entry.soundboardMuted,
      modifiedAt: entry.modifiedAt,
    };
  }
  return result;
}

function defaultEntry(id: string): AudioContextEntry {
  return { id, muted: false, volume: 100, soundboardMuted: false, modifiedAt: BigInt(0) };
}

function setVolume(
  map: Record<string, AudioContextEntry>,
  id: string,
  volume: number,
): Record<string, AudioContextEntry> {
  const clamped = Math.min(200, Math.max(0, volume));
  const existing = map[id] || defaultEntry(id);
  return { ...map, [id]: { ...existing, volume: clamped, modifiedAt: BigInt(Date.now()) } };
}

function setMuted(
  map: Record<string, AudioContextEntry>,
  id: string,
  muted: boolean,
): Record<string, AudioContextEntry> {
  const existing = map[id] || defaultEntry(id);
  return { ...map, [id]: { ...existing, muted, modifiedAt: BigInt(Date.now()) } };
}

function removeEntry(map: Record<string, AudioContextEntry>, id: string): Record<string, AudioContextEntry> {
  const { [id]: _, ...rest } = map;
  return rest;
}

export const useDiscordAudioSettingsStore = create<DiscordAudioSettingsStore>((set) => ({
  users: {},
  streams: {},

  loadFromProto: (protoUserMap, protoStreamMap) => {
    set({
      users: parseMap(protoUserMap),
      streams: parseMap(protoStreamMap),
    });
  },

  setUserVolume: (id, volume) => set((s) => ({ users: setVolume(s.users, id, volume) })),
  setUserMuted: (id, muted) => set((s) => ({ users: setMuted(s.users, id, muted) })),
  removeUser: (id) => set((s) => ({ users: removeEntry(s.users, id) })),

  setStreamVolume: (id, volume) => set((s) => ({ streams: setVolume(s.streams, id, volume) })),
  setStreamMuted: (id, muted) => set((s) => ({ streams: setMuted(s.streams, id, muted) })),
  removeStream: (id) => set((s) => ({ streams: removeEntry(s.streams, id) })),
}));
