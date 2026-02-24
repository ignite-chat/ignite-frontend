import { useCallback } from 'react';
import api from '../../../api';
import { useUsersStore } from '@/store/users.store';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Controller, useForm } from 'react-hook-form';
import { FieldError } from '../../ui/field';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { useModalStore } from '@/store/modal.store';

const ChangeUsernameDialog = ({ modalId }) => {
  const user = useUsersStore((s) => s.getCurrentUser());
  const setUser = useUsersStore((s) => s.setUser);

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
        setUser(user.id, { ...user, username: data.username });
        useModalStore.getState().close(modalId);
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
    [form, modalId, user, setUser]
  );

  return (
    <AlertDialog open onOpenChange={(v) => { if (!v) useModalStore.getState().close(modalId); }}>
      <AlertDialogContent className="!max-w-md sm:!max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Change your username</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a new username and your current password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="dialogUsername"
              className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              New Username
            </Label>
            <Controller
              control={form.control}
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
              control={form.control}
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
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => form.reset()}>Cancel</AlertDialogCancel>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ChangeUsernameDialog;
