import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { PERMISSIONS_LIST, PERMISSION_GROUPS } from '@/ignite/constants/Roles';

const RolePermissions = ({ activePermissions, onTogglePermission }) => {
  return (
    <ScrollArea className="h-[320px] pr-2">
      <div className="grid gap-3">
        {PERMISSION_GROUPS.role.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-3">
            <h4 className="sticky top-0 z-10 border-b bg-background/95 py-2 text-xs font-bold uppercase text-muted-foreground backdrop-blur">
              {group.name}
            </h4>
            <div className="space-y-2">
              {group.permissions.map((permBit) => {
                const isEnabled = (activePermissions & permBit) !== 0n;
                return (
                  <div
                    key={permBit.toString()}
                    className="flex items-center justify-between rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-accent/30"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {PERMISSIONS_LIST[permBit]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Allow members to {PERMISSIONS_LIST[permBit].toLowerCase()}.
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => onTogglePermission(permBit)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default RolePermissions;
