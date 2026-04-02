import { useState, useCallback, useRef } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/ignite/services/auth.service';

const HCAPTCHA_SITE_KEY = '78b0437e-9a22-4e50-aae6-26ae467445d8';

export default function ConnectIgniteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setMode('login');
      }}
    >
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Login to Ignite' : 'Create an Account'}</DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Log in with your Ignite account.'
              : 'Register for a new Ignite account.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'login' ? (
          <LoginContent
            onSuccess={() => onOpenChange(false)}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterContent
            onSuccess={() => onOpenChange(false)}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LoginContent({
  onSuccess,
  onSwitchToRegister,
}: {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}) {
  const form = useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);

  const onSubmit = useCallback(
    async (data: any) => {
      if (!captchaToken) {
        setSubmitError('Please complete the captcha.');
        return;
      }

      try {
        await AuthService.login({ ...data, hcaptcha_captcha_token: captchaToken });
        onSuccess();
      } catch (error: any) {
        setSubmitError(error.response?.data?.message || 'An unknown error occurred during login.');
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    },
    [captchaToken, onSuccess],
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-gray-400">Username</label>
            <Controller
              name="username"
              rules={{ required: 'Username is required' }}
              render={({ field, formState }) => (
                <>
                  <Input
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="bg-[#1e1f22]"
                    {...field}
                  />
                  <FieldError>
                    {formState.errors.username && String(formState.errors.username.message)}
                  </FieldError>
                </>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-gray-400">Password</label>
            <Controller
              name="password"
              rules={{ required: 'Password is required' }}
              render={({ field, formState }) => (
                <>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="bg-[#1e1f22]"
                    {...field}
                  />
                  <FieldError>
                    {formState.errors.password && String(formState.errors.password.message)}
                  </FieldError>
                </>
              )}
            />
          </div>
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            theme="dark"
            onVerify={(token: string) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
          {submitError && <FieldError>{submitError}</FieldError>}
          <Button type="submit" disabled={form.formState.isSubmitting || !captchaToken}>
            {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button type="button" className="text-primary underline" onClick={onSwitchToRegister}>
              Sign up
            </button>
          </p>
        </div>
      </form>
    </FormProvider>
  );
}

function RegisterContent({
  onSuccess,
  onSwitchToLogin,
}: {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}) {
  const form = useForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);

  const passwordValue = form.watch('password');

  const onSubmit = useCallback(
    async (data: any) => {
      if (!captchaToken) {
        setSubmitError('Please complete the captcha.');
        return;
      }

      try {
        await AuthService.register({ ...data, hcaptcha_captcha_token: captchaToken });
        onSuccess();
      } catch (error: any) {
        setSubmitError(
          error.response?.data?.message || 'An unknown error occurred during registration.',
        );
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    },
    [captchaToken, onSuccess],
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase text-gray-400">Username</label>
            <Controller
              name="username"
              rules={{ required: 'Username is required' }}
              render={({ field, formState }) => (
                <>
                  <Input
                    placeholder="Choose a username"
                    autoComplete="username"
                    className="bg-[#1e1f22]"
                    {...field}
                  />
                  <FieldError>
                    {formState.errors.username && String(formState.errors.username.message)}
                  </FieldError>
                </>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase text-gray-400">Password</label>
              <Controller
                name="password"
                rules={{
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                }}
                render={({ field, formState }) => (
                  <>
                    <Input
                      type="password"
                      placeholder="Password"
                      autoComplete="new-password"
                      className="bg-[#1e1f22]"
                      {...field}
                    />
                    <FieldError>
                      {formState.errors.password && String(formState.errors.password.message)}
                    </FieldError>
                  </>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase text-gray-400">Confirm</label>
              <Controller
                name="confirmPassword"
                rules={{
                  required: 'Required',
                  validate: (value) => value === passwordValue || 'Passwords do not match',
                }}
                render={({ field, formState }) => (
                  <>
                    <Input
                      type="password"
                      placeholder="Confirm"
                      autoComplete="new-password"
                      className="bg-[#1e1f22]"
                      {...field}
                    />
                    <FieldError>
                      {formState.errors.confirmPassword &&
                        String(formState.errors.confirmPassword.message)}
                    </FieldError>
                  </>
                )}
              />
            </div>
          </div>
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            theme="dark"
            onVerify={(token: string) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
          {submitError && <FieldError>{submitError}</FieldError>}
          <Button type="submit" disabled={form.formState.isSubmitting || !captchaToken}>
            {form.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button type="button" className="text-primary underline" onClick={onSwitchToLogin}>
              Log in
            </button>
          </p>
        </div>
      </form>
    </FormProvider>
  );
}
