import { Permissions } from '@/ignite/constants/Permissions';
import { useGuildsStore } from '@/ignite/store/guilds.store';
import { useRolesStore } from '@/ignite/store/roles.store';
import { useUsersStore } from '@/ignite/store/users.store';

export const PermissionsService = {
  /**
   * Checks if the current user has the specified permission in a given guild and channel.
   *
   * @param guildId The ID of the guild.
   * @param channelId The ID of the channel (or null for guild-level permissions).
   * @param permission The permission to check
   * @return True if the user has the permission, false otherwise.
   */
  hasPermission: (guildId: string, channelId: string | null, permission: bigint): boolean => {
    const localUser = useUsersStore.getState().getCurrentUser();
    const guild = useGuildsStore.getState().guilds.find((g) => g.id === guildId);

    if (!guild || !permission || !localUser) return false;

    // Guild owner has all permissions
    if (guild.owner_id === localUser.id) {
      return true;
    }

    const guildMembers = useGuildsStore.getState().guildMembers[guildId] || [];
    const guildRoles = useRolesStore.getState().guildRoles[guildId] || [];

    // Get the current user's member object in the guild
    const member = guildMembers.find((m) => m.user_id === localUser.id);

    if (!member) return false;

    // Get all role IDs assigned to the member
    const memberRoleIds = member.roles.map((role) => role.id);

    // Get roles from the roles store
    const memberRoles = guildRoles.filter((role) => memberRoleIds.includes(role.id));

    // Calculate guild-level permissions
    let permissions = BigInt(0n);

    // Start with @everyone role permissions from guild.default_permissions
    if (guild.default_permissions) {
      permissions |= BigInt(guild.default_permissions);
    }

    // Add permissions from user's roles
    for (const role of memberRoles) {
      const rolePermissions = BigInt(role.permissions);
      permissions |= rolePermissions;

      // If user has ADMINISTRATOR, they have all permissions (except in channel overrides)
      if (rolePermissions & Permissions.ADMINISTRATOR) {
        return true;
      }
    }

    // If no channel specified, check guild-level permissions
    if (!channelId) {
      return (permissions & permission) === permission;
    }

    // Apply channel-level permission overrides
    const channel = guild.channels?.find((c) => c.channel_id === channelId);
    if (!channel) return false;

    // Apply @everyone channel overrides
    const everyoneChannelAllowed = BigInt(channel.allowed_permissions || 0);
    const everyoneChannelDenied = BigInt(channel.denied_permissions || 0);

    // Apply denied permissions for @everyone
    permissions &= ~everyoneChannelDenied;
    // Apply allowed permissions for @everyone
    permissions |= everyoneChannelAllowed;

    // Apply role-specific channel overrides
    const rolePermissions = channel.role_permissions || [];
    for (const roleId of memberRoleIds) {
      const roleOverride = rolePermissions.find((rp) => rp.role_id === roleId);
      if (roleOverride) {
        const allowed = BigInt(roleOverride.allowed_permissions || 0);
        const denied = BigInt(roleOverride.denied_permissions || 0);

        // Apply denied permissions
        permissions &= ~denied;
        // Apply allowed permissions
        permissions |= allowed;
      }
    }

    // Check if the user has the requested permission
    return (permissions & permission) === permission;
  },
};
