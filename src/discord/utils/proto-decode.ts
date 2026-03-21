/**
 * Minimal protobuf wire-format decoder for Discord's user_settings_proto.
 *
 * Discord sends guild folder ordering as a base64-encoded protobuf in the
 * READY payload's `user_settings_proto` field. This module decodes just
 * enough of the wire format to extract guild folders without pulling in a
 * full protobuf library.
 */

export type ProtoMessage = Map<number, ProtoValue[]>;
export type ProtoValue = bigint | Uint8Array;

function decodeVarint(buf: Uint8Array, offset: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  let pos = offset;
  while (pos < buf.length) {
    const byte = buf[pos];
    result |= BigInt(byte & 0x7f) << shift;
    pos++;
    if ((byte & 0x80) === 0) break;
    shift += 7n;
  }
  return [result, pos];
}

export function decodeMessage(buf: Uint8Array, start = 0, end?: number): ProtoMessage {
  const message: ProtoMessage = new Map();
  let pos = start;
  const limit = end ?? buf.length;

  while (pos < limit) {
    const [tag, newPos] = decodeVarint(buf, pos);
    pos = newPos;
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 7n);

    let value: ProtoValue;
    switch (wireType) {
      case 0: {
        // varint
        const [v, np] = decodeVarint(buf, pos);
        pos = np;
        value = v;
        break;
      }
      case 1: {
        // 64-bit fixed
        const bytes = buf.slice(pos, pos + 8);
        let v = 0n;
        for (let i = 7; i >= 0; i--) {
          v = (v << 8n) | BigInt(bytes[i]);
        }
        pos += 8;
        value = v;
        break;
      }
      case 2: {
        // length-delimited (string, bytes, embedded message)
        const [len, np] = decodeVarint(buf, pos);
        pos = np;
        const dataEnd = pos + Number(len);
        value = buf.slice(pos, dataEnd);
        pos = dataEnd;
        break;
      }
      case 5: {
        // 32-bit fixed
        const bytes = buf.slice(pos, pos + 4);
        let v = 0;
        for (let i = 3; i >= 0; i--) {
          v = (v << 8) | bytes[i];
        }
        pos += 4;
        value = BigInt(v);
        break;
      }
      default:
        // Unknown wire type — skip the rest (can't determine size)
        return message;
    }

    if (!message.has(fieldNumber)) {
      message.set(fieldNumber, []);
    }
    message.get(fieldNumber)!.push(value);
  }

  return message;
}

// ─── Guild Folder Extraction ──────────────────────────────────

export type GuildFolder = {
  id: string | null;
  guild_ids: string[];
  name: string | null;
  color: number | null;
};

/**
 * Read a snowflake ID from a length-delimited field that wraps a varint.
 */
function readSnowflake(buf: Uint8Array): string {
  const [val] = decodeVarint(buf, 0);
  return val.toString();
}

/**
 * Decode guild folders from Discord's base64-encoded user_settings_proto.
 *
 * Proto path: PreloadedUserSettings → field 3 (GuildFolders) → field 1 (repeated GuildFolder)
 *
 * GuildFolder fields:
 *   1 = id (length-delimited varint snowflake)
 *   2 = repeated guild_ids (length-delimited varint snowflake)
 *   3 = name (string)
 *   4 = color (length-delimited varint)
 */
export function decodeGuildFolders(base64Proto: string): GuildFolder[] {
  try {
    const binary = atob(base64Proto);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buf[i] = binary.charCodeAt(i);
    }

    const root = decodeMessage(buf);

    // Field 3 = GuildFolders wrapper message
    const guildFoldersRaw = root.get(3);
    if (!guildFoldersRaw || guildFoldersRaw.length === 0) return [];

    const guildFoldersMsg = decodeMessage(guildFoldersRaw[0] as Uint8Array);

    // Field 1 = repeated GuildFolder
    const folderEntries = guildFoldersMsg.get(1) || [];

    return folderEntries.map((folderBuf) => {
      const folder = decodeMessage(folderBuf as Uint8Array);

      // Field 1 = id
      const idRaw = folder.get(1);
      let id: string | null = null;
      if (idRaw && idRaw.length > 0) {
        id = readSnowflake(idRaw[0] as Uint8Array);
      }

      // Field 2 = repeated guild_ids
      const guildIdsRaw = folder.get(2) || [];
      const guild_ids = guildIdsRaw.map((raw) => readSnowflake(raw as Uint8Array));

      // Field 3 = name
      const nameRaw = folder.get(3);
      let name: string | null = null;
      if (nameRaw && nameRaw.length > 0) {
        name = new TextDecoder().decode(nameRaw[0] as Uint8Array);
      }

      // Field 4 = color
      const colorRaw = folder.get(4);
      let color: number | null = null;
      if (colorRaw && colorRaw.length > 0) {
        const [val] = decodeVarint(colorRaw[0] as Uint8Array, 0);
        color = Number(val);
      }

      return { id, guild_ids, name, color };
    });
  } catch (err) {
    console.error('[Proto Decode] Failed to decode guild folders:', err);
    return [];
  }
}
