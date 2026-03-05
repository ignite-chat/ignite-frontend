import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

function QrAuthContent({
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
        <p className="text-sm text-gray-400">Generating QR code...</p>
      </div>
    );
  }

  if (state.status === 'qr_ready') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="rounded-lg bg-white p-3">
          <QRCodeSVG value={state.qrUrl} size={176} />
        </div>
        <p className="text-sm text-gray-400">
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
        <span className="font-mono text-xs text-gray-400">
          {entry.token.slice(0, 18)}...
        </span>
      </div>
    </button>
  );
}

function AutoDetectContent({
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
      {invalidEntries.length > 0 && (
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
      )}

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

function TokenAuthContent({
  onAuthenticated,
  onCancel,
}: {
  onAuthenticated: (token: string) => void;
  onCancel: () => void;
}) {
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmit = () => {
    if (tokenInput.trim()) {
      onAuthenticated(tokenInput.trim());
      setTokenInput('');
    }
  };

  return (
    <div className="flex flex-col gap-3 py-2">
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
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!tokenInput.trim()} onClick={handleSubmit}>
          Connect
        </Button>
      </DialogFooter>
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
  const defaultTab = isNative ? 'detect' : 'qr';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleAuthenticated = useCallback((token: string) => {
    useDiscordStore.getState().setToken(token);
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
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Discord</DialogTitle>
          <DialogDescription>
            Scan the QR code with your Discord mobile app, or enter your token.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            {isNative && <TabsTrigger value="detect">Auto Detect</TabsTrigger>}
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="token">Token</TabsTrigger>
          </TabsList>

          {isNative && (
            <TabsContent value="detect">
              <AutoDetectContent
                onAuthenticated={handleAuthenticated}
              />
            </TabsContent>
          )}

          <TabsContent value="qr">
            <QrAuthContent
              active={open && activeTab === 'qr'}
              onAuthenticated={handleAuthenticated}
            />
          </TabsContent>

          <TabsContent value="token">
            <TokenAuthContent
              onAuthenticated={handleAuthenticated}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
