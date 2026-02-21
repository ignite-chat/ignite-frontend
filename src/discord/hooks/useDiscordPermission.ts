import { useMemo } from 'react';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { computeChannelPermissions } from '../utils/permissions';

type Channel = {
  id: string;
  permission_overwrites?: any[];
  [key: string]: any;
};

/**
 * Reactively compute a member's permissions for a specific channel.
 * Pulls guild roles, member data, and current user from stores automatically.
 */
export function useDiscordPermission(guildId: string | undefined, channel: Channel | undefined) {
  const currentUser = useDiscordStore((s) => s.user);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const guildMembers = useDiscordGuildsStore((s) => s.guildMembers);

  return useMemo(() => {
    if (!guildId || !channel || !currentUser?.id) return 0n;

    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) return 0n;

    const guildRoles = guild.roles || [];
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
