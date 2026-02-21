/**
 * Discord permission bitfield flags.
 * Uses BigInt because Discord permissions exceed 32-bit integer range.
 * @see https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
 */

// General
export const CREATE_INSTANT_INVITE = 1n << 0n;
export const KICK_MEMBERS = 1n << 1n;
export const BAN_MEMBERS = 1n << 2n;
export const ADMINISTRATOR = 1n << 3n;
export const MANAGE_CHANNELS = 1n << 4n;
export const MANAGE_GUILD = 1n << 5n;
export const ADD_REACTIONS = 1n << 6n;
export const VIEW_AUDIT_LOG = 1n << 7n;
export const PRIORITY_SPEAKER = 1n << 8n;
export const STREAM = 1n << 9n;
export const VIEW_CHANNEL = 1n << 10n;
export const SEND_MESSAGES = 1n << 11n;
export const SEND_TTS_MESSAGES = 1n << 12n;
export const MANAGE_MESSAGES = 1n << 13n;
export const EMBED_LINKS = 1n << 14n;
export const ATTACH_FILES = 1n << 15n;
export const READ_MESSAGE_HISTORY = 1n << 16n;
export const MENTION_EVERYONE = 1n << 17n;
export const USE_EXTERNAL_EMOJIS = 1n << 18n;
export const VIEW_GUILD_INSIGHTS = 1n << 19n;
export const CONNECT = 1n << 20n;
export const SPEAK = 1n << 21n;
export const MUTE_MEMBERS = 1n << 22n;
export const DEAFEN_MEMBERS = 1n << 23n;
export const MOVE_MEMBERS = 1n << 24n;
export const USE_VAD = 1n << 25n;
export const CHANGE_NICKNAME = 1n << 26n;
export const MANAGE_NICKNAMES = 1n << 27n;
export const MANAGE_ROLES = 1n << 28n;
export const MANAGE_WEBHOOKS = 1n << 29n;
export const MANAGE_GUILD_EXPRESSIONS = 1n << 30n;
export const USE_APPLICATION_COMMANDS = 1n << 31n;
export const REQUEST_TO_SPEAK = 1n << 32n;
export const MANAGE_EVENTS = 1n << 33n;
export const MANAGE_THREADS = 1n << 34n;
export const CREATE_PUBLIC_THREADS = 1n << 35n;
export const CREATE_PRIVATE_THREADS = 1n << 36n;
export const USE_EXTERNAL_STICKERS = 1n << 37n;
export const SEND_MESSAGES_IN_THREADS = 1n << 38n;
export const USE_EMBEDDED_ACTIVITIES = 1n << 39n;
export const MODERATE_MEMBERS = 1n << 40n;
export const VIEW_CREATOR_MONETIZATION_ANALYTICS = 1n << 41n;
export const USE_SOUNDBOARD = 1n << 42n;
export const CREATE_GUILD_EXPRESSIONS = 1n << 43n;
export const CREATE_EVENTS = 1n << 44n;
export const USE_EXTERNAL_SOUNDS = 1n << 45n;
export const SEND_VOICE_MESSAGES = 1n << 46n;
export const SEND_POLLS = 1n << 49n;
export const USE_EXTERNAL_APPS = 1n << 50n;
