import { useCallback, useState } from 'react';
import api from '../api';
import useStore from '../hooks/useStore';
import { DialogContent, DialogTitle } from './ui/dialog';
import {
  SidebarProvider,
  Sidebar,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from './ui/sidebar';
import Avatar from './Avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Textarea } from './ui/textarea';
import { Field, FieldError, FieldGroup, FieldLabel } from './ui/field';
import { toast } from 'sonner';
import { SheetDescription } from './ui/sheet';
import { Menu } from 'lucide-react';

const TabAccount = () => {
  const store = useStore();

  const userProfileForm = useForm({
    defaultValues: {
      name: store.user?.name || '',
      bio: store.user?.bio || '',
      avatar_url: store.user?.avatar_url || '',
    },
  });

  const onSubmitUserProfile = useCallback(
    async (data) => {
      // console.log('User Profile Data:', data);
      try {
        await api.patch('/users/@me', data);
        // TODO:
        store.setUser({
          ...store.user,
          name: data.name,
          avatar_url: data.avatar_url,
        });
        toast.success('Profile updated successfully');
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
    },
    [store]
  );

  const userEmailForm = useForm({
    defaultValues: {
      email: store.user?.email || '',
      currentPassword: '',
    },
  });

  const onSubmitUserEmail = useCallback((data) => {
    console.log('User Email Data:', data);
  }, []);

  const userPasswordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmitUserPassword = useCallback((data) => {
    console.log('User Password Data:', data);
  }, []);

  const newPasswordValue = userPasswordForm.watch('newPassword');

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto w-full max-w-lg">
        <FormProvider {...userProfileForm}>
          <form onSubmit={userProfileForm.handleSubmit(onSubmitUserProfile)}>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>Update your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Display Name</FieldLabel>
                    <Controller
                      name="name"
                      rules={{
                        required: 'Display Name is required.',
                        minLength: {
                          value: 2,
                          message: 'Display Name must be at least 2 characters long.',
                        },
                        maxLength: {
                          value: 50,
                          message: 'Display Name must be at most 50 characters long.',
                        },
                        pattern: {
                          value: /^[a-zA-Z0-9 _-]+$/,
                          message:
                            'Display Name can only contain letters, numbers, spaces, underscores, and hyphens.',
                        },
                      }}
                      render={({ field, formState }) => (
                        <>
                          <Input id="name" placeholder="Your display name" {...field} />
                          <FieldError>{formState.errors.name?.message}</FieldError>
                        </>
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="bio">About Me</FieldLabel>
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
                          <Textarea id="bio" placeholder="A short bio about yourself" {...field} />
                          <FieldError>{formState.errors.bio?.message}</FieldError>
                        </>
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="avatar_url">Avatar</FieldLabel>
                    <Controller
                      name="avatar_url"
                      rules={{
                        pattern: {
                          value: /^https:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i,
                          message:
                            'Avatar URL must start with https:// and end with .jpg, .jpeg, .png, .webp, or .gif.',
                        },
                      }}
                      render={({ field, formState }) => (
                        <>
                          <Input
                            id="avatar_url"
                            placeholder="https://example.com/my-avatar.png"
                            {...field}
                          />
                          <FieldError>{formState.errors.avatar_url?.message}</FieldError>
                        </>
                      )}
                    />
                    <Button type="button" variant="secondary" disabled>
                      Upload Avatar (not implemented yet)
                    </Button>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  type="submit"
                  disabled={userProfileForm.formState.isSubmitting}
                  className="w-full"
                >
                  {userProfileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                {/* <Button variant="outline" className="w-full">
                  Cancel
                </Button> */}
              </CardFooter>
            </Card>
          </form>
        </FormProvider>
      </div>
      <div className="mx-auto w-full max-w-lg">
        <FormProvider {...userEmailForm}>
          <form onSubmit={userEmailForm.handleSubmit(onSubmitUserEmail)}>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Update E-mail Address</CardTitle>
                <CardDescription>Change your account e-mail address</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">E-mail Address</Label>
                    <Controller
                      name="email"
                      rules={{
                        required: 'E-mail address is required.',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid e-mail address.',
                        },
                      }}
                      render={({ field }) => (
                        <>
                          <Input id="email" placeholder="Your e-mail address" {...field} />
                          <FieldError>{userEmailForm.formState.errors.email?.message}</FieldError>
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Controller
                      name="currentPassword"
                      rules={{
                        required: 'Current password is required.',
                      }}
                      render={({ field }) => (
                        <>
                          <Input
                            id="currentPassword"
                            placeholder="Your current password"
                            {...field}
                          />
                          <FieldError>
                            {userEmailForm.formState.errors.currentPassword?.message}
                          </FieldError>
                        </>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  type="submit"
                  disabled={userEmailForm.formState.isSubmitting}
                  className="w-full"
                >
                  {userEmailForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                {/* <Button variant="outline" className="w-full">
                  Cancel
                </Button> */}
              </CardFooter>
            </Card>
          </form>
        </FormProvider>
      </div>
      <div className="mx-auto w-full max-w-lg">
        <FormProvider {...userPasswordForm}>
          <form onSubmit={userPasswordForm.handleSubmit(onSubmitUserPassword)}>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Update Password</CardTitle>
                <CardDescription>Change your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Controller
                      name="currentPassword"
                      rules={{
                        required: 'Current password is required.',
                      }}
                      render={({ field }) => (
                        <>
                          <Input
                            id="currentPassword"
                            placeholder="Your current password"
                            {...field}
                          />
                          <FieldError>
                            {userPasswordForm.formState.errors.currentPassword?.message}
                          </FieldError>
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Controller
                      name="newPassword"
                      rules={{
                        required: 'New password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters long',
                        },
                        maxLength: {
                          value: 64,
                          message: 'Password must be at most 64 characters long',
                        },
                      }}
                      render={({ field }) => (
                        <>
                          <Input id="newPassword" placeholder="Your new password" {...field} />
                          <FieldError>
                            {userPasswordForm.formState.errors.newPassword?.message}
                          </FieldError>
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Controller
                      name="confirmNewPassword"
                      rules={{
                        required: 'Please confirm your new password',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters long',
                        },
                        maxLength: {
                          value: 64,
                          message: 'Password must be at most 64 characters long',
                        },
                        validate: (value) => value === newPasswordValue || 'Passwords do not match',
                      }}
                      render={({ field }) => (
                        <>
                          <Input
                            id="confirmNewPassword"
                            placeholder="Confirm your new password"
                            {...field}
                          />
                          <FieldError>
                            {userPasswordForm.formState.errors.confirmNewPassword?.message}
                          </FieldError>
                        </>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={userPasswordForm.formState.isSubmitting}
                >
                  {userPasswordForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                {/* <Button variant="outline" className="w-full">
                  Cancel
                </Button> */}
              </CardFooter>
            </Card>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

const TabBots = () => {
  return <div>Bots Settings</div>;
};

const groups = [
  {
    title: 'User Settings',
    items: [{ id: 'account', title: 'My Account', component: TabAccount }],
  },
  {
    title: 'Bots & Integrations',
    items: [{ id: 'bots', title: 'Bots', component: TabBots }],
  },
];

const UserSettingsDialogContent = () => {
  const store = useStore();

  const [tab, setTab] = useState('account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setIsMobileMenuOpen(false);
  };

  const getActiveTitle = () => {
    for (const group of groups) {
      const found = group.items.find((i) => i.id === tab);
      if (found) return found.title;
    }
    return 'Settings';
  };

  return (
    <DialogContent className="!inset-0 m-auto flex size-full !max-h-[90vh] !max-w-[90vw] !translate-x-0 !translate-y-0 flex-row p-0">
      <DialogTitle className="sr-only">User Settings</DialogTitle>
      <SheetDescription className="sr-only">
        Manage your user settings and preferences.
      </SheetDescription>
      <SidebarProvider
        className={`h-full !min-h-0 w-auto ${isMobileMenuOpen ? 'flex w-full' : 'hidden md:flex'}`}
      >
        <Sidebar collapsible="none" className="h-full w-full rounded-lg p-4">
          <SidebarHeader className="flex-row gap-4">
            <div>
              <Avatar user={store.user} className="size-12 text-xl" />
            </div>
            <div>
              <p className="text-lg font-medium text-sidebar-foreground">{store.user.username}</p>
              <p className="text-xs text-sidebar-foreground/70">Manage Your Settings</p>
            </div>
          </SidebarHeader>
          {groups.map((item) => (
            <SidebarGroup key={item.title}>
              <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {item.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={tab === item.id}>
                        <button
                          onClick={() => handleTabChange(item.id)}
                          className="w-full text-left"
                        >
                          {item.title}
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </Sidebar>
      </SidebarProvider>
      <div
        className={`flex h-full flex-1 flex-col overflow-hidden rounded-lg bg-background ${isMobileMenuOpen ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="flex flex-shrink-0 items-center gap-2 border-b p-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="-ml-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>
          <span className="text-lg font-semibold">{getActiveTitle()}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {groups.map((group) =>
            group.items.map((item) => (item.id === tab ? <item.component key={item.id} /> : null))
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default UserSettingsDialogContent;
