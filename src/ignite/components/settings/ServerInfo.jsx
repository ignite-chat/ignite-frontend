import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/ignite/api';
import { useModalStore } from '../../store/modal.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Pencil, Trash2 } from 'lucide-react';
import ImageCropperModal from '@/ignite/components/modals/ImageCropperModal';
import GuildCard from '../guild/GuildCard';
import UnsavedChangesBar from '@/components/ui/unsaved-changes-bar';

const AFK_TIMEOUT_OPTIONS = [
  { label: '1 Minute', value: 60 },
  { label: '5 Minutes', value: 300 },
  { label: '15 Minutes', value: 900 },
  { label: '30 Minutes', value: 1800 },
  { label: '1 Hour', value: 3600 },
];

const MFA_LEVEL_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Elevated', value: 1 },
];

const NSFW_LEVEL_OPTIONS = [
  { label: 'Default', value: 0 },
  { label: 'Explicit', value: 1 },
  { label: 'Safe', value: 2 },
  { label: 'Age Restricted', value: 3 },
];

const SYSTEM_CHANNEL_FLAGS = [
  { label: 'Suppress member join notifications', flag: 1 << 0 },
  { label: 'Suppress server boost notifications', flag: 1 << 1 },
  { label: 'Suppress server setup tips', flag: 1 << 2 },
  { label: 'Suppress member join sticker replies', flag: 1 << 3 },
];

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

// Icon: 512×512, 1:1
const ICON_OUTPUT_W = 512;
const ICON_OUTPUT_H = 512;
// Banner: 960×540, 16:9
const BANNER_OUTPUT_W = 960;
const BANNER_OUTPUT_H = 540;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Sentinel: empty string means "delete this image"
const REMOVE = '';

const ServerInfo = ({ guild }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ownerWarning, setOwnerWarning] = useState('');
  const [editingField, setEditingField] = useState(null);

  // Pending changes (null = unchanged from saved profile)
  const [pendingName, setPendingName] = useState(null);
  const [pendingDescription, setPendingDescription] = useState(null);
  const [pendingIcon, setPendingIcon] = useState(null); // '' = remove, '<data:...>' = new
  const [pendingBanner, setPendingBanner] = useState(null);
  const [pendingAfkChannelId, setPendingAfkChannelId] = useState(null);
  const [pendingAfkTimeout, setPendingAfkTimeout] = useState(null);
  const [pendingSystemChannelId, setPendingSystemChannelId] = useState(null);
  const [pendingSystemChannelFlags, setPendingSystemChannelFlags] = useState(null);
  const [pendingRulesChannelId, setPendingRulesChannelId] = useState(null);
  const [pendingMfaLevel, setPendingMfaLevel] = useState(null);
  const [pendingNsfwLevel, setPendingNsfwLevel] = useState(null);

  const iconInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const ownerForm = useForm({ defaultValues: { owner_id: '', confirm_transfer: false } });
  const confirmTransfer = ownerForm.watch('confirm_transfer');

  const iconFileId = profile?.icon_file_id ?? guild?.icon_file_id;
  const bannerFileId = profile?.banner_file_id ?? guild?.banner_file_id;
  const savedIconUrl = iconFileId ? `${CDN_BASE}/icons/${iconFileId}` : null;
  const savedBannerUrl = bannerFileId ? `${CDN_BASE}/banners/${bannerFileId}` : null;

  // What to actually display (pending overrides saved)
  const displayIconUrl =
    pendingIcon === null ? savedIconUrl : pendingIcon === REMOVE ? null : pendingIcon;
  const displayBannerUrl =
    pendingBanner === null ? savedBannerUrl : pendingBanner === REMOVE ? null : pendingBanner;

  const displayName = pendingName !== null ? pendingName : profile?.name || guild?.name || '';
  const displayDescription =
    pendingDescription !== null ? pendingDescription : profile?.description || '';

  const guildInitials = (displayName || 'Unnamed Server')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    setLoading(true);
    setError('');

    api
      .get(`/guilds/${guild.id}/profile`)
      .then((response) => {
        if (!active) return;
        setProfile(response.data);
        ownerForm.reset({
          owner_id: response.data?.owner_id ? String(response.data.owner_id) : '',
          confirm_transfer: false,
        });
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load server profile.';
        setError(msg);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guild?.id]);

  useEffect(() => {
    ownerForm.register('confirm_transfer');
  }, [ownerForm]);

  // Detect unsaved changes
  const hasUnsavedChanges =
    pendingIcon !== null ||
    pendingBanner !== null ||
    pendingName !== null ||
    pendingDescription !== null ||
    pendingAfkChannelId !== null ||
    pendingAfkTimeout !== null ||
    pendingSystemChannelId !== null ||
    pendingSystemChannelFlags !== null ||
    pendingRulesChannelId !== null ||
    pendingMfaLevel !== null ||
    pendingNsfwLevel !== null;

  const handleSaveField = async (body, resetForm) => {
    if (!guild?.id) return false;
    setSaving(true);
    setError('');

    try {
      await api.patch(`/guilds/${guild.id}/profile`, body);
      const response = await api.get(`/guilds/${guild.id}/profile`);
      setProfile(response.data);
      resetForm?.(response.data);
      setOwnerWarning('');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update server profile.';
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const body = {};
    if (pendingIcon !== null) body.icon = pendingIcon === REMOVE ? null : pendingIcon;
    if (pendingBanner !== null) body.banner = pendingBanner === REMOVE ? null : pendingBanner;
    if (pendingName !== null) body.name = pendingName.trim() || profile?.name;
    if (pendingDescription !== null) body.description = pendingDescription.trim();
    if (pendingAfkChannelId !== null) body.afk_channel_id = pendingAfkChannelId;
    if (pendingAfkTimeout !== null) body.afk_timeout = pendingAfkTimeout;
    if (pendingSystemChannelId !== null) body.system_channel_id = pendingSystemChannelId;
    if (pendingSystemChannelFlags !== null) body.system_channel_flags = pendingSystemChannelFlags;
    if (pendingRulesChannelId !== null) body.rules_channel_id = pendingRulesChannelId;
    if (pendingMfaLevel !== null) body.mfa_level = pendingMfaLevel;
    if (pendingNsfwLevel !== null) body.nsfw_level = pendingNsfwLevel;
    if (Object.keys(body).length === 0) return;

    const saved = await handleSaveField(body);
    if (saved) {
      setPendingIcon(null);
      setPendingBanner(null);
      setPendingName(null);
      setPendingDescription(null);
      setPendingAfkChannelId(null);
      setPendingAfkTimeout(null);
      setPendingSystemChannelId(null);
      setPendingSystemChannelFlags(null);
      setPendingRulesChannelId(null);
      setPendingMfaLevel(null);
      setPendingNsfwLevel(null);
    }
  };

  const handleResetAll = () => {
    setPendingIcon(null);
    setPendingBanner(null);
    setPendingName(null);
    setPendingDescription(null);
    setPendingAfkChannelId(null);
    setPendingAfkTimeout(null);
    setPendingSystemChannelId(null);
    setPendingSystemChannelFlags(null);
    setPendingRulesChannelId(null);
    setPendingMfaLevel(null);
    setPendingNsfwLevel(null);
  };

  const openCropper = async (e, mode) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const isIcon = mode === 'icon';
    useModalStore.getState().push(ImageCropperModal, {
      imageSrc: dataUrl,
      title: isIcon ? 'Crop Server Icon' : 'Crop Server Banner',
      aspect: isIcon ? 1 : BANNER_OUTPUT_W / BANNER_OUTPUT_H,
      cropShape: isIcon ? 'round' : 'rect',
      outputWidth: isIcon ? ICON_OUTPUT_W : BANNER_OUTPUT_W,
      outputHeight: isIcon ? ICON_OUTPUT_H : BANNER_OUTPUT_H,
      onConfirm: (croppedDataUrl) => {
        if (isIcon) setPendingIcon(croppedDataUrl);
        else setPendingBanner(croppedDataUrl);
      },
    });
  };

  const handleIconChange = (e) => openCropper(e, 'icon');
  const handleBannerChange = (e) => openCropper(e, 'banner');

  const canRemoveIcon = !!(savedIconUrl || (pendingIcon && pendingIcon !== REMOVE));
  const canRemoveBanner = !!(savedBannerUrl || (pendingBanner && pendingBanner !== REMOVE));

  return (
    <div className="max-w-[740px] space-y-8">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          {/* Preview card skeleton */}
          <Skeleton className="h-[200px] max-w-sm rounded-lg" />

          {/* Icon skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>

          <Separator />

          {/* Banner skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>

          <Separator />

          {/* Name skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          <Separator />

          {/* Description skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Preview card (read-only) ── */}
          <GuildCard
            guild={{
              ...guild,
              name: displayName || 'Unnamed Server',
              description: displayDescription || guild?.description,
              icon_file_id: pendingIcon === null ? (profile?.icon_file_id ?? guild?.icon_file_id) : undefined,
              banner_file_id: pendingBanner === null ? (profile?.banner_file_id ?? guild?.banner_file_id) : undefined,
            }}
            className="pointer-events-none max-w-sm"
          />

          {/* ── Server Icon ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Server Icon
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We recommend at least 512×512 for the server icon.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Small icon preview */}
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                {displayIconUrl ? (
                  <img
                    src={displayIconUrl}
                    alt="Server icon preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full select-none items-center justify-center text-sm font-bold text-muted-foreground">
                    {guildInitials}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => iconInputRef.current?.click()}
                >
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                  Change Icon
                </Button>

                {canRemoveIcon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setPendingIcon(REMOVE)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove Icon
                  </Button>
                )}
              </div>
            </div>

            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconChange}
            />
          </div>

          <Separator />

          {/* ── Server Banner ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Server Banner
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We recommend at least 960×540 for the server banner.
              </p>
            </div>

            {/* Banner preview */}
            <div
              className="group relative h-24 w-full cursor-pointer overflow-hidden rounded-md bg-muted"
              onClick={() => bannerInputRef.current?.click()}
            >
              {displayBannerUrl && (
                <img
                  src={displayBannerUrl}
                  alt="Server banner preview"
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
                <span className="text-xs font-semibold text-white">Change Banner</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                {savedBannerUrl || (pendingBanner && pendingBanner !== REMOVE)
                  ? 'Change Banner'
                  : 'Upload Banner'}
              </Button>

              {canRemoveBanner && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setPendingBanner(REMOVE)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remove Banner
                </Button>
              )}
            </div>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
          </div>

          <Separator />

          {/* ── Server Name ── */}
          <div className="space-y-3">
            <Label
              htmlFor="profile-name"
              className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              Server Name
            </Label>
            <Input
              id="profile-name"
              type="text"
              placeholder="Enter server name"
              className="bg-background"
              value={displayName}
              onChange={(e) => {
                const val = e.target.value;
                const savedName = profile?.name || guild?.name || '';
                setPendingName(val === savedName ? null : val);
              }}
            />
          </div>

          <Separator />

          {/* ── Server Description ── */}
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="profile-description"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Server Description
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Help others discover your server with a short description.
              </p>
            </div>
            <Input
              id="profile-description"
              type="text"
              placeholder="Enter server description"
              className="bg-background"
              value={displayDescription}
              onChange={(e) => {
                const val = e.target.value;
                const savedDesc = profile?.description || '';
                setPendingDescription(val === savedDesc ? null : val);
              }}
            />
          </div>

          <Separator />

          {/* ── AFK Channel ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Inactive Channel
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Members will be moved to this voice channel after the inactive timeout.
              </p>
            </div>
            <Select
              value={(pendingAfkChannelId !== null ? pendingAfkChannelId : profile?.afk_channel_id) || '__none__'}
              onValueChange={(v) => {
                const val = v === '__none__' ? null : v;
                const saved = profile?.afk_channel_id || null;
                setPendingAfkChannelId(val === saved ? null : val);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Inactive Channel</SelectItem>
                {(guild?.channels || [])
                  .filter((c) => c.type === 2)
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((ch) => (
                    <SelectItem key={ch.channel_id} value={ch.channel_id}>
                      {ch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── AFK Timeout ── */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Inactive Timeout
            </Label>
            <Select
              value={String(pendingAfkTimeout !== null ? pendingAfkTimeout : (profile?.afk_timeout ?? 300))}
              onValueChange={(v) => {
                const val = Number(v);
                const saved = profile?.afk_timeout ?? 300;
                setPendingAfkTimeout(val === saved ? null : val);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AFK_TIMEOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ── System Channel ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                System Messages Channel
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The channel where system messages like welcome events are sent.
              </p>
            </div>
            <Select
              value={(pendingSystemChannelId !== null ? pendingSystemChannelId : profile?.system_channel_id) || '__none__'}
              onValueChange={(v) => {
                const val = v === '__none__' ? null : v;
                const saved = profile?.system_channel_id || null;
                setPendingSystemChannelId(val === saved ? null : val);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No System Channel</SelectItem>
                {(guild?.channels || [])
                  .filter((c) => c.type === 0)
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((ch) => (
                    <SelectItem key={ch.channel_id} value={ch.channel_id}>
                      # {ch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── System Channel Flags ── */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              System Channel Flags
            </Label>
            {SYSTEM_CHANNEL_FLAGS.map((item) => {
              const displayFlags = pendingSystemChannelFlags !== null
                ? pendingSystemChannelFlags
                : (profile?.system_channel_flags ?? 0);
              const isChecked = Boolean(displayFlags & item.flag);
              return (
                <div key={item.flag} className="flex items-center gap-3">
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newFlags = checked
                        ? displayFlags | item.flag
                        : displayFlags & ~item.flag;
                      const saved = profile?.system_channel_flags ?? 0;
                      setPendingSystemChannelFlags(newFlags === saved ? null : newFlags);
                    }}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* ── Rules Channel ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Rules Channel
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The channel where server rules are displayed.
              </p>
            </div>
            <Select
              value={(pendingRulesChannelId !== null ? pendingRulesChannelId : profile?.rules_channel_id) || '__none__'}
              onValueChange={(v) => {
                const val = v === '__none__' ? null : v;
                const saved = profile?.rules_channel_id || null;
                setPendingRulesChannelId(val === saved ? null : val);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Rules Channel</SelectItem>
                {(guild?.channels || [])
                  .filter((c) => c.type === 0)
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((ch) => (
                    <SelectItem key={ch.channel_id} value={ch.channel_id}>
                      # {ch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ── MFA Level ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                2FA Requirement
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Require members with moderation powers to have 2FA enabled.
              </p>
            </div>
            <Select
              value={String(pendingMfaLevel !== null ? pendingMfaLevel : (profile?.mfa_level ?? 0))}
              onValueChange={(v) => {
                const val = Number(v);
                const saved = profile?.mfa_level ?? 0;
                setPendingMfaLevel(val === saved ? null : val);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MFA_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── NSFW Level ── */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              NSFW Level
            </Label>
            <Select
              value={String(pendingNsfwLevel !== null ? pendingNsfwLevel : (profile?.nsfw_level ?? 0))}
              onValueChange={(v) => {
                const val = Number(v);
                const saved = profile?.nsfw_level ?? 0;
                setPendingNsfwLevel(val === saved ? null : val);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NSFW_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ── Owner Transfer ── */}
          <form
            onSubmit={ownerForm.handleSubmit(async (data) => {
              const nextOwnerId = data.owner_id?.trim();
              const currentOwnerId = profile?.owner_id ? String(profile.owner_id) : '';
              const isTransfer = nextOwnerId && nextOwnerId !== currentOwnerId;
              if (!nextOwnerId) return;
              if (isTransfer && !data.confirm_transfer) {
                setOwnerWarning('Confirm the ownership transfer to continue.');
                return;
              }
              const saved = await handleSaveField({ owner_id: nextOwnerId }, (nextProfile) =>
                ownerForm.reset({
                  owner_id: nextProfile?.owner_id ? String(nextProfile.owner_id) : '',
                  confirm_transfer: false,
                })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="profile-owner"
                  className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  Server Owner
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Transfer server ownership to another user. This cannot be undone.
                </p>
              </div>
              {editingField !== 'owner_id' && (
                <button
                  type="button"
                  onClick={() => {
                    setOwnerWarning('');
                    setEditingField('owner_id');
                  }}
                  className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingField === 'owner_id' ? (
              <div className="space-y-3">
                <Input
                  id="profile-owner"
                  type="text"
                  placeholder="Enter user ID"
                  className="bg-background"
                  {...ownerForm.register('owner_id')}
                />
                {ownerWarning && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {ownerWarning}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={Boolean(confirmTransfer)}
                    onCheckedChange={(checked) =>
                      ownerForm.setValue('confirm_transfer', checked, { shouldDirty: true })
                    }
                  />
                  <span className="text-sm">I understand this will transfer ownership</span>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="destructive" disabled={saving}>
                    Transfer Ownership
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      ownerForm.reset({
                        owner_id: profile?.owner_id ? String(profile.owner_id) : '',
                        confirm_transfer: false,
                      });
                      setOwnerWarning('');
                      setEditingField(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-muted/30 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">
                  {profile?.owner_id ? String(profile.owner_id) : 'Unknown'}
                </span>
              </div>
            )}
          </form>
        </>
      )}

      <UnsavedChangesBar
        show={hasUnsavedChanges}
        saving={saving}
        onSave={handleSaveAll}
        onReset={handleResetAll}
      />
    </div>
  );
};

export default ServerInfo;
