import { useEffect, useState } from 'react';
import api from '@/ignite/api';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Lock, Globe } from 'lucide-react';
import UnsavedChangesBar from '@/components/ui/unsaved-changes-bar';
import { useGuildProfilesStore } from '@/ignite/store/guild-profiles.store';

const ServerAccess = ({ guild }) => {
  const profile = useGuildProfilesStore((s) => (guild?.id ? s.profiles[guild.id]?.data : undefined));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingValue, setPendingValue] = useState(null);

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    // Only show the skeleton when we have no cached copy. With the cache
    // primed by a sibling tab, switching to Access is instant.
    const hadCached = !!useGuildProfilesStore.getState().profiles[guild.id];
    if (!hadCached) setLoading(true);
    setError('');

    useGuildProfilesStore
      .getState()
      .fetchProfile(guild.id)
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || err.message || 'Could not load server profile.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guild?.id]);

  const savedValue = Boolean(profile?.is_discoverable);
  const displayValue = pendingValue !== null ? pendingValue : savedValue;
  const hasChanges = pendingValue !== null && pendingValue !== savedValue;

  const handleSave = async () => {
    if (!guild?.id || pendingValue === null) return;
    setSaving(true);
    setError('');

    try {
      await api.patch(`/guilds/${guild.id}/profile`, { is_discoverable: pendingValue });
      // Merge the new value into the cache so other tabs see it immediately
      // and the next fetch-on-mount gets fresh data without a network hit.
      const store = useGuildProfilesStore.getState();
      const current = store.profiles[guild.id]?.data || {};
      store.setProfile(guild.id, { ...current, is_discoverable: pendingValue });
      setPendingValue(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not update access setting.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPendingValue(null);
  };

  const options = [
    {
      id: 'invite-only',
      label: 'Invite Only',
      description: 'Only users with an invite link can join this server.',
      icon: Lock,
      value: false,
    },
    {
      id: 'discoverable',
      label: 'Discoverable',
      description: 'Anyone can find and join this server through Server Discovery.',
      icon: Globe,
      value: true,
    },
  ];

  return (
    <div className="max-w-[740px] space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Server Access
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose how users can find and join your server.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const Icon = option.icon;
              const selected = displayValue === option.value;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingValue(option.value)}
                  className={cn(
                    'flex flex-col items-start gap-3 rounded-lg border-2 p-5 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">{option.label}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

        </>
      )}

      <UnsavedChangesBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
};

export default ServerAccess;
