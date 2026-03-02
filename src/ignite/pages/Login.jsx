import { useCallback, useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { AuthService } from '../services/auth.service';

const HCAPTCHA_SITE_KEY = '78b0437e-9a22-4e50-aae6-26ae467445d8';
import GuestLayout from '../layouts/GuestLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const LoginPage = () => {
  const form = useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [submitError, setSubmitError] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const onSubmit = useCallback(
    async (data) => {
      if (!captchaToken) {
        setSubmitError('Please complete the captcha.');
        return;
      }

      try {
        await AuthService.login({ ...data, hcaptcha_captcha_token: captchaToken });
        const redirectTo = searchParams.get('redirect') || '/channels/@me';
        navigate(redirectTo, { replace: true });
      } catch (error) {
        console.error(error);
        setSubmitError(error.response?.data?.message || 'An unknown error occurred during login.');
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    },
    [navigate, searchParams, captchaToken]
  );

  return (
    <GuestLayout>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            <Card className="overflow-hidden p-0">
              <CardContent className="grid p-0 md:grid-cols-2">
                <div className="p-6 md:p-8">
                  <FieldGroup>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <h1 className="text-2xl font-bold">Welcome back</h1>
                      <p className="text-balance text-muted-foreground">
                        Login to your Ignite account
                      </p>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="username">Username</FieldLabel>
                      <Controller
                        name="username"
                        rules={{
                          required: 'Username is required',
                        }}
                        render={({ field, formState }) => (
                          <>
                            <Input placeholder="Enter your username" {...field} />
                            <FieldError>
                              {formState.errors.username && formState.errors.username.message}
                            </FieldError>
                          </>
                        )}
                      />
                    </Field>
                    <Field>
                      <div className="flex items-end">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <a
                          href="#"
                          className="ml-auto text-xs text-gray-400 underline-offset-2 hover:underline"
                          tabIndex={-1}
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <Controller
                        name="password"
                        rules={{
                          required: 'Password is required',
                        }}
                        render={({ field, formState }) => (
                          <>
                            <Input type="password" placeholder="Enter your password" {...field} />
                            <FieldError>
                              {formState.errors.password && formState.errors.password.message}
                            </FieldError>
                          </>
                        )}
                      />
                    </Field>
                    <Field>
                      <HCaptcha
                        ref={captchaRef}
                        sitekey={HCAPTCHA_SITE_KEY}
                        theme="dark"
                        onVerify={(token) => setCaptchaToken(token)}
                        onExpire={() => setCaptchaToken(null)}
                      />
                    </Field>
                    {submitError && <FieldError>{submitError}</FieldError>}
                    <Field>
                      <Button type="submit" disabled={form.formState.isSubmitting || !captchaToken}>
                        {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
                      </Button>
                    </Field>
                    <FieldDescription className="text-center">
                      Don&apos;t have an account?{' '}
                      <Link to="/register" className="underline">
                        Sign up
                      </Link>
                    </FieldDescription>
                  </FieldGroup>
                </div>
                <div className="relative hidden bg-muted md:block">
                  {/* <img
                    src="https://i.postimg.cc/VN4nCKSs/deepfried-1768849587764.jpg"
                    alt="Image"
                    className="absolute inset-0 size-full object-cover dark:brightness-[0.2] dark:grayscale"
                  /> */}
                </div>
              </CardContent>
            </Card>
            <FieldDescription className="px-6 text-center">
              By logging in, you agree to our <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </FieldDescription>
          </div>
        </form>
      </FormProvider>
    </GuestLayout>
  );
};

export default LoginPage;
