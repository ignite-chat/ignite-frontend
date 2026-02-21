import { ADMINISTRATOR } from '../constants/permissions';

type PermissionOverwrite = {
  id: string;
  type: number; // 0 = role, 1 = member
  allow: string;
  deny: string;
};

type Role = {
  id: string;
  permissions: string;
  [key: string]: any;
};

type Channel = {
  id: string;
  permission_overwrites?: PermissionOverwrite[];
  [key: string]: any;
};

/**
 * Compute the effective permissions for a member in a guild (base, no channel overwrites).
 */
export function computeBasePermissions(
  memberRoleIds: string[],
  guildRoles: Role[],
  guildId: string,
  guildOwnerId: string | undefined,
  userId: string,
): bigint {
  if (userId === guildOwnerId) return ~0n;

  const roleMap = new Map(guildRoles.map((r) => [r.id, r]));

  const everyoneRole = roleMap.get(guildId);
  let permissions = everyoneRole ? BigInt(everyoneRole.permissions) : 0n;

  for (const roleId of memberRoleIds) {
    const role = roleMap.get(roleId);
    if (role) {
      permissions |= BigInt(role.permissions);
    }
  }

  if ((permissions & ADMINISTRATOR) === ADMINISTRATOR) return ~0n;

  return permissions;
}

/**
 * Compute the effective permissions for a member in a specific channel.
 * Follows Discord's permission resolution algorithm:
 * https://discord.com/developers/docs/topics/permissions#permission-overwrites
 */
export function computeChannelPermissions(
  channel: Channel,
  memberRoleIds: string[],
  guildRoles: Role[],
  guildId: string,
  guildOwnerId: string | undefined,
  userId: string,
): bigint {
  const basePermissions = computeBasePermissions(memberRoleIds, guildRoles, guildId, guildOwnerId, userId);

  if (basePermissions === ~0n) return ~0n;

  const overwrites = channel.permission_overwrites || [];
  let permissions = basePermissions;

  // 1. Apply @everyone overwrite
  const everyoneOverwrite = overwrites.find((o) => o.id === guildId);
  if (everyoneOverwrite) {
    permissions &= ~BigInt(everyoneOverwrite.deny);
    permissions |= BigInt(everyoneOverwrite.allow);
  }

  // 2. Apply role-specific overwrites (type 0 = role)
  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const overwrite of overwrites) {
    if (overwrite.type === 0 && overwrite.id !== guildId && memberRoleIds.includes(overwrite.id)) {
      roleAllow |= BigInt(overwrite.allow);
      roleDeny |= BigInt(overwrite.deny);
    }
  }
  permissions &= ~roleDeny;
  permissions |= roleAllow;

  // 3. Apply member-specific overwrite (type 1 = member)
  const memberOverwrite = overwrites.find((o) => o.type === 1 && o.id === userId);
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return permissions;
}
