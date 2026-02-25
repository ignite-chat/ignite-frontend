import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Info, Lock, FloppyDisk, Check } from '@phosphor-icons/react';
import { Slash } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChannelsService } from '../../services/channels.service';
import { Permissions } from '@/constants/Permissions';
import { PERMISSION_GROUPS, PERMISSIONS_LIST, intToHex } from '@/constants/Roles';
import { useHasPermission } from '@/hooks/useHasPermission';
import { toast } from 'sonner';
import { useModalStore } from '@/store/modal.store';
import { useRolesStore } from '@/store/roles.store';
import { ChannelType } from '@/constants/ChannelType';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const OverviewTab = ({ guild, channel, isCategory }) => {
  const [name, setName] = useState(channel?.name || '');
  const [description, setDescription] = useState(channel?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const canManageChannels = useHasPermission(guild?.id, null, Permissions.MANAGE_CHANNELS);

  useEffect(() => {
    setName(channel?.name || '');
    setDescription(channel?.description || '');
  }, [channel]);

  const hasChanged = useMemo(() => {
    return name !== (channel?.name || '') || description !== (channel?.description || '');
  }, [name, description, channel]);

  const handleSave = async () => {
    if (!canManageChannels) {
      toast.error('You do not have permission to manage channels.');
      return;
    }
    if (!hasChanged) return;
    setIsSaving(true);

    try {
      await ChannelsService.updateGuildChannel(guild.id, channel.channel_id, {
        name,
        description,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-10 py-8">
        <div className="flex max-w-lg flex-col gap-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {isCategory ? 'Category Name' : 'Channel Name'}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCategory ? 'Enter category name' : 'Enter channel name'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {isCategory ? 'Category Description' : 'Channel Description'}
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isCategory ? 'Enter category description' : 'Enter channel description'}
            />
          </div>
        </div>
      </ScrollArea>

      <div
        className={cn(
          'px-10 py-4 transition-all duration-300',
          hasChanged ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <Separator className="mb-4" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Careful — you have unsaved changes!</span>
          <Button
            onClick={handleSave}
            disabled={!hasChanged || isSaving || !canManageChannels}
            className={cn(
              hasChanged && canManageChannels
                ? 'bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-500'
                : ''
            )}
          >
            <FloppyDisk size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const PermissionRow = ({ label, state, onAllow, onDeny, onReset }) => {
  return (
    <div className="flex items-center justify-between rounded px-2 py-3 transition-colors hover:bg-muted/50">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center shadow-sm">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDeny}
          className={cn(
            'h-8 w-8 rounded-none rounded-l border-r-0',
            state === 0
              ? 'border-red-500 bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500'
              : 'hover:text-red-400'
          )}
        >
          <X weight="bold" size={14} />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onReset}
          className={cn(
            'h-8 w-8 rounded-none',
            state === 1
              ? 'bg-muted/60 text-foreground hover:bg-muted/60'
              : ''
          )}
        >
          <Slash size={14} />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAllow}
          className={cn(
            'h-8 w-8 rounded-none rounded-r border-l-0',
            state === 2
              ? 'border-green-500 bg-green-500/20 text-green-500 hover:bg-green-500/30 hover:text-green-500'
              : 'hover:text-green-400'
          )}
        >
          <Check weight="bold" size={14} />
        </Button>
      </div>
    </div>
  );
};

const EVERYONE_ID = '__everyone__';

const PermissionsTab = ({ guild, channel }) => {
  const [selectedRoleId, setSelectedRoleId] = useState(EVERYONE_ID);
  const rolesList = useRolesStore((s) => s.guildRoles[guild?.id]) ?? [];
  const [savedPermissionsByRole, setSavedPermissionsByRole] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [allowedPermissions, setAllowedPermissions] = useState(0n);
  const [deniedPermissions, setDeniedPermissions] = useState(0n);

  const isEveryone = selectedRoleId === EVERYONE_ID;
  const canManageChannels = useHasPermission(guild?.id, null, Permissions.MANAGE_CHANNELS);

  const getBaseline = useCallback(() => {
    if (isEveryone) {
      const saved = savedPermissionsByRole[EVERYONE_ID];
      if (saved) return saved;
      return {
        allowed_permissions: channel?.allowed_permissions || '0',
        denied_permissions: channel?.denied_permissions || '0',
      };
    }
    const saved = savedPermissionsByRole[selectedRoleId];
    const rolePerm = channel?.role_permissions?.find((rp) => rp.role_id === selectedRoleId);
    return saved || rolePerm || null;
  }, [isEveryone, selectedRoleId, channel, savedPermissionsByRole]);

  const hasChanged = useMemo(() => {
    const baselinePerm = getBaseline();
    if (!baselinePerm) {
      return allowedPermissions !== 0n || deniedPermissions !== 0n;
    }
    return (
      allowedPermissions !== BigInt(baselinePerm.allowed_permissions) ||
      deniedPermissions !== BigInt(baselinePerm.denied_permissions)
    );
  }, [allowedPermissions, deniedPermissions, getBaseline]);

  useEffect(() => {
    const baselinePerm = getBaseline();
    if (baselinePerm) {
      setAllowedPermissions(BigInt(baselinePerm.allowed_permissions));
      setDeniedPermissions(BigInt(baselinePerm.denied_permissions));
    } else {
      setAllowedPermissions(0n);
      setDeniedPermissions(0n);
    }
  }, [selectedRoleId, channel, savedPermissionsByRole]);

  const handleDenyPermission = (bit) => {
    setAllowedPermissions((prev) => prev & ~bit);
    setDeniedPermissions((prev) => prev | bit);
  };

  const handleAllowPermission = (bit) => {
    setAllowedPermissions((prev) => prev | bit);
    setDeniedPermissions((prev) => prev & ~bit);
  };

  const handleResetPermission = (bit) => {
    setAllowedPermissions((prev) => prev & ~bit);
    setDeniedPermissions((prev) => prev & ~bit);
  };

  const getPermissionState = (bit) => {
    if (deniedPermissions & bit) return 0;
    if (allowedPermissions & bit) return 2;
    return 1;
  };

  const handleSave = async () => {
    if (!canManageChannels) {
      toast.error('You do not have permission to manage channels.');
      return;
    }
    setIsSaving(true);

    const permPayload = {
      allowed_permissions: allowedPermissions.toString(),
      denied_permissions: deniedPermissions.toString(),
    };

    try {
      if (isEveryone) {
        await ChannelsService.updateGuildChannel(guild.id, channel.channel_id, permPayload);
      } else {
        await ChannelsService.updateChannelRolePermissions(channel.channel_id, selectedRoleId, permPayload);
      }

      setSavedPermissionsByRole((prev) => ({
        ...prev,
        [selectedRoleId]: permPayload,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Roles sub-sidebar */}
        <ScrollArea className="w-44 shrink-0 border-r border-border px-2 py-4">
          <p className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Roles
          </p>
          <div className="space-y-0.5">
            {rolesList.map((role) => (
              <Button
                key={role.id}
                variant="ghost"
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  'w-full justify-start gap-2 px-2.5 py-1.5 text-sm font-medium',
                  selectedRoleId === role.id
                    ? 'bg-background'
                    : 'hover:bg-muted/50'
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: role.color ? intToHex(role.color) : '#99aab5' }}
                />
                <span className="truncate">{role.name}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() => setSelectedRoleId(EVERYONE_ID)}
              className={cn(
                'w-full justify-start gap-2 px-2.5 py-1.5 text-sm font-medium',
                isEveryone
                  ? 'bg-background'
                  : 'hover:bg-muted/50'
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: '#99aab5' }}
              />
              <span className="truncate">@everyone</span>
            </Button>
          </div>
        </ScrollArea>

        {/* Permissions content */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">
              Configure specific permissions for{' '}
              <span className="font-medium text-foreground">
                {isEveryone ? '@everyone' : (rolesList.find((r) => r.id === selectedRoleId)?.name || 'this role')}
              </span>{' '}
              in this channel.
            </p>
          </div>
          <div className="space-y-4">
            {PERMISSION_GROUPS.text.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h4 className="sticky top-0 z-10 mb-1 border-b border-border bg-background/95 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                  {group.name}
                </h4>
                <div className="space-y-1">
                  {group.permissions.map((bit) => (
                    <PermissionRow
                      key={bit.toString()}
                      label={PERMISSIONS_LIST[bit]}
                      state={getPermissionState(bit)}
                      onAllow={() => handleAllowPermission(bit)}
                      onDeny={() => handleDenyPermission(bit)}
                      onReset={() => handleResetPermission(bit)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div
        className={cn(
          'px-6 py-4 transition-all duration-300',
          hasChanged ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <Separator className="mb-4" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Careful — you have unsaved changes!</span>
          <Button
            onClick={handleSave}
            disabled={!hasChanged || isSaving || !canManageChannels}
            className={cn(
              hasChanged && canManageChannels
                ? 'bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-500'
                : ''
            )}
          >
            <FloppyDisk size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditGuildChannelModal = ({ modalId, guild, initialTab = 'info', channel }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'info');

  const closeModal = () => useModalStore.getState().close(modalId);

  const isCategory = channel?.type === ChannelType.GUILD_CATEGORY;

  const tabs = useMemo(
    () => [
      {
        id: 'info',
        label: 'Overview',
        icon: <Info size={16} />,
        component: <OverviewTab guild={guild} channel={channel} isCategory={isCategory} />,
      },
      {
        id: 'roles',
        label: 'Permissions',
        icon: <Lock size={16} />,
        component: <PermissionsTab guild={guild} channel={channel} />,
      }
    ],
    [guild, channel]
  );

  if (!channel) return null;

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.component;
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <Dialog open onOpenChange={() => closeModal()}>
      <DialogContent showCloseButton={false} className="flex h-[90vh] max-w-4xl gap-0 overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>{isCategory ? 'Category Settings' : 'Channel Settings'}</DialogTitle>
        </VisuallyHidden>

        {/* Sidebar */}
        <div className="flex w-56 shrink-0 flex-col bg-muted/30">
          {/* Channel header */}
          <div className="flex items-center gap-1.5 px-4 py-4">
            {!isCategory && <span className="shrink-0 text-sm text-muted-foreground">#</span>}
            <p className="truncate text-sm font-semibold text-foreground">{channel.name}</p>
          </div>
          <Separator />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <h3 className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isCategory ? 'Category Settings' : 'Channel Settings'}
            </h3>
            <div className="space-y-0.5">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full justify-start gap-2.5 px-2.5 py-1.5 text-sm font-medium',
                    activeTab === tab.id
                      ? 'bg-background text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </div>
          </nav>
        </div>

        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between px-10">
            <h1 className="text-base font-semibold text-foreground">{activeTabLabel}</h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeModal}
              aria-label="Close"
            >
              <X size={18} />
            </Button>
          </div>
          <Separator />

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">{activeContent}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditGuildChannelModal;
