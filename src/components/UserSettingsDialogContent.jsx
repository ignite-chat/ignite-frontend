import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import useStore from '../hooks/useStore';
import { DialogContent, DialogTitle } from './ui/dialog';
import Avatar from './Avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Textarea } from './ui/textarea';
import { Field, FieldError, FieldGroup, FieldLabel } from './ui/field';
import { toast } from 'sonner';
import { SheetDescription } from './ui/sheet';
import { User, UserCircle, Mic, Bot, LogOut, X, Menu, KeyRound, Camera, Trash2, Bell, Volume2, Upload } from 'lucide-react';
import { Switch } from './ui/switch';
import { useSoundStore, SOUND_EVENTS, SOUND_EVENT_LABELS } from '../store/sound.store';
import { SoundService } from '../services/sound.service';
import { VoiceService } from '../services/voice.service';
import ImageCropperDialog from './Settings/ImageCropperDialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Room } from 'livekit-client';
import { useVoiceStore } from '../store/voice.store';
import { useAuthStore } from '../store/auth.store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import MicTestBars from './Voice/MicTestBars';
import { cn } from '@/lib/utils';

// ─── My Account Tab ───────────────────────────────────────────────────────────

const ChangeEmailDialog = ({ open, onOpenChange }) => {
  const store = useStore();
  const user = store.user;

  const form = useForm({
    defaultValues: {
      email: user?.email || '',
      currentPassword: '',
    },
  });

  const onSubmit = useCallback(
    async (data) => {
      try {
        await api.patch('users/@me/email', {
          email: data.email,
          password: data.currentPassword,
        });
        store.setUser({ ...store.user, email: data.email });
        onOpenChange(false);
        form.reset();
        toast.success('Email updated successfully');
      } catch (error) {
        const msg = error.response?.data?.message || error.response?.data?.error;
        if (error.response?.status === 429) {
          toast.error(msg || 'You can only change your email once every 24 hours.');
        } else {
          toast.error(msg || 'Failed to update email');
        }
      }
    },
    [form, onOpenChange, store]
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="!max-w-md sm:!max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Change your email</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your new email address and current password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="dialogEmail"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                New Email
              </Label>
              <Controller
                name="email"
                rules={{
                  required: 'Email address is required.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address.',
                  },
                }}
                render={({ field }) => (
                  <>
                    <Input id="dialogEmail" placeholder="Your new email address" {...field} />
                    <FieldError>{form.formState.errors.email?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="dialogEmailPassword"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Current Password
              </Label>
              <Controller
                name="currentPassword"
                rules={{ required: 'Current password is required.' }}
                render={({ field }) => (
                  <>
                    <Input
                      id="dialogEmailPassword"
                      type="password"
                      placeholder="Your current password"
                      {...field}
                    />
                    <FieldError>{form.formState.errors.currentPassword?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => form.reset()}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </AlertDialogFooter>
          </form>
        </FormProvider>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ChangePasswordDialog = ({ open, onOpenChange }) => {
  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const newPasswordValue = form.watch('newPassword');

  const onSubmit = useCallback(
    async (data) => {
      try {
        console.log('User Password Data:', data);
        // await api.patch('/users/@me/password', data);
        onOpenChange(false);
        form.reset();
        toast.success('Password updated successfully');
      } catch (error) {
        console.error('Failed to update password:', error);
      }
    },
    [form, onOpenChange]
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="!max-w-md sm:!max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Change your password</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your current password and choose a new one.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="dialogCurrentPassword"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Current Password
              </Label>
              <Controller
                name="currentPassword"
                rules={{ required: 'Current password is required.' }}
                render={({ field }) => (
                  <>
                    <Input
                      id="dialogCurrentPassword"
                      type="password"
                      placeholder="Your current password"
                      {...field}
                    />
                    <FieldError>{form.formState.errors.currentPassword?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="dialogNewPassword"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                New Password
              </Label>
              <Controller
                name="newPassword"
                rules={{
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters long' },
                  maxLength: { value: 64, message: 'Password must be at most 64 characters long' },
                }}
                render={({ field }) => (
                  <>
                    <Input
                      id="dialogNewPassword"
                      type="password"
                      placeholder="Your new password"
                      {...field}
                    />
                    <FieldError>{form.formState.errors.newPassword?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="dialogConfirmNewPassword"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Confirm New Password
              </Label>
              <Controller
                name="confirmNewPassword"
                rules={{
                  required: 'Please confirm your new password',
                  minLength: { value: 8, message: 'Password must be at least 8 characters long' },
                  maxLength: { value: 64, message: 'Password must be at most 64 characters long' },
                  validate: (value) => value === newPasswordValue || 'Passwords do not match',
                }}
                render={({ field }) => (
                  <>
                    <Input
                      id="dialogConfirmNewPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      {...field}
                    />
                    <FieldError>{form.formState.errors.confirmNewPassword?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => form.reset()}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </AlertDialogFooter>
          </form>
        </FormProvider>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ChangeUsernameDialog = ({ open, onOpenChange }) => {
  const store = useStore();
  const user = store.user;

  const form = useForm({
    defaultValues: {
      username: user?.username || '',
      currentPassword: '',
    },
  });

  const onSubmit = useCallback(
    async (data) => {
      try {
        await api.patch('users/@me/username', {
          username: data.username,
          password: data.currentPassword,
        });
        store.setUser({ ...store.user, username: data.username });
        onOpenChange(false);
        form.reset();
        toast.success('Username updated successfully');
      } catch (error) {
        const msg = error.response?.data?.message || error.response?.data?.error;
        if (error.response?.status === 429) {
          toast.error(msg || 'You can only change your username once every 24 hours.');
        } else {
          toast.error(msg || 'Failed to update username');
        }
      }
    },
    [form, onOpenChange, store]
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="!max-w-md sm:!max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Change your username</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a new username and your current password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="dialogUsername"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                New Username
              </Label>
              <Controller
                name="username"
                rules={{
                  required: 'Username is required.',
                  minLength: {
                    value: 2,
                    message: 'Username must be at least 2 characters long.',
                  },
                  maxLength: {
                    value: 32,
                    message: 'Username must be at most 32 characters long.',
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_-]+$/,
                    message:
                      'Username can only contain letters, numbers, underscores, and hyphens.',
                  },
                }}
                render={({ field }) => (
                  <>
                    <Input id="dialogUsername" placeholder="Your new username" {...field} />
                    <FieldError>{form.formState.errors.username?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="dialogUsernamePassword"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Current Password
              </Label>
              <Controller
                name="currentPassword"
                rules={{ required: 'Current password is required.' }}
                render={({ field }) => (
                  <>
                    <Input
                      id="dialogUsernamePassword"
                      type="password"
                      placeholder="Your current password"
                      {...field}
                    />
                    <FieldError>{form.formState.errors.currentPassword?.message}</FieldError>
                  </>
                )}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => form.reset()}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </AlertDialogFooter>
          </form>
        </FormProvider>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const TabMyAccount = ({ onNavigateToProfiles }) => {
  const store = useStore();
  const user = store.user;
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  return (
    <div className="max-w-[740px] space-y-8">
      {/* Profile Info Card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card select-none">
        <div
          className="h-24 bg-primary/20"
          style={{
            backgroundImage: user?.banner_url ? `url(${user.banner_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative px-4 pb-4">
          <div className="-mt-10 mb-2">
            <Avatar
              user={user}
              className="size-20 rounded-full border-[5px] border-card text-2xl"
            />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.username}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onNavigateToProfiles}>
              Edit User Profile
            </Button>
          </div>

          <div className="space-y-4 rounded-lg bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Display Name</p>
                <p className="mt-0.5 text-sm">{user?.name || 'Not set'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={onNavigateToProfiles}>
                Edit
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Username</p>
                <p className="mt-0.5 text-sm">{user?.username}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsUsernameDialogOpen(true)}>
                Edit
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Email</p>
                <p className="mt-0.5 text-sm">{user?.email || 'Not set'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsEmailDialogOpen(true)}>
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Password & Authentication */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Password and Authentication</h3>
        <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(true)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Change Password
        </Button>
      </div>

      {/* Dialogs */}
      <ChangeUsernameDialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen} />
      <ChangeEmailDialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen} />
      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
    </div>
  );
};

// ─── Profiles Tab ─────────────────────────────────────────────────────────────

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
  const store = useStore();
  const user = store.user;

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
        store.setUser({ ...store.user, ...updatedUser });
        setPendingAvatar(null);
        setPendingBanner(null);
        toast.success('Profile updated successfully');
      } catch (error) {
        console.error('Failed to update user profile:', error);
        toast.error('Failed to update profile');
      }
    },
    [store, pendingAvatar, pendingBanner]
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
                  <p className="mt-1 text-xs">{watchedBio}</p>
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

// ─── Voice & Audio Tab ────────────────────────────────────────────────────────

const TabVoiceAudio = () => {
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const audioInputDeviceId = useVoiceStore((s) => s.audioInputDeviceId);
  const audioOutputDeviceId = useVoiceStore((s) => s.audioOutputDeviceId);
  const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
  const room = useVoiceStore((s) => s.room);
  const [isTesting, setIsTesting] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const inputs = await Room.getLocalDevices('audioinput', true);
      const outputs = await Room.getLocalDevices('audiooutput', true);
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Stop mic test on unmount
  useEffect(() => () => setIsTesting(false), []);

  const handleInputChange = useCallback(
    async (deviceId) => {
      const id = deviceId === 'default' ? null : deviceId;
      useVoiceStore.getState().setAudioInputDeviceId(id);
      if (room) {
        try {
          await room.switchActiveDevice('audioinput', deviceId);
        } catch (err) {
          console.warn('Failed to switch audio input device:', err);
        }
      }
    },
    [room]
  );

  const handleOutputChange = useCallback(
    async (deviceId) => {
      const id = deviceId === 'default' ? null : deviceId;
      useVoiceStore.getState().setAudioOutputDeviceId(id);
      if (room) {
        try {
          await room.switchActiveDevice('audiooutput', deviceId);
        } catch (err) {
          console.warn('Failed to switch audio output device:', err);
        }
      }
    },
    [room]
  );

  const handleNoiseToggle = useCallback(async () => {
    if (room) {
      await VoiceService.toggleNoiseSuppression();
    } else {
      useVoiceStore.getState().setNoiseSuppression(!noiseSuppression);
    }
  }, [room, noiseSuppression]);

  return (
    <div className="max-w-[740px] space-y-6">
      <div>
        <h3 className="text-base font-semibold">Voice Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your audio input and output devices
        </p>
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Input Device</FieldLabel>
            <Select value={audioInputDeviceId || 'default'} onValueChange={handleInputChange}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Output Device</FieldLabel>
            <Select value={audioOutputDeviceId || 'default'} onValueChange={handleOutputChange}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {outputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker (${device.deviceId.slice(0, 8)}...)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>

      {/* Noise Suppression */}
      {/* TODO: Krisp requires LiveKit Cloud — noise suppression won't work on self-hosted LiveKit servers */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Noise Suppression</p>
              <p className="text-xs text-muted-foreground">
                Powered by Krisp — make some noise while speaking and your friends will only hear your voice.
              </p>
            </div>
          </div>
          <Switch checked={noiseSuppression} onCheckedChange={handleNoiseToggle} />
        </div>

        {/* Mic Test */}
        <Separator />
        <div>
          <p className="mb-2 text-sm font-semibold">Mic Test</p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTesting((prev) => !prev)}
            >
              {isTesting ? 'Stop' : 'Test'}
            </Button>
            {isTesting && <MicTestBars deviceId={audioInputDeviceId} outputDeviceId={audioOutputDeviceId} />}
          </div>
        </div>

        {/* Krisp branding */}
        <Separator />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <span className="text-sm font-bold">krisp</span>
          <a
            href="https://krisp.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Bots Tab ─────────────────────────────────────────────────────────────────

const TabBots = () => {
  return (
    <div className="max-w-[740px]">
      <h3 className="text-base font-semibold">Bots</h3>
      <p className="mt-1 text-sm text-muted-foreground">Manage your bots and integrations</p>
    </div>
  );
};

// ─── Notification Sounds Tab ──────────────────────────────────────────────────

const TabNotificationSounds = () => {
  const disableAll = useSoundStore((s) => s.disableAll);
  const events = useSoundStore((s) => s.events);
  const { setDisableAll, setEventEnabled, setCustomSound, removeCustomSound } = useSoundStore();
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const handleUploadClick = (eventType) => {
    setUploadTarget(eventType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadTarget) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Sound file must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomSound(uploadTarget, reader.result);
      SoundService.invalidateCache(uploadTarget);
      setUploadTarget(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-[740px] space-y-6">
      <div>
        <h3 className="text-base font-semibold">Notification Sounds</h3>
        <p className="text-sm text-muted-foreground">
          Toggle and customize sounds for different events
        </p>
      </div>

      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Disable All Notification Sounds</p>
          <p className="text-xs text-muted-foreground">Mute every sound effect at once</p>
        </div>
        <Switch checked={disableAll} onCheckedChange={setDisableAll} />
      </div>

      {/* Per-event rows */}
      <div className="space-y-1 rounded-lg border border-border bg-card p-4">
        {SOUND_EVENTS.map((eventType) => {
          const config = events[eventType];
          return (
            <div
              key={eventType}
              className="flex items-center justify-between rounded-md px-2 py-2.5 hover:bg-muted/50"
            >
              <span className="text-sm font-medium">{SOUND_EVENT_LABELS[eventType]}</span>
              <div className="flex items-center gap-2">
                {/* Preview */}
                <button
                  onClick={() => SoundService.previewSound(eventType)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Preview sound"
                >
                  <Volume2 className="h-4 w-4" />
                </button>

                {/* Upload custom */}
                <button
                  onClick={() => handleUploadClick(eventType)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Upload custom sound"
                >
                  <Upload className="h-4 w-4" />
                </button>

                {/* Remove custom */}
                {config?.customSound && (
                  <button
                    onClick={() => {
                      removeCustomSound(eventType);
                      SoundService.invalidateCache(eventType);
                    }}
                    className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                    title="Remove custom sound"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Toggle */}
                <Switch
                  checked={config?.enabled ?? true}
                  onCheckedChange={(checked) => setEventEnabled(eventType, checked)}
                  disabled={disableAll}
                />
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

// ─── Navigation Config ────────────────────────────────────────────────────────

const navigationSections = [
  {
    label: 'USER SETTINGS',
    items: [
      { id: 'account', title: 'My Account', icon: User },
      { id: 'profiles', title: 'Profiles', icon: UserCircle },
    ],
  },
  {
    label: 'APP SETTINGS',
    items: [
      { id: 'voice', title: 'Voice & Audio', icon: Mic },
      { id: 'notifications', title: 'Notification Sounds', icon: Bell },
    ],
  },
  {
    label: 'BOTS & INTEGRATIONS',
    items: [{ id: 'bots', title: 'Bots', icon: Bot }],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const UserSettingsDialogContent = () => {
  const store = useStore();
  const { logout } = useAuthStore();

  const [tab, setTab] = useState('account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setIsMobileMenuOpen(false);
  };

  const allItems = navigationSections.flatMap((s) => s.items);
  const activeItem = allItems.find((item) => item.id === tab);

  const renderContent = () => {
    switch (tab) {
      case 'account':
        return <TabMyAccount onNavigateToProfiles={() => setTab('profiles')} />;
      case 'profiles':
        return <TabProfiles />;
      case 'voice':
        return <TabVoiceAudio />;
      case 'notifications':
        return <TabNotificationSounds />;
      case 'bots':
        return <TabBots />;
      default:
        return null;
    }
  };

  return (
    <DialogContent className="!inset-0 m-auto flex size-full !max-h-[90vh] !max-w-[90vw] !translate-x-0 !translate-y-0 flex-row overflow-hidden p-0">
      <DialogTitle className="sr-only">User Settings</DialogTitle>
      <SheetDescription className="sr-only">
        Manage your user settings and preferences.
      </SheetDescription>

      {/* Sidebar */}
      <div
        className={cn(
          'flex w-60 shrink-0 flex-col bg-muted/30',
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-10 w-full md:static md:w-60'
            : 'hidden md:flex'
        )}
      >
        {/* User header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <Avatar user={store.user} className="size-10 text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{store.user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{store.user?.username}</p>
          </div>
          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
          {navigationSections.map((section, i) => (
            <div key={i}>
              <h3 className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                        tab === item.id
                          ? 'bg-background text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Separator + Log Out */}
          <div className="mx-2.5 border-t border-border" />
          <div className="space-y-0.5">
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Content area */}
      <div
        className={cn(
          'flex h-full flex-1 flex-col overflow-hidden bg-background',
          isMobileMenuOpen ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Mobile header */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="-ml-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>
          <span className="text-base font-semibold">{activeItem?.title}</span>
        </div>

        {/* Desktop header */}
        <div className="hidden h-14 shrink-0 items-center border-b border-border px-10 md:flex">
          <h1 className="text-base font-semibold">
            {activeItem?.title || 'User Settings'}
          </h1>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
          {renderContent()}
        </div>
      </div>
    </DialogContent>
  );
};

export default UserSettingsDialogContent;
