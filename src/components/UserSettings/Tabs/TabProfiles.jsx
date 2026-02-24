import { useCallback, useRef, useState } from 'react';
import api from '../../../api';
import { useUsersStore } from '@/store/users.store';
import Avatar from '../../Avatar';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Textarea } from '../../ui/textarea';
import { FieldError } from '../../ui/field';
import { toast } from 'sonner';
import { Camera, Trash2 } from 'lucide-react';
import { Separator } from '../../ui/separator';
import ImageCropperDialog from '../../Settings/ImageCropperDialog';
import { MarkdownText } from '../../MarkdownText';

const AVATAR_OUTPUT_W = 512;
const AVATAR_OUTPUT_H = 512;
const BANNER_OUTPUT_W = 960;
const BANNER_OUTPUT_H = 540;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const REMOVE = '';

const TabProfiles = () => {
  const user = useUsersStore((s) => s.getCurrentUser());
  const setUser = useUsersStore((s) => s.setUser);

  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [pendingBanner, setPendingBanner] = useState(null);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [cropperMode, setCropperMode] = useState(null); // 'avatar' | 'banner'

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
    },
  });

  const openCropper = async (e, mode) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setCropperSrc(dataUrl);
    setCropperMode(mode);
    setCropperOpen(true);
  };

  const handleAvatarChange = (e) => openCropper(e, 'avatar');
  const handleBannerChange = (e) => openCropper(e, 'banner');

  const handleCropConfirm = (croppedDataUrl) => {
    if (cropperMode === 'avatar') setPendingAvatar(croppedDataUrl);
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

  const displayAvatarUrl =
    pendingAvatar === null ? user?.avatar_url : pendingAvatar === REMOVE ? null : pendingAvatar;
  const displayBannerUrl =
    pendingBanner === null ? user?.banner_url : pendingBanner === REMOVE ? null : pendingBanner;

  const canRemoveAvatar = !!(user?.avatar_url || (pendingAvatar && pendingAvatar !== REMOVE));
  const canRemoveBanner = !!(user?.banner_url || (pendingBanner && pendingBanner !== REMOVE));

  const onSubmit = useCallback(
    async (data) => {
      try {
        const body = { name: data.name, bio: data.bio };
        if (pendingAvatar !== null) body.avatar = pendingAvatar === REMOVE ? null : pendingAvatar;
        if (pendingBanner !== null) body.banner = pendingBanner === REMOVE ? null : pendingBanner;

        const response = await api.patch('/users/@me', body);
        const updatedUser = response.data;
        setUser(user.id, { ...user, ...updatedUser });
        setPendingAvatar(null);
        setPendingBanner(null);
        toast.success('Profile updated successfully');
      } catch (error) {
        console.error('Failed to update user profile:', error);
        toast.error('Failed to update profile');
      }
    },
    [user, setUser, pendingAvatar, pendingBanner]
  );

  const watchedName = form.watch('name');
  const watchedBio = form.watch('bio');

  return (
    <div className="max-w-[740px]">
      <div className="flex gap-10">
        {/* Edit Form */}
        <div className="min-w-0 flex-1">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Display Name
                </Label>
                <Controller
                  name="name"
                  rules={{
                    required: 'Display Name is required.',
                    minLength: {
                      value: 2,
                      message: 'Display Name must be at least 2 characters long.',
                    },
                    maxLength: {
                      value: 32,
                      message: 'Display Name must be at most 32 characters long.',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9 _-]+$/,
                      message:
                        'Display Name can only contain letters, numbers, spaces, underscores, and hyphens.',
                    },
                  }}
                  render={({ field, formState }) => (
                    <>
                      <Input placeholder="Your display name" {...field} />
                      <FieldError>{formState.errors.name?.message}</FieldError>
                    </>
                  )}
                />
              </div>

              {/* Avatar */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Avatar
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    We recommend at least 512×512 for the avatar.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                    {displayAvatarUrl ? (
                      <img
                        src={displayAvatarUrl}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full select-none items-center justify-center text-sm font-bold text-muted-foreground">
                        {user?.username?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                      Change Avatar
                    </Button>

                    {canRemoveAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPendingAvatar(REMOVE)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Remove Avatar
                      </Button>
                    )}
                  </div>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <Separator />

              {/* Banner */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Banner
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    We recommend at least 960×540 for the banner.
                  </p>
                </div>

                <div
                  className="group relative h-24 w-full cursor-pointer overflow-hidden rounded-md bg-muted"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {displayBannerUrl && (
                    <img
                      src={displayBannerUrl}
                      alt="Banner preview"
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
                    {user?.banner_url || (pendingBanner && pendingBanner !== REMOVE)
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

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  About Me
                </Label>
                <Controller
                  name="bio"
                  rules={{
                    maxLength: {
                      value: 160,
                      message: 'Bio must be at most 160 characters long.',
                    },
                  }}
                  render={({ field, formState }) => (
                    <>
                      <Textarea placeholder="A short bio about yourself" {...field} />
                      <FieldError>{formState.errors.bio?.message}</FieldError>
                    </>
                  )}
                />
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </FormProvider>
        </div>

        {/* Live Preview */}
        <div className="hidden w-72 shrink-0 lg:block">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div
              className="h-16 bg-primary/20"
              style={{
                backgroundImage: displayBannerUrl ? `url(${displayBannerUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative px-3 pb-3">
              <div className="-mt-8">
                {displayAvatarUrl ? (
                  <img
                    src={displayAvatarUrl}
                    alt="Avatar"
                    className="size-16 rounded-full border-4 border-card object-cover"
                  />
                ) : (
                  <Avatar
                    user={{ ...user, name: watchedName }}
                    className="size-16 rounded-full border-4 border-card text-xl"
                  />
                )}
              </div>
              <h3 className="mt-2 text-sm font-bold">{watchedName || user?.name}</h3>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
              {watchedBio && (
                <>
                  <Separator className="my-2" />
                  <p className="text-xs font-bold uppercase text-muted-foreground">About Me</p>
                  <MarkdownText text={watchedBio} className="mt-1 break-words text-xs" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImageCropperDialog
        open={cropperOpen}
        onClose={handleCropClose}
        imageSrc={cropperSrc}
        title={cropperMode === 'avatar' ? 'Crop Avatar' : 'Crop Banner'}
        aspect={cropperMode === 'avatar' ? 1 : BANNER_OUTPUT_W / BANNER_OUTPUT_H}
        cropShape={cropperMode === 'avatar' ? 'round' : 'rect'}
        outputWidth={cropperMode === 'avatar' ? AVATAR_OUTPUT_W : BANNER_OUTPUT_W}
        outputHeight={cropperMode === 'avatar' ? AVATAR_OUTPUT_H : BANNER_OUTPUT_H}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};

export default TabProfiles;
