import { useCallback } from 'react';
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="dialogCurrentPassword"
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
              control={form.control}
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
              control={form.control}
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

export default ChangePasswordDialog;
