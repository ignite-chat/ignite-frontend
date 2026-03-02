import { CircleNotch } from '@phosphor-icons/react';
import { Plus, Shield, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EVERYONE_ROLE_ID, intToHex } from '@/ignite/constants/Roles';

const RoleList = ({
  roles,
  selectedRoleId,
  roleName,
  roleColor,
  onSelectRole,
  onCreateRole,
  isCreating,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) => {
  return (
    <div className="h-fit rounded-lg border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Roles &mdash;{' '}
          <span className="text-[10px] normal-case opacity-70">Drag to reorder</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCreateRole}
          className="gap-2"
          disabled={isCreating}
        >
          {isCreating ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} />}
          New Role
        </Button>
      </div>
      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-1">
          {/* Real roles — draggable */}
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <Shield className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-1 text-sm font-medium text-muted-foreground">No roles yet</p>
              <p className="text-xs text-muted-foreground/70">
                Create your first role to get started
              </p>
            </div>
          ) : (
            roles.map((role, index) => (
              <div
                key={role.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragEnter={() => onDragEnter(index)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="group flex items-center gap-1"
              >
                <div className="cursor-grab rounded p-1 text-muted-foreground/50 opacity-0 transition-colors hover:text-foreground active:cursor-grabbing group-hover:opacity-100">
                  <GripVertical size={14} />
                </div>

                <Button
                  variant="ghost"
                  onClick={() => onSelectRole(role.id)}
                  className={`flex-1 justify-start gap-3 ${selectedRoleId === role.id ? 'bg-primary/10 text-primary' : ''}`}
                >
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        role.id === selectedRoleId ? roleColor : intToHex(role.color),
                    }}
                  />
                  <span className="truncate">
                    {role.id === selectedRoleId ? roleName : role.name}
                  </span>
                </Button>
              </div>
            ))
          )}

          <Separator className="my-1" />

          {/* @everyone entry — always last, not draggable */}
          <div className="group flex items-center gap-1">
            <div className="w-[22px]" />
            <Button
              variant="ghost"
              onClick={() => onSelectRole(EVERYONE_ROLE_ID)}
              className={`flex-1 justify-start gap-3 ${selectedRoleId === EVERYONE_ROLE_ID ? 'bg-primary/10 text-primary' : ''}`}
            >
              <div
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: '#99aab5' }}
              />
              <span className="truncate">@everyone</span>
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RoleList;
