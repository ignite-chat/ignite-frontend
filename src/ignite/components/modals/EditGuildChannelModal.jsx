import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Info, Lock, FloppyDisk, Check, Hash, SpeakerHigh, FolderSimple } from '@phosphor-icons/react';
import { Slash } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChannelsService } from '../../services/channels.service';
import { Permissions } from '@/ignite/constants/Permissions';
import { PERMISSION_GROUPS, PERMISSIONS_LIST, intToHex } from '@/ignite/constants/Roles';
import { useHasPermission } from '@/ignite/hooks/useHasPermission';
import { toast } from 'sonner';
import { useModalStore } from '@/ignite/store/modal.store';
import { useRolesStore } from '@/ignite/store/roles.store';
import { ChannelType } from '@/ignite/constants/ChannelType';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 'h-14'; // Both sidebar + content headers share this so
                              // their bottom borders line up perfectly.

const ChannelTypeIcon = ({ type, className }) => {
  if (type === ChannelType.GUILD_CATEGORY)
    return <FolderSimple className={className} weight="fill" />;
  if (type === ChannelType.GUILD_VOICE)
    return <SpeakerHigh className={className} weight="fill" />;
  return <Hash className={className} weight="bold" />;
};

const UnsavedBar = ({ dirty, saving, onSave, disabled }) => (
  <div
    aria-hidden={!dirty}
    className={cn(
      'flex shrink-0 items-center justify-between gap-3 border-t border-border bg-popover px-6 py-3 transition-opacity',
      dirty ? 'opacity-100' : 'pointer-events-none opacity-0',
    )}
  >
    <span className="text-sm text-muted-foreground">Careful — you have unsaved changes.</span>
    <Button
      onClick={onSave}
      disabled={!dirty || saving || disabled}
      size="sm"
      className="gap-2"
    >
      <FloppyDisk size={16} weight="fill" />
      {saving ? 'Saving…' : 'Save Changes'}
    </Button>
  </div>
);

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

const OverviewTab = ({ guild, channel, isCategory, canManageChannels }) => {
  const [name, setName] = useState(channel?.name || '');
  const [description, setDescription] = useState(channel?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(channel?.name || '');
    setDescription(channel?.description || '');
  }, [channel]);

  const dirty =
    name !== (channel?.name || '') || description !== (channel?.description || '');

  const handleSave = async () => {
    if (!canManageChannels) {
      toast.error('You do not have permission to manage channels.');
      return;
    }
    if (!dirty) return;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        <div className="flex max-w-xl flex-col gap-5 px-8 py-6">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isCategory ? 'Category Name' : 'Channel Name'}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCategory ? 'category-name' : 'channel-name'}
              className="bg-[#1e1f22]"
              disabled={!canManageChannels}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isCategory ? 'Description' : 'Channel Topic'}
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isCategory ? 'What is this category for?' : 'What is this channel about?'}
              className="bg-[#1e1f22]"
              disabled={!canManageChannels}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the channel header so members know what to expect.
            </p>
          </div>
        </div>
      </ScrollArea>

      <UnsavedBar
        dirty={dirty}
        saving={isSaving}
        onSave={handleSave}
        disabled={!canManageChannels}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Permissions tab
// ---------------------------------------------------------------------------

const EVERYONE_ID = '__everyone__';

const PermissionRow = ({ label, state, onAllow, onDeny, onReset }) => (
  <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
      <button
        type="button"
        onClick={onDeny}
        className={cn(
          'flex h-7 w-8 items-center justify-center border-r border-border transition-colors',
          state === 0
            ? 'bg-red-500/20 text-red-500'
            : 'text-muted-foreground hover:bg-muted/40 hover:text-red-400',
        )}
        aria-label="Deny"
      >
        <X weight="bold" size={13} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className={cn(
          'flex h-7 w-8 items-center justify-center border-r border-border transition-colors',
          state === 1
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/40',
        )}
        aria-label="Inherit"
      >
        <Slash size={13} />
      </button>
      <button
        type="button"
        onClick={onAllow}
        className={cn(
          'flex h-7 w-8 items-center justify-center transition-colors',
          state === 2
            ? 'bg-green-500/20 text-green-500'
            : 'text-muted-foreground hover:bg-muted/40 hover:text-green-400',
        )}
        aria-label="Allow"
      >
        <Check weight="bold" size={13} />
      </button>
    </div>
  </div>
);

// Role colours arrive from the backend as numbers (Discord-style packed RGB),
// but some payloads send them as already-hex strings ("#ff0000") or numeric
// strings ("16711680"). `intToHex` only handles numbers, so normalise here.
const resolveRoleColor = (color) => {
  if (color == null || color === 0 || color === '0') return '#99aab5';
  if (typeof color === 'string') {
    if (color.startsWith('#')) return color;
    const asNumber = Number(color);
    if (!Number.isNaN(asNumber) && asNumber !== 0) return intToHex(asNumber);
    return `#${color}`;
  }
  return intToHex(color);
};

const RoleRow = ({ color, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
      active
        ? 'bg-background text-foreground'
        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
    )}
  >
    <span
      className="size-3 shrink-0 rounded-full ring-1 ring-inset ring-white/10"
      style={{ backgroundColor: color }}
    />
    <span className="truncate">{label}</span>
  </button>
);

const PermissionsTab = ({ guild, channel, canManageChannels }) => {
  const rolesList = useRolesStore((s) => s.guildRoles[guild?.id]) ?? [];
  const [selectedRoleId, setSelectedRoleId] = useState(EVERYONE_ID);
  const [savedPermissionsByRole, setSavedPermissionsByRole] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [allowedPermissions, setAllowedPermissions] = useState(0n);
  const [deniedPermissions, setDeniedPermissions] = useState(0n);

  const isEveryone = selectedRoleId === EVERYONE_ID;

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
    const rolePerm = channel?.role_permissions?.find(
      (rp) => String(rp.role_id) === String(selectedRoleId),
    );
    return saved || rolePerm || null;
  }, [isEveryone, selectedRoleId, channel, savedPermissionsByRole]);

  const dirty = useMemo(() => {
    const baseline = getBaseline();
    if (!baseline) return allowedPermissions !== 0n || deniedPermissions !== 0n;
    return (
      allowedPermissions !== BigInt(baseline.allowed_permissions) ||
      deniedPermissions !== BigInt(baseline.denied_permissions)
    );
  }, [allowedPermissions, deniedPermissions, getBaseline]);

  useEffect(() => {
    const baseline = getBaseline();
    if (baseline) {
      setAllowedPermissions(BigInt(baseline.allowed_permissions));
      setDeniedPermissions(BigInt(baseline.denied_permissions));
    } else {
      setAllowedPermissions(0n);
      setDeniedPermissions(0n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId, channel, savedPermissionsByRole]);

  const handleDeny = (bit) => {
    setAllowedPermissions((p) => p & ~bit);
    setDeniedPermissions((p) => p | bit);
  };
  const handleAllow = (bit) => {
    setAllowedPermissions((p) => p | bit);
    setDeniedPermissions((p) => p & ~bit);
  };
  const handleReset = (bit) => {
    setAllowedPermissions((p) => p & ~bit);
    setDeniedPermissions((p) => p & ~bit);
  };
  const stateOf = (bit) =>
    deniedPermissions & bit ? 0 : allowedPermissions & bit ? 2 : 1;

  const handleSave = async () => {
    if (!canManageChannels) {
      toast.error('You do not have permission to manage channels.');
      return;
    }
    setIsSaving(true);
    const payload = {
      allowed_permissions: allowedPermissions.toString(),
      denied_permissions: deniedPermissions.toString(),
    };
    try {
      if (isEveryone) {
        await ChannelsService.updateGuildChannel(guild.id, channel.channel_id, payload);
      } else {
        await ChannelsService.updateChannelRolePermissions(channel.channel_id, selectedRoleId, payload);
      }
      setSavedPermissionsByRole((prev) => ({ ...prev, [selectedRoleId]: payload }));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRoleLabel = isEveryone
    ? '@everyone'
    : rolesList.find((r) => String(r.id) === String(selectedRoleId))?.name || 'this role';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Roles sub-sidebar — its own column with its own padding. No top
            header here, so its content starts at the same Y the main content
            does (below the shared h-14 header bar). */}
        <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/20">
          <ScrollArea className="flex-1">
            <div className="px-2 py-4">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Roles
              </p>
              <div className="flex flex-col gap-0.5">
                {rolesList.map((role) => (
                  <RoleRow
                    key={String(role.id)}
                    color={resolveRoleColor(role.color)}
                    label={role.name}
                    active={!isEveryone && String(selectedRoleId) === String(role.id)}
                    onClick={() => setSelectedRoleId(role.id)}
                  />
                ))}
                {/* @everyone always sits at the bottom — mirrors Discord's
                    convention and keeps it out of the way of custom roles. */}
                <RoleRow
                  color="#99aab5"
                  label="@everyone"
                  active={isEveryone}
                  onClick={() => setSelectedRoleId(EVERYONE_ID)}
                />
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Permission content */}
        <ScrollArea className="flex-1">
          <div className="px-8 py-6">
            <p className="mb-4 text-xs text-muted-foreground">
              Configure specific permissions for{' '}
              <span className="font-semibold text-foreground">{selectedRoleLabel}</span> in this channel.
            </p>
            <div className="flex flex-col gap-5">
              {PERMISSION_GROUPS.text.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {group.name}
                  </h4>
                  <div className="flex flex-col">
                    {group.permissions.map((bit) => (
                      <PermissionRow
                        key={bit.toString()}
                        label={PERMISSIONS_LIST[bit]}
                        state={stateOf(bit)}
                        onAllow={() => handleAllow(bit)}
                        onDeny={() => handleDeny(bit)}
                        onReset={() => handleReset(bit)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      <UnsavedBar
        dirty={dirty}
        saving={isSaving}
        onSave={handleSave}
        disabled={!canManageChannels}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shell — left sidebar (channel name + nav) + right content (tab header + body)
// ---------------------------------------------------------------------------

const EditGuildChannelModal = ({ modalId, guild, initialTab = 'info', channel }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'info');
  const canManageChannels = useHasPermission(guild?.id, null, Permissions.MANAGE_CHANNELS);

  const close = () => useModalStore.getState().close(modalId);

  const isCategory = channel?.type === ChannelType.GUILD_CATEGORY;

  const tabs = useMemo(
    () => [
      { id: 'info', label: 'Overview', icon: Info },
      { id: 'roles', label: 'Permissions', icon: Lock },
    ],
    [],
  );

  if (!channel) return null;

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label ?? '';

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        showCloseButton={false}
        className="!inset-0 m-auto flex size-full !max-h-[85vh] !max-w-5xl !translate-x-0 !translate-y-0 gap-0 overflow-hidden p-0"
      >
        <VisuallyHidden>
          <DialogTitle>{isCategory ? 'Category Settings' : 'Channel Settings'}</DialogTitle>
        </VisuallyHidden>

        {/* Left sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-muted/30">
          {/* Channel header — shares HEADER_HEIGHT + border-b with the
              right-pane header so the divider runs flush across both. */}
          <div className={cn('flex shrink-0 items-center gap-2 border-b border-border px-4', HEADER_HEIGHT)}>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
              <ChannelTypeIcon type={channel.type} className="size-4 text-muted-foreground" />
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{channel.name}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isCategory ? 'Category Settings' : 'Channel Settings'}
            </p>
            <div className="flex flex-col gap-0.5">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-background text-foreground'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                    )}
                  >
                    <TabIcon size={16} weight={isActive ? 'fill' : 'regular'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Right content */}
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          {/* Header — same HEADER_HEIGHT + border-b as the sidebar header. */}
          <div className={cn('flex shrink-0 items-center justify-between border-b border-border px-8', HEADER_HEIGHT)}>
            <h1 className="text-base font-semibold text-foreground">{activeTabLabel}</h1>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab body (owns the save bar) */}
          {activeTab === 'info' && (
            <OverviewTab
              guild={guild}
              channel={channel}
              isCategory={isCategory}
              canManageChannels={canManageChannels}
            />
          )}
          {activeTab === 'roles' && (
            <PermissionsTab
              guild={guild}
              channel={channel}
              canManageChannels={canManageChannels}
            />
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default EditGuildChannelModal;
