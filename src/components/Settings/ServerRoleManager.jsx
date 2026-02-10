import { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Shield, Users, Monitor, Trash2, Check, GripVertical } from 'lucide-react';
import { CircleNotch, FloppyDisk, Shield as ShieldDT, Users as UsersDT, Monitor as MonitorDT } from '@phosphor-icons/react';
import api from '../../api';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog';
import { RolesService } from '../../services/roles.service';
import { useRolesStore } from '../../store/roles.store';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { hexToInt, intToHex } from '../../lib/colors';

const PERMISSIONS_LIST = Object.freeze({
  [1n << 0n]: "Create Instant Invite",
  [1n << 1n]: "Kick Members",
  [1n << 2n]: "Ban Members",
  [1n << 3n]: "Administrator",
  [1n << 4n]: "Manage Channels",
  [1n << 5n]: "Manage Guild",
  [1n << 6n]: "Add Reactions",
  [1n << 7n]: "View Audit Log",
  [1n << 8n]: "Priority Speaker",
  [1n << 9n]: "Stream",
  [1n << 10n]: "View Channel",
  [1n << 11n]: "Send Messages",
  [1n << 12n]: "Send TTS Messages",
  [1n << 13n]: "Manage Messages",
  [1n << 14n]: "Embed Links",
  [1n << 15n]: "Attach Files",
  [1n << 16n]: "Read Message History",
  [1n << 17n]: "Mention Everyone",
  [1n << 18n]: "Use External Emojis",
  [1n << 19n]: "View Guild Insights",
  [1n << 20n]: "Connect",
  [1n << 21n]: "Speak",
  [1n << 22n]: "Mute Members",
  [1n << 23n]: "Deafen Members",
  [1n << 24n]: "Move Members",
  [1n << 25n]: "Use Voice Activity",
  [1n << 26n]: "Change Nickname",
  [1n << 27n]: "Manage Nicknames",
  [1n << 28n]: "Manage Roles",
  [1n << 29n]: "Manage Webhooks",
  [1n << 30n]: "Manage Guild Expressions",
  [1n << 31n]: "Use Application Commands",
  [1n << 32n]: "Request To Speak",
  [1n << 33n]: "Manage Events",
  [1n << 34n]: "Manage Threads",
  [1n << 35n]: "Create Public Threads",
  [1n << 36n]: "Create Private Threads",
  [1n << 37n]: "Use External Stickers",
  [1n << 38n]: "Send Messages In Threads",
  [1n << 39n]: "Use Embedded Activities",
  [1n << 40n]: "Moderate Members",
  [1n << 41n]: "View Monetization Analytics",
  [1n << 42n]: "Use Soundboard",
  [1n << 43n]: "Create Guild Expressions",
  [1n << 44n]: "Create Events",
  [1n << 45n]: "Use External Sounds",
  [1n << 46n]: "Send Voice Messages",
  [1n << 49n]: "Send Polls",
  [1n << 50n]: "Use External Apps",
  [1n << 51n]: "Pin Messages",
  [1n << 52n]: "Bypass Slowmode",
});

const PERMISSION_GROUPS = [
  {
    name: "General Server Permissions",
    permissions: [
      1n << 3n, // Administrator
      1n << 5n, // Manage Guild
      1n << 28n, // Manage Roles
      1n << 4n, // Manage Channels
      1n << 7n, // View Audit Log
      1n << 19n, // View Guild Insights
    ]
  },
  {
    name: "Membership Permissions",
    permissions: [
      1n << 1n, // Kick Members
      1n << 2n, // Ban Members
      1n << 40n, // Moderate Members
      1n << 0n, // Create Invite
      1n << 26n, // Change Nickname
      1n << 27n, // Manage Nicknames
    ]
  },
  {
    name: "Text Channel Permissions",
    permissions: [
      1n << 11n, // Send Messages
      1n << 13n, // Manage Messages
      1n << 38n, // Send in Threads
      1n << 34n, // Manage Threads
      1n << 14n, // Embed Links
      1n << 15n, // Attach Files
      1n << 6n, // Add Reactions
      1n << 18n, // External Emojis
      1n << 37n, // External Stickers
      1n << 17n, // Mention Everyone
    ]
  },
  {
    name: "Voice Channel Permissions",
    permissions: [
      1n << 20n, // Connect
      1n << 21n, // Speak
      1n << 9n, // Stream
      1n << 42n, // Soundboard
      1n << 22n, // Mute Members
      1n << 23n, // Deafen Members
      1n << 24n, // Move Members
      1n << 25n, // VAD
      1n << 8n, // Priority Speaker
    ]
  },
  {
    name: "Advanced / Events",
    permissions: [
      1n << 29n, // Manage Webhooks
      1n << 33n, // Manage Events
      1n << 31n, // App Commands
    ]
  }
];

const COLORS = [
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


const ServerRoleManager = ({ guild }) => {
  const [localRoles, setLocalRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const [activePermissions, setActivePermissions] = useState(0);
  const [originalPermissions, setOriginalPermissions] = useState(0);
  const [roleName, setRoleName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [roleColor, setRoleColor] = useState('');
  const [originalColor, setOriginalColor] = useState('');

  // New state for detecting order changes
  const [originalRoleOrder, setOriginalRoleOrder] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { guildRoles } = useRolesStore();

  // Refs for Drag and Drop
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    const roles = guildRoles[guild.id] || [];
    setLocalRoles(roles);
    // Store array of IDs to compare order later
    setOriginalRoleOrder(roles.map(r => r.id));
  }, [guildRoles, guild.id]);

  useEffect(() => {
    const roleToSelect = selectedRoleId
      ? localRoles.find(r => r.id == selectedRoleId)
      : localRoles[0];

    if (roleToSelect) {
      // Don't overwrite localRoles here, only the active editor state
      if (!selectedRoleId) setSelectedRoleId(roleToSelect.id);

      // Update editor fields if we switched roles
      if (selectedRoleId != roleToSelect.id) {
        const selectedRoleColor = intToHex(roleToSelect.color);

        setActivePermissions(Number(roleToSelect.permissions || 0));
        setOriginalPermissions(Number(roleToSelect.permissions || 0));
        setRoleName(roleToSelect.name || '');
        setOriginalName(roleToSelect.name || '');
        setRoleColor(selectedRoleColor);
        setOriginalColor(selectedRoleColor);

        console.log('Switched selected role, updating editor fields.', {
          roleId: roleToSelect.id,
          permissions: roleToSelect.permissions,
          color: selectedRoleColor,
          name: roleToSelect.name,
        });
      }
    }
  }, [localRoles, selectedRoleId]);

  // Handle Drag Sorting
  const handleSort = () => {
    // Create a copy
    let _roles = [...localRoles];

    // Remove the dragged item
    const draggedItemContent = _roles.splice(dragItem.current, 1)[0];

    // Insert it at new position
    _roles.splice(dragOverItem.current, 0, draggedItemContent);

    // Reset refs
    dragItem.current = null;
    dragOverItem.current = null;

    // Update state
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
      toast.success("Role created");
    } catch (error) {
      toast.error("Failed to create role");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const promises = [];

      // 1. Check if specific role details changed
      if (roleName !== originalName || activePermissions !== originalPermissions || roleColor !== originalColor) {
        promises.push(
          RolesService.updateGuildRole(guild.id, selectedRoleId, {
            name: roleName,
            permissions: activePermissions,
            color: hexToInt(roleColor),
          })
        );
      }

      // 2. Check if order changed
      const currentOrderIds = localRoles.map(r => r.id);
      const hasOrderChanged = JSON.stringify(currentOrderIds) !== JSON.stringify(originalRoleOrder);

      if (hasOrderChanged) {
        // Map roles to { id, position }
        // Assuming index 0 is top (highest position)
        const positions = localRoles.map((role, index) => ({
          id: role.id,
          position: localRoles.length - index - 1 // Reverse index if API expects higher number = higher role
        }));

        // This hits the Bulk Update route
        promises.push(RolesService.updateRolePositions(guild.id, positions));
      }

      await Promise.all(promises);

      toast.success("Changes saved successfully");

      // Sync local original states after save
      setOriginalPermissions(activePermissions);
      setOriginalName(roleName);
      setOriginalColor(roleColor);
      setOriginalRoleOrder(currentOrderIds);

    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (isDeleting || !selectedRoleId) return;
    setIsDeleting(true);
    try {
      console.log('Attempting to delete role:', selectedRoleId, 'in guild:', guild.id);
      await RolesService.deleteGuildRole(guild.id, selectedRoleId);
      toast.success("Role deleted");
      setSelectedRoleId(null);
    } catch (error) {
      toast.error("Failed to delete role");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = (bit) => {
    const bitNum = Number(bit);
    setActivePermissions((prev) => (prev & bitNum ? prev & ~bitNum : prev | bitNum));
  };

  // Check if anything changed (Details OR Order)
  const hasChanged = useMemo(() => {
    const detailsChanged = activePermissions !== originalPermissions ||
      roleName !== originalName ||
      roleColor !== originalColor;

    const currentOrderIds = localRoles.map(r => r.id);
    const orderChanged = JSON.stringify(currentOrderIds) !== JSON.stringify(originalRoleOrder);

    return detailsChanged || orderChanged;
  }, [activePermissions, originalPermissions, roleName, originalName, roleColor, originalColor, localRoles, originalRoleOrder]);

  const activeRole = localRoles.find((role) => role.id == selectedRoleId);

  return (
    <div className="w-full space-y-6 min-w-0">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Role Manager</h3>
        <p className="text-sm text-muted-foreground">
          Adjust role settings and permissions for {guild?.name || 'this server'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {/* Left Column: Role List */}
        <div className="rounded-lg border border-border p-5 h-fit">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
              Roles &mdash; <span className="font-medium normal-case">Drag to reorder</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateRole}
              className="h-8 gap-1.5 border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-500 transition-all font-bold text-xs"
              disabled={isCreating}
            >
              {isCreating ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
              New Role
            </Button>
          </div>
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-1">
              {localRoles.map((role, index) => (
                <div
                  key={role.id}
                  draggable
                  onDragStart={() => (dragItem.current = index)}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative flex items-center group"
                >
                  <div className="absolute -left-2 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-orange-500 p-1 rounded transition-all opacity-0 group-hover:opacity-100 z-10">
                    <GripVertical size={14} />
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      const selectedRoleColor = intToHex(role.color);

                      setSelectedRoleId(role.id);
                      // Manually trigger updates for editor because we aren't relying solely on useEffect for these updates to prevent loops during drag
                      setActivePermissions(Number(role.permissions || 0));
                      setOriginalPermissions(Number(role.permissions || 0));
                      setRoleName(role.name || '');
                      setOriginalName(role.name || '');
                      setRoleColor(selectedRoleColor);
                      setOriginalColor(selectedRoleColor);
                    }}
                    className={cn(
                      "flex-1 justify-start gap-3 h-9 px-3 transition-all",
                      selectedRoleId == role.id
                        ? "bg-orange-500/10 text-orange-500 shadow-sm"
                        : "hover:bg-white/5 opacity-70 hover:opacity-100"
                    )}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.id == selectedRoleId ? roleColor : intToHex(role.color) }}
                    />
                    <span className="truncate text-sm font-semibold tracking-tight">
                      {role.id == selectedRoleId ? roleName : role.name}
                    </span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Tabs Interface */}
        <div className="rounded-lg border border-border flex flex-col min-h-[520px] relative">
          <Tabs value={selectedRoleId ? undefined : "display"} defaultValue="display" className="flex flex-col h-full">
            <div className="px-5 pt-5">
              <div className="mb-4 text-sm font-bold truncate">
                Editing Role: <span className="text-orange-500">{activeRole?.name || 'Select a role'}</span>
              </div>
              <TabsList className="bg-transparent border-b border-white/5 w-full justify-start rounded-none h-auto p-0 gap-6">
                <TabsTrigger
                  value="display"
                  className="gap-2 px-0 py-2 text-sm font-bold bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none shadow-none border-none transition-all opacity-60 data-[state=active]:opacity-100"
                >
                  <Monitor size={16} weight="duotone" />
                  Display
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="gap-2 px-0 py-2 text-sm font-bold bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none shadow-none border-none transition-all opacity-60 data-[state=active]:opacity-100"
                >
                  <Shield size={16} weight="duotone" />
                  Permissions
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator className="mt-4" />

            <div className="flex-1 p-5 overflow-hidden">
              {/* TAB: DISPLAY */}
              <TabsContent value="display" className="mt-0 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Role Name</label>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Enter role name..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Role Color</label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setRoleColor(color.value)}
                        className={`group relative h-10 w-10 rounded-md border-2 transition-all ${roleColor === color.value ? 'border-primary' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {roleColor == color.value && (
                          <Check className="mx-auto text-white drop-shadow-md" size={18} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* DANGER ZONE */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase text-destructive tracking-wider">Danger Zone</h5>
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Delete Role</p>
                      <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8 gap-1.5 px-3 text-xs" disabled={isDeleting}>
                          {isDeleting ? <CircleNotch size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the <span className="font-bold text-foreground">"{activeRole?.name}"</span> role.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteRole}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Role
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: PERMISSIONS */}
              <TabsContent value="permissions" className="mt-0">
                <ScrollArea className="h-[320px] pr-2">
                  <div className="grid gap-3">
                    {PERMISSION_GROUPS.map((group, groupIdx) => (
                      <div key={groupIdx} className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b">
                          {group.name}
                        </h4>
                        <div className="space-y-2">
                          {group.permissions.map((permBit) => {
                            const isEnabled = (activePermissions & Number(permBit)) !== 0;
                            return (
                              <div key={permBit.toString()} className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-medium">{PERMISSIONS_LIST[permBit]}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Allow members to {PERMISSIONS_LIST[permBit].toLowerCase()}.
                                  </p>
                                </div>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => handleToggle(permBit)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>

            {/* Floating Save Bar */}
            {hasChanged && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 rounded-md border border-orange-500/20 bg-orange-500/10 backdrop-blur-md px-4 py-3 animate-in fade-in slide-in-from-bottom-2 z-50 shadow-2xl">
                <span className="text-xs font-bold text-orange-500 tracking-wide">Careful - you have unsaved changes!</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActivePermissions(originalPermissions);
                      setRoleName(originalName);
                      setRoleColor(originalColor);
                      // Reset order
                      const originalRoles = originalRoleOrder
                        .map(id => localRoles.find(r => r.id === id))
                        .filter(Boolean);
                      setLocalRoles(originalRoles);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white border-none font-bold px-4 h-8 shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? <CircleNotch size={14} className="animate-spin" /> : <FloppyDisk size={14} weight="duotone" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ServerRoleManager;