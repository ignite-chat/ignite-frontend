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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDiscordStore } from '@/discord/store/discord.store';
import {
  QrAuthContent,
  AutoDetectContent,
  LoginAuthContent,
} from '@/discord/components/ConnectDiscordDialog';

const DiscordLoginContent = ({ onAuthenticated }) => {
  const isNative = !!window.IgniteNative;
  const defaultTab = 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          {isNative && <TabsTrigger value="detect">Auto Detect</TabsTrigger>}
          <TabsTrigger value="login">Login</TabsTrigger>
          {isNative && <TabsTrigger value="qr">QR Code</TabsTrigger>}
          <TabsTrigger value="token">Token</TabsTrigger>
        </TabsList>

        {isNative && (
          <TabsContent value="detect">
            <AutoDetectContent onAuthenticated={onAuthenticated} />
          </TabsContent>
        )}

        <TabsContent value="login">
          <LoginAuthContent onAuthenticated={onAuthenticated} />
        </TabsContent>

        {isNative && (
          <TabsContent value="qr">
            <QrAuthContent active={activeTab === 'qr'} onAuthenticated={onAuthenticated} />
          </TabsContent>
        )}

        <TabsContent value="token">
          <div className="flex flex-col gap-3 py-2">
            <TokenInput onAuthenticated={onAuthenticated} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const TokenInput = ({ onAuthenticated }) => {
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmit = () => {
    if (tokenInput.trim()) {
      onAuthenticated(tokenInput.trim());
      setTokenInput('');
    }
  };

  return (
    <>
      <Input
        type="password"
        name="ignite-discord-token"
        autoComplete="off"
        placeholder="Discord token"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
      />
      <Button disabled={!tokenInput.trim()} onClick={handleSubmit} className="w-full">
        Login with Discord
      </Button>
    </>
  );
};

const LoginPage = () => {
  const form = useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loginMode, setLoginMode] = useState('ignite');

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

  const handleDiscordAuthenticated = useCallback(
    (token) => {
      useDiscordStore.getState().setToken(token);
      navigate('/discord', { replace: true });
    },
    [navigate]
  );

  return (
    <GuestLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    {loginMode === 'ignite'
                      ? 'Login to your Ignite account'
                      : 'Login with your Discord account'}
                  </p>
                </div>

                <div className="flex rounded-lg border border-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => setLoginMode('ignite')}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      loginMode === 'ignite'
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Ignite
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('discord')}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      loginMode === 'discord'
                        ? 'bg-[#5865f2]/20 text-[#5865f2]'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Discord
                  </button>
                </div>

                {loginMode === 'ignite' ? (
                  <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="username">Username</FieldLabel>
                          <Controller
                            name="username"
                            rules={{
                              required: 'Username is required',
                            }}
                            render={({ field, formState }) => (
                              <>
                                <Input
                                  placeholder="Enter your username"
                                  autoComplete="username"
                                  {...field}
                                />
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
                                <Input
                                  type="password"
                                  placeholder="Enter your password"
                                  autoComplete="current-password"
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
                          <Button
                            type="submit"
                            disabled={form.formState.isSubmitting || !captchaToken}
                          >
                            {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
                          </Button>
                        </Field>
                      </FieldGroup>
                    </form>
                  </FormProvider>
                ) : (
                  <DiscordLoginContent onAuthenticated={handleDiscordAuthenticated} />
                )}

                {loginMode === 'ignite' && (
                  <FieldDescription className="text-center">
                    Don&apos;t have an account?{' '}
                    <Link to="/register" className="underline">
                      Sign up
                    </Link>
                  </FieldDescription>
                )}
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
    </GuestLayout>
  );
};

export default LoginPage;
