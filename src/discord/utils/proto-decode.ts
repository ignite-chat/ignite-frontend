/**
 * Decodes Discord's user_settings_proto using generated protobuf-ts types.
 * Proto source: https://github.com/discord-userdoccers/discord-protos
 */

import {
  PreloadedUserSettings,
  PreloadedUserSettings_GuildFolders,
  PreloadedUserSettings_GuildFolder,
} from '../generated/PreloadedUserSettings';
import { Int64Value, StringValue, UInt64Value } from '../generated/google/protobuf/wrappers';

export { PreloadedUserSettings };

export type GuildFolder = {
  id: string | null;
  guild_ids: string[];
  name: string | null;
  color: number | null;
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}

function bytesToBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

/**
 * Decode the full PreloadedUserSettings from base64.
 */
export function decodeUserSettings(base64Proto: string) {
  return PreloadedUserSettings.fromBinary(base64ToBytes(base64Proto));
}

/**
 * Decode guild folders from Discord's base64-encoded user_settings_proto.
 */
export function decodeGuildFolders(base64Proto: string): GuildFolder[] {
  try {
    const decoded = PreloadedUserSettings.fromBinary(base64ToBytes(base64Proto));
    const folders = decoded.guildFolders?.folders;
    if (!folders || folders.length === 0) return [];

    return folders.map((f) => ({
      id: f.id?.value != null ? f.id.value.toString() : null,
      guild_ids: (f.guildIds || []).map((id) => id.toString()),
      name: f.name?.value ?? null,
      color: f.color?.value != null ? Number(f.color.value) : null,
    }));
  } catch (err) {
    console.error('[Proto Decode] Failed to decode guild folders:', err);
    return [];
  }
}

/**
 * Encode a GuildFolders update into a base64 proto string suitable for
 * PATCH /users/@me/settings-proto/1
 */
export function encodeGuildFolders(folders: GuildFolder[]): string {
  const protoFolders: PreloadedUserSettings_GuildFolder[] = folders.map((f) => ({
    guildIds: f.guild_ids.map((id) => BigInt(id)),
    id: f.id != null ? Int64Value.create({ value: BigInt(f.id) }) : undefined,
    name: f.name != null ? StringValue.create({ value: f.name }) : undefined,
    color: f.color != null ? UInt64Value.create({ value: BigInt(f.color) }) : undefined,
  }));

  // Build a partial PreloadedUserSettings with only guild_folders set
  const settings = PreloadedUserSettings.create({
    guildFolders: PreloadedUserSettings_GuildFolders.create({
      folders: protoFolders,
    }),
  });

  const buf = PreloadedUserSettings.toBinary(settings);
  return bytesToBase64(buf);
}
