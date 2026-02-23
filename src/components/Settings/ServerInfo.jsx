import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Camera, Pencil, Trash2 } from 'lucide-react';
import ImageCropperDialog from './ImageCropperDialog';
import GuildCard from '../Guild/GuildCard';

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

  // null = no change, '' = remove, '<data:...>' = new image
  const [pendingIcon, setPendingIcon] = useState(null);
  const [pendingBanner, setPendingBanner] = useState(null);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [cropperMode, setCropperMode] = useState(null); // 'icon' | 'banner'

  const iconInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const nameForm = useForm({ defaultValues: { name: '' } });
  const descriptionForm = useForm({ defaultValues: { description: '' } });
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

  const guildInitials = (profile?.name || guild?.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const getErrorMessage = (form, field) => form.formState.errors?.[field]?.message;

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
        nameForm.reset({ name: response.data?.name || '' });
        descriptionForm.reset({ description: response.data?.description || '' });
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

  const handleSave = async (body, resetForm) => {
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

  const openCropper = async (e, mode) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setCropperSrc(dataUrl);
    setCropperMode(mode);
    setCropperOpen(true);
  };

  const handleIconChange = (e) => openCropper(e, 'icon');
  const handleBannerChange = (e) => openCropper(e, 'banner');

  const handleCropConfirm = (croppedDataUrl) => {
    if (cropperMode === 'icon') setPendingIcon(croppedDataUrl);
    else setPendingBanner(croppedDataUrl);
    setCropperOpen(false);
    setCropperSrc(null);
    setCropperMode(null);
  };

  const handleCropClose = () => {
    setCropperOpen(false);
    setCropperSrc(null);
    setCropperMode(null);
  };

  const handleSaveImages = async () => {
    const body = {};
    if (pendingIcon !== null) body.icon = pendingIcon === REMOVE ? null : pendingIcon;
    if (pendingBanner !== null) body.banner = pendingBanner === REMOVE ? null : pendingBanner;
    if (Object.keys(body).length === 0) return;
    const saved = await handleSave(body);
    if (saved) {
      setPendingIcon(null);
      setPendingBanner(null);
    }
  };

  const resetImages = () => {
    setPendingIcon(null);
    setPendingBanner(null);
  };

  const hasUnsavedImages = pendingIcon !== null || pendingBanner !== null;
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
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* ── Preview card (read-only) ── */}
          <GuildCard
            guild={{
              ...guild,
              name: profile?.name || guild?.name || 'Unnamed Server',
              description: profile?.description || guild?.description,
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

          {/* ── Unsaved image changes bar ── */}
          {hasUnsavedImages && (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2.5">
              <p className="text-sm text-muted-foreground">You have unsaved image changes.</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={resetImages}>
                  Reset
                </Button>
                <Button type="button" size="sm" disabled={saving} onClick={handleSaveImages}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* ── Server Discovery ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Server Discovery
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Allow this server to appear in Server Discovery so anyone can find and join it.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={Boolean(profile?.is_discoverable)}
                onCheckedChange={async (checked) => {
                  await handleSave({ is_discoverable: checked });
                }}
                disabled={saving}
              />
              <span className="text-sm">
                {profile?.is_discoverable ? 'Discoverable' : 'Not discoverable'}
              </span>
            </div>
          </div>

          <Separator />

          {/* ── Server Name ── */}
          <form
            onSubmit={nameForm.handleSubmit(async (data) => {
              const name = data.name?.trim();
              if (!name) return;
              const saved = await handleSave({ name }, (nextProfile) =>
                nameForm.reset({ name: nextProfile?.name || '' })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <Label
                htmlFor="profile-name"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Server Name
              </Label>
              {editingField !== 'name' && (
                <button
                  type="button"
                  onClick={() => setEditingField('name')}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingField === 'name' ? (
              <div className="space-y-3">
                <Input
                  id="profile-name"
                  type="text"
                  placeholder="Enter server name"
                  className="bg-background"
                  {...nameForm.register('name')}
                />
                {getErrorMessage(nameForm, 'name') && (
                  <p className="text-sm text-destructive">{getErrorMessage(nameForm, 'name')}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      nameForm.reset({ name: profile?.name || '' });
                      setEditingField(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-muted/30 px-3 py-2.5">
                <span className="text-sm">{profile?.name || guild?.name || 'Unnamed Server'}</span>
              </div>
            )}
          </form>

          <Separator />

          {/* ── Server Description ── */}
          <form
            onSubmit={descriptionForm.handleSubmit(async (data) => {
              const description = data.description?.trim();
              const saved = await handleSave({ description: description || '' }, (nextProfile) =>
                descriptionForm.reset({ description: nextProfile?.description || '' })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
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
              {editingField !== 'description' && (
                <button
                  type="button"
                  onClick={() => setEditingField('description')}
                  className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingField === 'description' ? (
              <div className="space-y-3">
                <Input
                  id="profile-description"
                  type="text"
                  placeholder="Enter server description"
                  className="bg-background"
                  {...descriptionForm.register('description')}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      descriptionForm.reset({ description: profile?.description || '' });
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
                  {profile?.description || 'No description set'}
                </span>
              </div>
            )}
          </form>

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
              const saved = await handleSave({ owner_id: nextOwnerId }, (nextProfile) =>
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

      <ImageCropperDialog
        open={cropperOpen}
        onClose={handleCropClose}
        imageSrc={cropperSrc}
        title={cropperMode === 'icon' ? 'Crop Server Icon' : 'Crop Server Banner'}
        aspect={cropperMode === 'icon' ? 1 : BANNER_OUTPUT_W / BANNER_OUTPUT_H}
        cropShape={cropperMode === 'icon' ? 'round' : 'rect'}
        outputWidth={cropperMode === 'icon' ? ICON_OUTPUT_W : BANNER_OUTPUT_W}
        outputHeight={cropperMode === 'icon' ? ICON_OUTPUT_H : BANNER_OUTPUT_H}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};

export default ServerInfo;
