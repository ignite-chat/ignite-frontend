export const EVERYONE_ROLE_ID = '@everyone';

export const isEveryone = (id) => id === EVERYONE_ROLE_ID;

export const PERMISSIONS_LIST = Object.freeze({
  [1n << 0n]: 'Create Instant Invite',
  [1n << 1n]: 'Kick Members',
  [1n << 2n]: 'Ban Members',
  [1n << 3n]: 'Administrator',
  [1n << 4n]: 'Manage Channels',
  [1n << 5n]: 'Manage Guild',
  [1n << 6n]: 'Add Reactions',
  [1n << 7n]: 'View Audit Log',
  [1n << 8n]: 'Priority Speaker',
  [1n << 9n]: 'Stream',
  [1n << 10n]: 'View Channel',
  [1n << 11n]: 'Send Messages',
  [1n << 12n]: 'Send TTS Messages',
  [1n << 13n]: 'Manage Messages',
  [1n << 14n]: 'Embed Links',
  [1n << 15n]: 'Attach Files',
  [1n << 16n]: 'Read Message History',
  [1n << 17n]: 'Mention Everyone',
  [1n << 18n]: 'Use External Emojis',
  [1n << 19n]: 'View Guild Insights',
  [1n << 20n]: 'Connect',
  [1n << 21n]: 'Speak',
  [1n << 22n]: 'Mute Members',
  [1n << 23n]: 'Deafen Members',
  [1n << 24n]: 'Move Members',
  [1n << 25n]: 'Use Voice Activity',
  [1n << 26n]: 'Change Nickname',
  [1n << 27n]: 'Manage Nicknames',
  [1n << 28n]: 'Manage Roles',
  [1n << 29n]: 'Manage Webhooks',
  [1n << 30n]: 'Manage Guild Expressions',
  [1n << 31n]: 'Use Application Commands',
  [1n << 32n]: 'Request To Speak',
  [1n << 33n]: 'Manage Events',
  [1n << 34n]: 'Manage Threads',
  [1n << 35n]: 'Create Public Threads',
  [1n << 36n]: 'Create Private Threads',
  [1n << 37n]: 'Use External Stickers',
  [1n << 38n]: 'Send Messages In Threads',
  [1n << 39n]: 'Use Embedded Activities',
  [1n << 40n]: 'Moderate Members',
  [1n << 41n]: 'View Monetization Analytics',
  [1n << 42n]: 'Use Soundboard',
  [1n << 43n]: 'Create Guild Expressions',
  [1n << 44n]: 'Create Events',
  [1n << 45n]: 'Use External Sounds',
  [1n << 46n]: 'Send Voice Messages',
  [1n << 49n]: 'Send Polls',
  [1n << 50n]: 'Use External Apps',
  [1n << 51n]: 'Pin Messages',
  [1n << 52n]: 'Bypass Slowmode',
});

const _generalChannelPermissions = {
  name: 'General Channel Permissions',
  permissions: [
    1n << 10n, // View Channel
    1n << 4n,  // Manage Channel
    1n << 29n, // Manage Webhooks
    1n << 0n,  // Create Instant Invite
  ],
};

const _textPermissions = {
  name: 'Text Channel Permissions',
  permissions: [
    1n << 11n, // Send Messages
    1n << 16n, // Read Message History
    1n << 13n, // Manage Messages
    1n << 51n, // Pin Messages
    1n << 14n, // Embed Links
    1n << 15n, // Attach Files
    1n << 6n,  // Add Reactions
    1n << 18n, // Use External Emojis
    1n << 37n, // Use External Stickers
    1n << 17n, // Mention Everyone
    1n << 12n, // Send TTS Messages
    1n << 31n, // Use Application Commands
    1n << 46n, // Send Voice Messages
    1n << 49n, // Send Polls
    1n << 52n, // Bypass Slowmode
  ],
};

const _voicePermissions = {
  name: 'Voice Channel Permissions',
  permissions: [
    1n << 20n, // Connect
    1n << 21n, // Speak
    1n << 9n,  // Stream
    1n << 25n, // Use Voice Activity
    1n << 8n,  // Priority Speaker
    1n << 42n, // Use Soundboard
    1n << 45n, // Use External Sounds
    1n << 22n, // Mute Members
    1n << 23n, // Deafen Members
    1n << 24n, // Move Members
  ],
};

export const PERMISSION_GROUPS = {
  role: [
    {
      name: 'General Server Permissions',
      permissions: [
        1n << 3n,  // Administrator
        1n << 5n,  // Manage Guild
        1n << 28n, // Manage Roles
        1n << 4n,  // Manage Channels
        1n << 7n,  // View Audit Log
        1n << 30n, // Manage Guild Expressions
        1n << 29n, // Manage Webhooks
        1n << 33n, // Manage Events
      ],
    },
    {
      name: 'Membership Permissions',
      permissions: [
        1n << 1n,  // Kick Members
        1n << 2n,  // Ban Members
        1n << 40n, // Moderate Members
        1n << 0n,  // Create Instant Invite
        1n << 26n, // Change Nickname
        1n << 27n, // Manage Nicknames
      ],
    },
    _textPermissions,
    _voicePermissions,
  ],

  text: [
    _generalChannelPermissions,
    _textPermissions,
  ],

  voice: [
    _generalChannelPermissions,
    _voicePermissions,
  ],

  category: [
    _generalChannelPermissions,
    _textPermissions,
    _voicePermissions,
  ],
};

export const COLORS = [
  { name: 'Default', value: '#99aab5' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Brown', value: '#a0522d' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
];

export const hexToInt = (hex) => {
  if (!hex) return 0;
  return parseInt(hex.replace('#', ''), 16);
};

export const intToHex = (intColor) => {
  return `#${intColor.toString(16).padStart(6, '0')}`;
};
