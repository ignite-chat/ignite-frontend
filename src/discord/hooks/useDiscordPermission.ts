import { useMemo } from 'react';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { computeChannelPermissions } from '../utils/permissions';
import {
  SEND_MESSAGES,
  ADD_REACTIONS,
  ATTACH_FILES,
  EMBED_LINKS,
  READ_MESSAGE_HISTORY,
  USE_EXTERNAL_EMOJIS,
  USE_EXTERNAL_STICKERS,
  USE_APPLICATION_COMMANDS,
  SEND_VOICE_MESSAGES,
  SEND_POLLS,
  VIEW_CHANNEL,
} from '../constants/permissions';
import { DM, GROUP_DM } from '../constants/channel-types';

type Channel = {
  id: string;
  type?: number;
  permission_overwrites?: any[];
  [key: string]: any;
};

/**
 * Default permissions for DM / Group DM channels.
 * In DMs, both users can always send messages, react, attach files, etc.
 */
const DM_PERMISSIONS =
  VIEW_CHANNEL |
  SEND_MESSAGES |
  ADD_REACTIONS |
  ATTACH_FILES |
  EMBED_LINKS |
  READ_MESSAGE_HISTORY |
  USE_EXTERNAL_EMOJIS |
  USE_EXTERNAL_STICKERS |
  USE_APPLICATION_COMMANDS |
  SEND_VOICE_MESSAGES |
  SEND_POLLS;

/**
 * Reactively compute a member's permissions for a specific channel.
 * For DM/Group DM channels, returns a default DM permission set.
 * For guild channels, pulls guild roles, member data, and current user from stores.
 */
export function useDiscordPermission(guildId: string | undefined, channel: Channel | undefined) {
  const currentUser = useDiscordStore((s) => s.user);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const guildMembers = useDiscordGuildsStore((s) => s.guildMembers);

  return useMemo(() => {
    if (!channel || !currentUser?.id) return 0n;

    // DM and Group DM channels have a fixed permission set
    if (channel.type === DM || channel.type === GROUP_DM) {
      return DM_PERMISSIONS;
    }

    if (!guildId) return 0n;

    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) return 0n;

    const guildRoles = guild.roles || guild.properties?.roles || [];
    const guildOwnerId = guild.owner_id || guild.properties?.owner_id;
    const userId = currentUser.id;

    const members = guildMembers[guildId] || [];
    const me = members.find((m: any) => m.user?.id === userId || m.user_id === userId);
    const memberRoleIds = me?.roles || [];

    return computeChannelPermissions(channel, memberRoleIds, guildRoles, guildId, guildOwnerId, userId);
  }, [guildId, channel, currentUser?.id, guilds, guildMembers]);
}

/**
 * Check if the current user has a specific permission in a channel.
 */
export function useDiscordHasPermission(
  guildId: string | undefined,
  channel: Channel | undefined,
  permission: bigint,
): boolean {
  const permissions = useDiscordPermission(guildId, channel);
  return (permissions & permission) === permission;
}
