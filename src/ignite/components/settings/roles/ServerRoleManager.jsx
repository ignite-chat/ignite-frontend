import { useEffect, useMemo, useState, useRef } from 'react';
import api from '@/ignite/api';
import { RolesService } from '../../../services/roles.service';
import { useRolesStore } from '@/ignite/store/roles.store';
import { useGuildsStore } from '@/ignite/store/guilds.store';
import { toast } from 'sonner';
import { EVERYONE_ROLE_ID, isEveryone, hexToInt, intToHex } from '@/ignite/constants/Roles';
import RoleList from './RoleList';
import RoleEditor from './RoleEditor';

const ServerRoleManager = ({ guild }) => {
  const [localRoles, setLocalRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(EVERYONE_ROLE_ID);

  const [activePermissions, setActivePermissions] = useState(0n);
  const [originalPermissions, setOriginalPermissions] = useState(0n);
  const [roleName, setRoleName] = useState('@everyone');
  const [originalName, setOriginalName] = useState('@everyone');
  const [roleColor, setRoleColor] = useState('#99aab5');
  const [originalColor, setOriginalColor] = useState('#99aab5');

  const [originalRoleOrder, setOriginalRoleOrder] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { guildRoles } = useRolesStore();

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Sync roles from store
  useEffect(() => {
    const roles = guildRoles[guild.id] || [];
    const uniqueRoles = roles.reduce((acc, role) => {
      if (!acc.find((r) => r.id === role.id)) {
        acc.push(role);
      }
      return acc;
    }, []);
    setLocalRoles(uniqueRoles);
    setOriginalRoleOrder(uniqueRoles.map((r) => r.id));
  }, [guildRoles, guild.id]);

  // Initialize @everyone permissions on mount
  useEffect(() => {
    if (selectedRoleId === EVERYONE_ROLE_ID) {
      const perms = BigInt(guild.default_permissions || 0);
      setActivePermissions(perms);
      setOriginalPermissions(perms);
    }
  }, [guild.default_permissions]);

  // Build the @everyone pseudo-role
  const everyoneEntry = useMemo(
    () => ({
      id: EVERYONE_ROLE_ID,
      name: '@everyone',
      color: 0,
      permissions: guild.default_permissions || 0,
    }),
    [guild.default_permissions]
  );

  const activeRole = isEveryone(selectedRoleId)
    ? everyoneEntry
    : localRoles.find((role) => role.id === selectedRoleId) || null;

  // Role selection
  const handleSelectRole = (roleId) => {
    setSelectedRoleId(roleId);

    if (isEveryone(roleId)) {
      const perms = BigInt(guild.default_permissions || 0);
      setActivePermissions(perms);
      setOriginalPermissions(perms);
      setRoleName('@everyone');
      setOriginalName('@everyone');
      setRoleColor('#99aab5');
      setOriginalColor('#99aab5');
    } else {
      const role = localRoles.find((r) => r.id === roleId);
      if (!role) return;
      const color = intToHex(role.color);
      setActivePermissions(BigInt(role.permissions || 0));
      setOriginalPermissions(BigInt(role.permissions || 0));
      setRoleName(role.name || '');
      setOriginalName(role.name || '');
      setRoleColor(color);
      setOriginalColor(color);
    }
  };

  // Drag-and-drop sorting
  const handleSort = () => {
    let _roles = [...localRoles];
    const draggedItemContent = _roles.splice(dragItem.current, 1)[0];
    _roles.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setLocalRoles(_roles);
  };

  const handleCreateRole = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await RolesService.createGuildRole(guild.id, {
        name: 'new role',
        permissions: 0,
      });
    } catch (error) {
      toast.error('Failed to create role');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const promises = [];

      if (isEveryone(selectedRoleId)) {
        // @everyone: update guild default_permissions
        if (activePermissions !== originalPermissions) {
          promises.push(
            api
              .patch(`/guilds/${guild.id}/profile`, {
                default_permissions: activePermissions.toString(),
              })
              .then(() => {
                const { editGuild } = useGuildsStore.getState();
                editGuild(guild.id, { default_permissions: activePermissions });
              })
          );
        }
      } else {
        // Regular role update
        if (
          roleName !== originalName ||
          activePermissions !== originalPermissions ||
          roleColor !== originalColor
        ) {
          promises.push(
            RolesService.updateGuildRole(guild.id, selectedRoleId, {
              name: roleName,
              permissions: activePermissions.toString(),
              color: hexToInt(roleColor),
            })
          );
        }

        // Order changes
        const currentOrderIds = localRoles.map((r) => r.id);
        const hasOrderChanged =
          JSON.stringify(currentOrderIds) !== JSON.stringify(originalRoleOrder);

        if (hasOrderChanged) {
          const positions = localRoles.map((role, index) => ({
            id: role.id,
            position: localRoles.length - index - 1,
          }));
          promises.push(RolesService.updateRolePositions(guild.id, positions));
        }
      }

      await Promise.all(promises);
      toast.success('Changes saved successfully');

      // Sync originals after save
      setOriginalPermissions(activePermissions);
      setOriginalName(roleName);
      setOriginalColor(roleColor);
      if (!isEveryone(selectedRoleId)) {
        setOriginalRoleOrder(localRoles.map((r) => r.id));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (isDeleting || !selectedRoleId || isEveryone(selectedRoleId)) return;
    setIsDeleting(true);
    try {
      await RolesService.deleteGuildRole(guild.id, selectedRoleId);
      toast.success('Role deleted');
      setSelectedRoleId(EVERYONE_ROLE_ID);
      // Reset to @everyone
      const perms = BigInt(guild.default_permissions || 0);
      setActivePermissions(perms);
      setOriginalPermissions(perms);
      setRoleName('@everyone');
      setOriginalName('@everyone');
      setRoleColor('#99aab5');
      setOriginalColor('#99aab5');
    } catch (error) {
      toast.error('Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = (bit) => {
    setActivePermissions((prev) => (prev & bit ? prev & ~bit : prev | bit));
  };

  const handleReset = () => {
    setActivePermissions(originalPermissions);
    setRoleName(originalName);
    setRoleColor(originalColor);
    // Reset order for real roles
    if (!isEveryone(selectedRoleId)) {
      const originalRoles = originalRoleOrder
        .map((id) => localRoles.find((r) => r.id === id))
        .filter(Boolean);
      setLocalRoles(originalRoles);
    }
  };

  const hasChanged = useMemo(() => {
    const detailsChanged =
      activePermissions !== originalPermissions ||
      roleName !== originalName ||
      roleColor !== originalColor;

    const currentOrderIds = localRoles.map((r) => r.id);
    const orderChanged =
      JSON.stringify(currentOrderIds) !== JSON.stringify(originalRoleOrder);

    return detailsChanged || orderChanged;
  }, [
    activePermissions,
    originalPermissions,
    roleName,
    originalName,
    roleColor,
    originalColor,
    localRoles,
    originalRoleOrder,
  ]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Role Manager</h3>
        <p className="text-sm text-muted-foreground">
          Adjust role settings and permissions for {guild?.name || 'this server'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <RoleList
          roles={localRoles}
          selectedRoleId={selectedRoleId}
          roleName={roleName}
          roleColor={roleColor}
          onSelectRole={handleSelectRole}
          onCreateRole={handleCreateRole}
          isCreating={isCreating}
          onDragStart={(index) => (dragItem.current = index)}
          onDragEnter={(index) => (dragOverItem.current = index)}
          onDragEnd={handleSort}
        />

        <RoleEditor
          activeRole={activeRole}
          selectedRoleId={selectedRoleId}
          roleName={roleName}
          onRoleNameChange={setRoleName}
          roleColor={roleColor}
          onRoleColorChange={setRoleColor}
          activePermissions={activePermissions}
          onTogglePermission={handleToggle}
          isDeleting={isDeleting}
          onDeleteRole={handleDeleteRole}
          hasChanged={hasChanged}
          isSaving={isSaving}
          onSave={handleSave}
          onReset={handleReset}
          hasRoles={localRoles.length > 0}
        />
      </div>
    </div>
  );
};

export default ServerRoleManager;
