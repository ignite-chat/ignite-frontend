import { useMemo } from 'react';
import { useGuildsStore } from '@/store/guilds.store';
import { useChannelsStore } from '@/store/channels.store';
import { useRolesStore } from '@/store/roles.store';
import { useUsersStore } from '@/store/users.store';
import { Permissions } from '@/constants/Permissions';

export const useHasPermission = (
  guildId: string | undefined,
  channelId: string | null,
  permission: bigint
): boolean => {
  const guilds = useGuildsStore((s) => s.guilds);
  const guildMembers = useGuildsStore((s) => s.guildMembers);
  const channels = useChannelsStore((s) => s.channels);
  const guildRoles = useRolesStore((s) => s.guildRoles);
  const users = useUsersStore((s) => s.users);
  const getCurrentUser = useUsersStore((s) => s.getCurrentUser);

  return useMemo(() => {
    if (!guildId || !permission) return false;

    const localUser = getCurrentUser();
    const guild = guilds.find((g) => g.id === guildId);

    if (!guild || !localUser) return false;

    if (guild.owner_id === localUser.id) return true;

    const members = guildMembers[guildId] || [];
    const roles = guildRoles[guildId] || [];

    const member = members.find((m: any) => m.user_id === localUser.id);
    if (!member) return false;

    const memberRoleIds = member.roles.map((role: any) => role.id);
    const memberRoles = roles.filter((role: any) => memberRoleIds.includes(role.id));

    let permissions = 0n;

    if (guild.default_permissions) {
      permissions |= BigInt(guild.default_permissions);
    }

    for (const role of memberRoles) {
      const rolePermissions = BigInt(role.permissions);
      permissions |= rolePermissions;

      if (rolePermissions & Permissions.ADMINISTRATOR) {
        return true;
      }
    }

    if (!channelId) {
      return (permissions & permission) === permission;
    }

    const channel = channels.find((c: any) => String(c.channel_id) === String(channelId));
    if (!channel) return false;

    const everyoneChannelAllowed = BigInt(channel.allowed_permissions || 0);
    const everyoneChannelDenied = BigInt(channel.denied_permissions || 0);

    permissions &= ~everyoneChannelDenied;
    permissions |= everyoneChannelAllowed;

    const rolePermissions = channel.role_permissions || [];
    for (const roleId of memberRoleIds) {
      const roleOverride = rolePermissions.find((rp: any) => rp.role_id === roleId);
      if (roleOverride) {
        const allowed = BigInt(roleOverride.allowed_permissions || 0);
        const denied = BigInt(roleOverride.denied_permissions || 0);

        permissions &= ~denied;
        permissions |= allowed;
      }
    }

    return (permissions & permission) === permission;
  }, [guildId, channelId, permission, guilds, channels, guildMembers, guildRoles, users, getCurrentUser]);
};
