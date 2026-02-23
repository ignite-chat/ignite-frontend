import { CircleNotch, FloppyDisk } from '@phosphor-icons/react';
import { Shield, Users, Monitor } from 'lucide-react';
import { Button } from '../../ui/button';
import { Separator } from '../../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { isEveryone } from '@/constants/Roles';
import RoleDisplay from './RoleDisplay';
import RolePermissions from './RolePermissions';

const RoleEditor = ({
  activeRole,
  selectedRoleId,
  roleName,
  onRoleNameChange,
  roleColor,
  onRoleColorChange,
  activePermissions,
  onTogglePermission,
  isDeleting,
  onDeleteRole,
  hasChanged,
  isSaving,
  onSave,
  onReset,
  hasRoles,
}) => {
  if (!activeRole) {
    return (
      <div className="relative flex min-h-[520px] flex-col rounded-lg border border-border">
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
          <h4 className="mb-2 text-lg font-semibold">No Role Selected</h4>
          <p className="mb-4 text-sm text-muted-foreground">
            {!hasRoles
              ? 'Create a new role to get started managing permissions'
              : 'Select a role from the list to view and edit its settings'}
          </p>
        </div>
      </div>
    );
  }

  const everyoneSelected = isEveryone(selectedRoleId);

  return (
    <div className="relative flex min-h-[520px] flex-col rounded-lg border border-border">
      <Tabs
        defaultValue={everyoneSelected ? 'permissions' : 'display'}
        key={selectedRoleId}
        className="flex h-full flex-col"
      >
        <div className="px-5 pt-5">
          <div className="mb-4 truncate text-sm font-bold">
            Editing Role:{' '}
            <span className="text-primary">{activeRole?.name || 'Select a role'}</span>
          </div>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display" className="gap-2">
              <Monitor size={14} /> Display
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield size={14} /> Permissions
            </TabsTrigger>
          </TabsList>
        </div>

        <Separator className="mt-4" />

        <div className="flex-1 overflow-hidden p-5">
          <TabsContent value="display" className="mt-0">
            <RoleDisplay
              isEveryoneRole={everyoneSelected}
              roleName={roleName}
              onRoleNameChange={onRoleNameChange}
              roleColor={roleColor}
              onRoleColorChange={onRoleColorChange}
              isDeleting={isDeleting}
              onDeleteRole={onDeleteRole}
              activeRoleName={activeRole?.name}
            />
          </TabsContent>

          <TabsContent value="permissions" className="mt-0">
            <RolePermissions
              activePermissions={activePermissions}
              onTogglePermission={onTogglePermission}
            />
          </TabsContent>
        </div>

        {hasChanged && (
          <div className="absolute bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
            <span className="text-xs font-medium text-primary">
              Careful — you have unsaved changes!
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onReset}>
                Reset
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <FloppyDisk size={14} />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default RoleEditor;
