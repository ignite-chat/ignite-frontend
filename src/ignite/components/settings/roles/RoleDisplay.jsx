import { CircleNotch } from '@phosphor-icons/react';
import { Trash2, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { COLORS } from '@/ignite/constants/Roles';

const RoleDisplay = ({
  isEveryoneRole,
  roleName,
  onRoleNameChange,
  roleColor,
  onRoleColorChange,
  isDeleting,
  onDeleteRole,
  activeRoleName,
}) => {
  if (isEveryoneRole) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h4 className="mb-2 text-sm font-semibold">Default Permissions</h4>
        <p className="text-sm text-muted-foreground">
          The @everyone role defines the base permissions granted to all members
          of this server. These permissions apply before any other role permissions
          are calculated.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Switch to the Permissions tab to configure default permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase text-muted-foreground">
          Role Name
        </label>
        <Input
          value={roleName}
          onChange={(e) => onRoleNameChange(e.target.value)}
          placeholder="Enter role name..."
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-medium uppercase text-muted-foreground">
          Role Color
        </label>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onRoleColorChange(color.value)}
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

      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-destructive">
          Danger Zone
        </h5>
        <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Delete Role</p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the{' '}
                  <span className="font-bold text-foreground">
                    "{activeRoleName}"
                  </span>{' '}
                  role.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteRole}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Role
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default RoleDisplay;
