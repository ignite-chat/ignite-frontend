import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordRemoteAuth } from '../hooks/useDiscordRemoteAuth';
import { DiscordService } from '../services/discord.service';
import { discordApi } from '../services/discord-api.service';

export function QrAuthContent({
  active,
  onAuthenticated,
}: {
  active: boolean;
  onAuthenticated: (token: string) => void;
}) {
  const isNative = !!window.IgniteNative;
  const { state, retry } = useDiscordRemoteAuth(active && isNative);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!active) handledRef.current = false;
  }, [active]);

  useEffect(() => {
    if (state.status === 'authenticated' && !handledRef.current) {
      handledRef.current = true;
      onAuthenticated(state.token);
    }
  }, [state, onAuthenticated]);

  if (!isNative) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-gray-400">
          QR code login is only available in the desktop app.
        </p>
        <a
          href="https://ignite-chat.com/download"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Download Ignite</Button>
        </a>
      </div>
    );
  }

  if (state.status === 'idle' || state.status === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Skeleton className="size-[200px] rounded-lg" />
        <p className="whitespace-nowrap text-sm text-gray-400">
          Scan with the Discord mobile app
        </p>
      </div>
    );
  }

  if (state.status === 'qr_ready') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="rounded-lg bg-white p-3">
          <QRCodeSVG value={state.qrUrl} size={176} />
        </div>
        <p className="whitespace-nowrap text-sm text-gray-400">
          Scan with the Discord mobile app
        </p>
      </div>
    );
  }

  if (state.status === 'scanned') {
    const avatarUrl = DiscordService.getUserAvatarUrl(
      state.user.userId,
      state.user.avatarHash === '0' ? null : state.user.avatarHash,
    );
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <img
          src={avatarUrl}
          alt={state.user.username}
          className="size-16 rounded-full"
        />
        <p className="text-sm font-medium text-white">{state.user.username}</p>
        <p className="text-sm text-gray-400">Confirm login on your phone</p>
        <div className="mt-1 size-5 animate-spin rounded-full border-2 border-solid border-[#5865f2] border-t-transparent" />
      </div>
    );
  }

  if (state.status === 'authenticated') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm font-medium text-green-500">Connected!</p>
      </div>
    );
  }

  if (state.status === 'timeout') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-gray-400">QR code expired</p>
        <Button variant="outline" onClick={retry}>
          Generate New Code
        </Button>
      </div>
    );
  }

  if (state.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-gray-400">Login was cancelled</p>
        <Button variant="outline" onClick={retry}>
          Try Again
        </Button>
      </div>
    );
  }

  // error
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm text-destructive">{state.message}</p>
      <Button variant="outline" onClick={retry}>
        Try Again
      </Button>
    </div>
  );
}

type ValidatedToken = {
  token: string;
  sources: string[];
  user: { id: string; username: string; global_name: string | null; avatar: string | null } | null;
  status: 'validating' | 'valid' | 'invalid';
};

// Module-level cache so results survive dialog open/close
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let tokenCache: { entries: ValidatedToken[]; timestamp: number } | null = null;

function TokenRow({
  entry,
  onSelect,
}: {
  entry: ValidatedToken;
  onSelect: () => void;
}) {
  const avatarUrl = entry.user
    ? DiscordService.getUserAvatarUrl(entry.user.id, entry.user.avatar, 64)
    : null;
  const displayName = entry.user?.global_name || entry.user?.username;

  return (
    <button
      disabled={entry.status !== 'valid'}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
    >
      {entry.status === 'validating' ? (
        <Skeleton className="size-10 shrink-0 rounded-full" />
      ) : avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName || ''}
          className="size-10 shrink-0 rounded-full"
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-xs text-destructive">
          ?
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {entry.status === 'validating' ? (
          <Skeleton className="h-4 w-24 rounded" />
        ) : entry.status === 'valid' ? (
          <span className="truncate text-sm font-medium">{displayName}</span>
        ) : (
          <span className="text-sm font-medium text-destructive">Invalid Token</span>
        )}
        <span className="text-xs text-gray-500">{entry.sources.join(', ')}</span>
      </div>
    </button>
  );
}

export function AutoDetectContent({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const hasAutoDetect = typeof window.IgniteNative?.getDiscordLocalTokens === 'function';

  const [phase, setPhase] = useState<'idle' | 'scanning' | 'validating' | 'done' | 'error'>(
    // Load from cache instantly if fresh
    tokenCache && Date.now() - tokenCache.timestamp < CACHE_TTL ? 'done' : 'idle',
  );
  const [entries, setEntries] = useState<ValidatedToken[]>(
    tokenCache && Date.now() - tokenCache.timestamp < CACHE_TTL ? tokenCache.entries : [],
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [showInvalid, setShowInvalid] = useState(false);

  if (!hasAutoDetect) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-gray-400">
          This version of Ignite does not support automatic Discord token detection.
        </p>
        <p className="text-xs text-gray-500">
          Please update Ignite or use the QR Code / Token tab instead.
        </p>
      </div>
    );
  }

  const scan = useCallback(async (skipCache = false) => {
    if (!skipCache && tokenCache && Date.now() - tokenCache.timestamp < CACHE_TTL) {
      setEntries(tokenCache.entries);
      setPhase('done');
      return;
    }

    setPhase('scanning');
    setEntries([]);
    setShowInvalid(false);

    let raw: Array<{ source: string; token: string }>;
    try {
      raw = await window.IgniteNative!.getDiscordLocalTokens();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to scan for tokens');
      setPhase('error');
      return;
    }

    if (!raw || raw.length === 0) {
      tokenCache = { entries: [], timestamp: Date.now() };
      setPhase('done');
      return;
    }

    // Group by unique token, preserving all sources
    const grouped = new Map<string, string[]>();
    for (const { source, token } of raw) {
      const existing = grouped.get(token);
      if (existing) {
        existing.push(source);
      } else {
        grouped.set(token, [source]);
      }
    }

    const initial: ValidatedToken[] = [...grouped.entries()].map(([token, sources]) => ({
      token,
      sources,
      user: null,
      status: 'validating',
    }));
    setEntries(initial);
    setPhase('validating');

    // Validate all unique tokens in parallel, updating UI as each completes
    await Promise.all(
      initial.map(async (entry, i) => {
        let validated: ValidatedToken;
        try {
          const res = await axios.get('https://discord.com/api/v9/users/@me', {
            headers: { Authorization: entry.token },
          });
          validated = { ...entry, status: 'valid', user: res.data };
        } catch {
          validated = { ...entry, status: 'invalid' };
        }
        setEntries(prev => {
          const next = [...prev];
          next[i] = validated;
          return next;
        });
      }),
    );

    setEntries(prev => {
      tokenCache = { entries: prev, timestamp: Date.now() };
      return prev;
    });
    setPhase('done');
  }, []);

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-gray-400">
          Find Discord tokens from installed apps and browsers.
        </p>
        <Button onClick={() => scan()}>Scan for Tokens</Button>
      </div>
    );
  }

  if (phase === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="size-5 animate-spin rounded-full border-2 border-solid border-[#5865f2] border-t-transparent" />
        <p className="text-sm text-gray-400">Scanning for Discord tokens...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-destructive">{errorMsg}</p>
        <Button variant="outline" onClick={() => scan(true)}>
          Try Again
        </Button>
      </div>
    );
  }

  const invalidEntries = entries.filter((e) => e.status === 'invalid');
  const stillValidating = entries.some((e) => e.status === 'validating');

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-gray-400">No tokens found on this device.</p>
        <Button onClick={() => scan(true)}>
          Rescan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {/* Valid + still-loading tokens */}
      {entries
        .filter((e) => e.status !== 'invalid')
        .map((entry) => (
          <TokenRow
            key={entry.token}
            entry={entry}
            onSelect={() => onAuthenticated(entry.token)}
          />
        ))}

      {/* Invalid tokens accordion */}
      {/* {invalidEntries.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowInvalid((v) => !v)}
            className="flex w-full items-center gap-1.5 px-1 py-1 text-xs text-gray-500 hover:text-gray-400"
          >
            <svg
              className={`size-3 transition-transform ${showInvalid ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {invalidEntries.length} invalid token{invalidEntries.length > 1 ? 's' : ''}
          </button>
          {showInvalid && (
            <div className="mt-1 flex flex-col gap-1.5 opacity-60">
              {invalidEntries.map((entry) => (
                <TokenRow
                  key={entry.token}
                  entry={entry}
                  onSelect={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )} */}

      {/* Rescan button */}
      {!stillValidating && (
        <Button
          size="sm"
          className="mt-1 self-center text-xs "
          onClick={() => scan(true)}
        >
          Rescan
        </Button>
      )}
    </div>
  );
}

export function LoginAuthContent({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA state
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [loginInstanceId, setLoginInstanceId] = useState<string | null>(null);

  // Captcha state
  const [captcha, setCaptcha] = useState<{
    sitekey: string;
    rqdata?: string;
    rqtoken?: string;
    session_id?: string;
    service?: string;
  } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);

  const doLogin = useCallback(
    async (captchaKey?: string, captchaRqtoken?: string, captchaSessionId?: string) => {
      setError('');
      setLoading(true);

      try {
        const headers: Record<string, string> = {};
        if (captchaKey) {
          headers['X-Captcha-Key'] = captchaKey;
          if (captchaRqtoken) headers['X-Captcha-Rqtoken'] = captchaRqtoken;
          if (captchaSessionId) headers['X-Captcha-Session-Id'] = captchaSessionId;
        }

        const res = await discordApi.post(
          '/auth/login',
          {
            login: login.trim(),
            password,
            undelete: false,
          },
          { headers, _captchaRetried: true, _silent: true } as any,
        );

        if (res.data.mfa) {
          setMfaTicket(res.data.ticket);
          setLoginInstanceId(res.data.login_instance_id || null);
          setCaptcha(null);
          setCaptchaToken(null);
        } else if (res.data.token) {
          onAuthenticated(res.data.token);
        }
      } catch (err: any) {
        const data = err.response?.data;

        // Captcha required
        if (
          err.response?.status === 400 &&
          Array.isArray(data?.captcha_key) &&
          data.captcha_key.includes('captcha-required') &&
          data.captcha_sitekey
        ) {
          // Use native Electron captcha window (spoofs discord.com origin)
          if (window.IgniteNative?.solveDiscordCaptcha) {
            try {
              console.log('[Login] Captcha required, opening native solver...');
              console.log('[Login] sitekey:', data.captcha_sitekey);
              console.log('[Login] rqdata:', data.captcha_rqdata ? `${data.captcha_rqdata.length} chars` : 'none');
              console.log('[Login] rqtoken:', data.captcha_rqtoken ? 'present' : 'none');
              console.log('[Login] session_id:', data.captcha_session_id);

              const token = await window.IgniteNative.solveDiscordCaptcha({
                sitekey: data.captcha_sitekey,
                rqdata: data.captcha_rqdata,
              });

              console.log('[Login] Captcha solved, token length:', token.length);
              console.log('[Login] Retrying login with captcha headers...');
              console.log('[Login] X-Captcha-Key:', token.substring(0, 30) + '...');
              console.log('[Login] X-Captcha-Rqtoken:', data.captcha_rqtoken ? 'present' : 'none');
              console.log('[Login] X-Captcha-Session-Id:', data.captcha_session_id);

              // Immediately retry with the solved captcha
              await doLogin(token, data.captcha_rqtoken, data.captcha_session_id);
              return;
            } catch (captchaErr) {
              console.log('[Login] Captcha failed:', captchaErr);
              setError('Captcha verification was cancelled.');
              return;
            }
          }
          // Fallback: render HCaptcha inline (won't work on localhost)
          setCaptcha({
            sitekey: data.captcha_sitekey,
            rqdata: data.captcha_rqdata,
            rqtoken: data.captcha_rqtoken,
            session_id: data.captcha_session_id,
            service: data.captcha_service,
          });
          setCaptchaToken(null);
          captchaRef.current?.resetCaptcha();
        } else {
          setError(
            data?.errors?.login?._errors?.[0]?.message ||
            data?.errors?.password?._errors?.[0]?.message ||
            data?.message ||
            'Login failed',
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [login, password, onAuthenticated],
  );

  const doMfa = useCallback(async () => {
    if (!mfaTicket || mfaCode.length < 6) return;
    setError('');
    setLoading(true);

    try {
      const res = await discordApi.post('/auth/mfa/totp', {
        code: mfaCode.replace(/\s/g, ''),
        ticket: mfaTicket,
        login_instance_id: loginInstanceId,
      }, { _captchaRetried: true, _silent: true } as any);

      if (res.data.token) {
        onAuthenticated(res.data.token);
      }
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.message || 'Invalid authentication code');
      setMfaCode('');
    } finally {
      setLoading(false);
    }
  }, [mfaTicket, mfaCode, loginInstanceId, onAuthenticated]);

  // When captcha is solved, retry login with the token
  useEffect(() => {
    if (captchaToken && captcha) {
      doLogin(captchaToken, captcha.rqtoken, captcha.session_id);
    }
  }, [captchaToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // MFA screen
  if (mfaTicket) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <p className="text-center text-sm text-gray-400">
          Enter the 6-digit code from your authenticator app
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase text-gray-400">Authentication Code</label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="bg-[#1e1f22] text-center font-mono text-lg tracking-widest focus-visible:ring-[#5865f2]"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doMfa();
            }}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setMfaTicket(null);
              setMfaCode('');
              setError('');
            }}
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-[#5865f2] hover:bg-[#4752c4]"
            disabled={loading || mfaCode.length < 6}
            onClick={doMfa}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400">Email or Phone Number</label>
        <Input
          type="text"
          autoComplete="username"
          placeholder="name@example.com"
          className="bg-[#1e1f22] focus-visible:ring-[#5865f2]"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && login.trim() && password) doLogin();
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400">Password</label>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="bg-[#1e1f22] focus-visible:ring-[#5865f2]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && login.trim() && password) doLogin();
          }}
        />
      </div>

      {captcha && (
        <div className="flex justify-center py-2">
          <HCaptcha
            ref={captchaRef}
            sitekey={captcha.sitekey}
            theme="dark"
            onVerify={(token: string) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            {...(captcha.rqdata ? ({ rqdata: captcha.rqdata } as any) : {})}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        disabled={loading || !login.trim() || !password}
        onClick={() => doLogin()}
        className="bg-[#5865f2] hover:bg-[#4752c4]"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </Button>
    </div>
  );
}

export function TokenAuthContent({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmit = () => {
    if (tokenInput.trim()) {
      onAuthenticated(tokenInput.trim());
      setTokenInput('');
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400">Discord Token</label>
        <Input
          type="password"
          name="ignite-discord-token"
          autoComplete="off"
          placeholder="Paste your token here"
          className="bg-[#1e1f22] font-mono text-sm focus-visible:ring-[#5865f2]"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
      </div>
      <Button className="bg-[#5865f2] hover:bg-[#4752c4]" disabled={!tokenInput.trim()} onClick={handleSubmit}>
        Connect
      </Button>
    </div>
  );
}

export default function ConnectDiscordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isNative = !!window.IgniteNative;
  const hasAutoDetect = isNative && window.IgniteNative?.platform === 'win32';
  const defaultTab = hasAutoDetect ? 'detect' : 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleAuthenticated = useCallback((token: string) => {
    useDiscordStore.getState().addAccount(token);
    DiscordService.connect(token);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setActiveTab(defaultTab);
      }}
    >
      <DialogContent className="!max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Connect Discord</DialogTitle>
          <DialogDescription>
            Log in with your Discord account, scan a QR code, or enter a token.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                {hasAutoDetect && <TabsTrigger value="detect">Auto Detect</TabsTrigger>}
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="token">Token</TabsTrigger>
              </TabsList>

              {hasAutoDetect && (
                <TabsContent value="detect">
                  <AutoDetectContent
                    onAuthenticated={handleAuthenticated}
                  />
                </TabsContent>
              )}

              <TabsContent value="login">
                <LoginAuthContent onAuthenticated={handleAuthenticated} />
              </TabsContent>

              <TabsContent value="token">
                <TokenAuthContent
                  onAuthenticated={handleAuthenticated}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex w-[250px] shrink-0 flex-col items-center justify-center border-l border-white/10 pl-6">
            <QrAuthContent
              active={open}
              onAuthenticated={handleAuthenticated}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
