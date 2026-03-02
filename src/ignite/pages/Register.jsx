import { useCallback, useState, useEffect, useRef } from 'react';
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

const RegisterPage = () => {
  const form = useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [submitError, setSubmitError] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  // Pre-fill username from URL parameter if provided
  useEffect(() => {
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      form.setValue('username', usernameParam);
    }
  }, [searchParams, form]);

  const onSubmit = useCallback(
    async (data) => {
      if (!captchaToken) {
        setSubmitError('Please complete the captcha.');
        return;
      }

      try {
        await AuthService.register({ ...data, hcaptcha_captcha_token: captchaToken });
        const redirectTo = searchParams.get('redirect') || '/channels/@me';
        navigate(redirectTo, { replace: true });
      } catch (error) {
        console.error(error);
        setSubmitError(
          error.response?.data?.message || 'An unknown error occurred during registration.'
        );
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    },
    [navigate, searchParams, captchaToken]
  );

  const passwordValue = form.watch('password');

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
                      <h1 className="text-2xl font-bold">Create your account</h1>
                      <p className="text-balance text-muted-foreground">
                        Register for a new Ignite account
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
                            <Input id="username" placeholder="Enter your username" {...field} />
                            <FieldError>
                              {formState.errors.username && formState.errors.username.message}
                            </FieldError>
                          </>
                        )}
                      />
                    </Field>
                    <Field>
                      <Field className="grid grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel htmlFor="password">Password</FieldLabel>
                          <Controller
                            name="password"
                            rules={{
                              required: 'Password is required',
                              minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters long',
                              },
                            }}
                            render={({ field, formState }) => (
                              <>
                                <Input
                                  type="password"
                                  placeholder="Enter your password"
                                  {...field}
                                />
                                <FieldError>
                                  {formState.errors.password && formState.errors.password.message}
                                </FieldError>
                              </>
                            )}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                          <Controller
                            name="confirmPassword"
                            rules={{
                              required: 'Password confirmation is required',
                              minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters long',
                              },
                              validate: (value) =>
                                value === passwordValue || 'Passwords do not match',
                            }}
                            render={({ field, formState }) => (
                              <>
                                <Input
                                  type="password"
                                  placeholder="Confirm your password"
                                  {...field}
                                />
                                <FieldError>
                                  {formState.errors.confirmPassword &&
                                    formState.errors.confirmPassword.message}
                                </FieldError>
                              </>
                            )}
                          />
                        </Field>
                      </Field>
                      <FieldDescription className="hidden">
                        Must be at least 8 characters long.
                      </FieldDescription>
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
                        {form.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </Field>
                    <FieldDescription className="text-center">
                      Already have an account?{' '}
                      <Link to="/login" className="underline">
                        Log in
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
              By registering, you agree to our <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </FieldDescription>
          </div>
        </form>
      </FormProvider>
    </GuestLayout>
  );
};

export default RegisterPage;
