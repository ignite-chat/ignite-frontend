import { toast } from 'sonner';
import api from '../api.js';
import { useRolesStore } from '../store/roles.store.js';
import { useGuildsStore } from '../store/guilds.store.js';
import type { RoleEvent } from '../handlers/types';

export type CreateRolePayload = {
  name: string;
};

export type UpdateRolePayload = {
  name?: string | null;
  color?: number | null;
  permissions?: number | null;
  position?: number | null;
  hoist?: boolean | null;
  mentionable?: boolean | null;
};

export const RolesService = {
  /**
   * Initialize roles for each guild by guild.roles or fetching from Ignite API if not present.
   */
  async initializeGuildRoles() {
    const { setGuildRoles } = useRolesStore.getState();
    const { guilds } = useGuildsStore.getState();

    for (const guild of guilds) {
      if (guild.roles) {
        // Use existing roles from guild object
        setGuildRoles(guild.id, guild.roles);

        console.log(`Loaded roles for guild ${guild.id} from existing data.`);
      } else {
        // Unimplemented: Fetch roles from Ignite API
        console.error(
          `Roles for guild ${guild.id} not found locally. Fetching from Ignite API is unimplemented.`
        );
      }
    }
  },

  /**
   * Create a new role in the specified guild and update the local store.
   */
  async createGuildRole(guildId: string, roleData: CreateRolePayload) {
    try {
      await api.post(`/guilds/${guildId}/roles`, roleData);

      toast.success('Role created successfully');
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('Failed to create role');
    }
  },

  /**
   * Update an existing role in the specified guild and update the local store.
   */
  async updateGuildRole(guildId: string, roleId: string, updates: UpdateRolePayload) {
    await api.patch(`/guilds/${guildId}/roles/${roleId}`, updates);

    // Update role in local store
    const { guildRoles, setGuildRoles } = useRolesStore.getState();
    const roles = guildRoles[guildId] || [];
    const updatedRoles = roles.map((role) => (role.id === roleId ? { ...role, ...updates } : role));
    setGuildRoles(guildId, updatedRoles);
  },

  /**
   * Delete a role from the specified guild and update the local store.
   */
  async deleteGuildRole(guildId: string, roleId: string) {
    try {
      await api.delete(`/guilds/${guildId}/roles/${roleId}`);

      // Remove role from local store
      const { guildRoles, setGuildRoles } = useRolesStore.getState();
      const roles = guildRoles[guildId] || [];
      const updatedRoles = roles.filter((role) => role.id !== roleId);
      setGuildRoles(guildId, updatedRoles);

      toast.success('Role deleted successfully');
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Failed to delete role');
    }
  },

  /**
   * Update roles for a member in the specified guild.
   */
  async updateMemberRoles(guildId: string, memberId: string, roleIds: string[]) {
    try {
      await api.patch(`/guilds/${guildId}/members/${memberId}`, {
        roles: roleIds,
      });

      toast.success('Member roles updated successfully');
    } catch (error) {
      console.error('Failed to update member roles:', error);
      toast.error('Failed to update member roles');
    }
  },

  /**
   * Assign a role to a member in the specified guild.
   */
  async assignRoleToMember(guildId: string, memberId: string, roleId: string) {
    const { guilds, guildMembers } = useGuildsStore.getState();

    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    const member = guildMembers[guildId].find((m) => m.user_id === memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    const currentRoleIds = (member.roles || []).map((r) => r.id);
    const updatedRoles = Array.from(new Set([...currentRoleIds, roleId]));

    await api.patch(`/guilds/${guildId}/members/${memberId}`, {
      roles: updatedRoles,
    });
  },

  /**
   * Remove a role from a member in the specified guild.
   */
  async removeRoleFromMember(guildId: string, memberId: string, roleId: string) {
    const { guilds, guildMembers } = useGuildsStore.getState();

    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) {
      toast.error('Guild not found');
      return;
    }

    const member = guildMembers[guildId].find((m) => m.user_id === memberId);
    if (!member) {
      toast.error('Member not found');
      return;
    }

    const currentRoleIds = (member.roles || []).map((r) => r.id);
    const updatedRoles = currentRoleIds.filter((rid) => rid !== roleId);

    await api.patch(`/guilds/${guildId}/members/${memberId}`, {
      roles: updatedRoles,
    });
  },

  /**
   * Check if member has a specific role in the specified guild.
   */
  memberHasRole(guildId: string, memberId: string, roleId: string): boolean {
    const { guilds, guildMembers } = useGuildsStore.getState();

    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) {
      console.error('Guild not found');
      return false;
    }

    const member = guildMembers[guildId].find((m) => m.user_id === memberId);
    if (!member) {
      console.error('Member not found');
      return false;
    }

    const currentRoleIds = (member.roles || []).map((r) => r.id);
    return currentRoleIds.includes(roleId);
  },

  handleRoleCreated(event: RoleEvent) {
    const { role } = event;
    const guildId = role.guild_id;
    const { guildRoles, setGuildRoles } = useRolesStore.getState();
    const roles = guildRoles[guildId] || [];
    setGuildRoles(guildId, [...roles, role]);
  },

  handleRoleUpdated(event: RoleEvent) {
    const { role } = event;
    const guildId = role.guild_id;
    const { guildRoles, setGuildRoles } = useRolesStore.getState();
    const roles = guildRoles[guildId] || [];
    const updatedRoles = roles.map((r) => (r.id === role.id ? role : r));
    setGuildRoles(guildId, updatedRoles);
  },

  handleRoleDeleted(event: RoleEvent) {
    const { role } = event;
    const guildId = role.guild_id;
    const { guildRoles, setGuildRoles } = useRolesStore.getState();
    const roles = guildRoles[guildId] || [];
    const updatedRoles = roles.filter((r) => r.id !== role.id);
    setGuildRoles(guildId, updatedRoles);
  },
};
