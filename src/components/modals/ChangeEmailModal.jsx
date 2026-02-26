import { useCallback } from 'react';
import api from '@/api';
import { useUsersStore } from '@/store/users.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller, useForm } from 'react-hook-form';
import { FieldError } from '@/components/ui/field';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useModalStore } from '@/store/modal.store';

const ChangeEmailModal = ({ modalId }) => {
  const user = useUsersStore((s) => s.getCurrentUser());
  const setUser = useUsersStore((s) => s.setUser);

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
        setUser(user.id, { ...user, email: data.email });
        useModalStore.getState().close(modalId);
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
    [form, modalId, user, setUser]
  );

  return (
    <AlertDialog open onOpenChange={(v) => { if (!v) useModalStore.getState().close(modalId); }}>
      <AlertDialogContent className="!max-w-md sm:!max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Change your email</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your new email address and current password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="dialogEmail"
              className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              New Email
            </Label>
            <Controller
              control={form.control}
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
              control={form.control}
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

export default ChangeEmailModal;
