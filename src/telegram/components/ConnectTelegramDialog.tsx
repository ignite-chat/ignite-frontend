import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';
import { TelegramClientService } from '../services/telegram-client.service';
import { TelegramService } from '../services/telegram.service';

type AuthStep = 'phone' | 'code' | 'password' | 'success' | 'error';

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway' },
  { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark' },
  { code: '+358', country: 'FI', flag: '🇫🇮', name: 'Finland' },
  { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Poland' },
  { code: '+43', country: 'AT', flag: '🇦🇹', name: 'Austria' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+32', country: 'BE', flag: '🇧🇪', name: 'Belgium' },
  { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: '+353', country: 'IE', flag: '🇮🇪', name: 'Ireland' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
  { code: '+380', country: 'UA', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+90', country: 'TR', flag: '🇹🇷', name: 'Turkey' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+972', country: 'IL', flag: '🇮🇱', name: 'Israel' },
  { code: '+20', country: 'EG', flag: '🇪🇬', name: 'Egypt' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', country: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: '+886', country: 'TW', flag: '🇹🇼', name: 'Taiwan' },
  { code: '+852', country: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
];

// ─── QR Code Auth ────────────────────────────────────────────────

function QrCodeStep({
  active,
  onSuccess,
}: {
  active: boolean;
  onSuccess: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'password' | 'error'>('idle');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const passwordResolveRef = useRef<((pw: string) => void) | null>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

  const startQrLogin = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus('loading');
    setError('');
    setQrUrl(null);
    cancelledRef.current = false;

    try {
      await TelegramClientService.signInWithQrCode(
        (url, expires) => {
          if (cancelledRef.current) return;
          setQrUrl(url);
          setExpiresAt(expires);
          setStatus('ready');
        },
        () => {
          return new Promise<string>((resolve) => {
            passwordResolveRef.current = resolve;
            setStatus('password');
            setPasswordError('');
            setPassword('');
          });
        },
      );

      if (!cancelledRef.current) {
        onSuccess();
      }
    } catch (err: any) {
      if (cancelledRef.current) return;
      console.error('[Telegram] QR login failed:', err);
      startedRef.current = false;
      if (err.message?.includes('timed out') || err.message?.includes('WebSocket')) {
        setError('Could not connect to Telegram servers. Check your network.');
      } else {
        setError(err.message || 'QR code login failed.');
      }
      setStatus('error');
    }
  }, [onSuccess]);

  // Start when active, reset when inactive
  useEffect(() => {
    if (active) {
      if (status === 'idle') {
        startQrLogin();
      }
    } else {
      cancelledRef.current = true;
      startedRef.current = false;
    }
    return () => {
      cancelledRef.current = true;
      startedRef.current = false;
    };
  }, [active]);

  // Countdown timer for QR expiry display
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt || status !== 'ready') return;
    const update = () => {
      const left = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      setTimeLeft(left);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status, qrUrl]);

  const handlePasswordSubmit = () => {
    if (!password || !passwordResolveRef.current) return;
    setPasswordLoading(true);
    passwordResolveRef.current(password);
    passwordResolveRef.current = null;
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Skeleton className="size-[200px] rounded-lg" />
        <p className="text-sm text-gray-400">Connecting to Telegram...</p>
      </div>
    );
  }

  if (status === 'password') {
    return (
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-gray-400">
          Two-factor authentication is enabled. Enter your cloud password.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase text-gray-400">Cloud Password</label>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="bg-[#1e1f22] focus-visible:ring-[#2AABEE]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordSubmit();
            }}
            autoFocus
          />
        </div>
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        <Button className="bg-[#2AABEE] hover:bg-[#229ED9]" disabled={passwordLoading || !password} onClick={handlePasswordSubmit}>
          {passwordLoading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
              Verifying...
            </span>
          ) : (
            'Submit'
          )}
        </Button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => { setStatus('idle'); startedRef.current = false; startQrLogin(); }}>
          Try Again
        </Button>
      </div>
    );
  }

  // QR ready or generating
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {qrUrl ? (
        <>
          <div className="relative rounded-lg bg-white p-3">
            <QRCodeSVG
              value={qrUrl}
              size={192}
              level="M"
              imageSettings={{
                src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="%232AABEE"/><path d="M34.6 13.8c.3-.3.1-.8-.4-.7l-24 9.2c-.4.2-.5.7-.1.9l6.1 3.3 2.4 7.7c.1.4.6.5.9.2l3.4-3.2 6.7 4.9c.4.3.9.1 1-.3l4.7-21.3-.7-.7z" fill="white"/></svg>'),
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          {timeLeft > 0 && (
            <p className="text-xs text-gray-500">
              Refreshes in {timeLeft}s
            </p>
          )}
          <p className="text-center text-sm text-gray-400">
            Open Telegram on your phone, go to<br />
            <span className="text-white">Settings &gt; Devices &gt; Link Desktop Device</span><br />
            and scan this QR code.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-[200px] rounded-lg" />
          <p className="text-sm text-gray-400">Generating QR code...</p>
        </div>
      )}
    </div>
  );
}

// ─── Phone Auth ──────────────────────────────────────────────────

function PhoneStep({
  onCodeSent,
  onError,
}: {
  onCodeSent: (phone: string, codeHash: string) => void;
  onError: (msg: string) => void;
}) {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(
    () => COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0],
    [countryCode],
  );

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRY_CODES;
    const q = search.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q) || c.country.toLowerCase().includes(q),
    );
  }, [search]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const fullPhone = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) return;
    setError('');
    setLoading(true);

    try {
      const result = await TelegramClientService.sendCode(fullPhone);
      onCodeSent(fullPhone, result.phoneCodeHash);
    } catch (err: any) {
      console.error('[Telegram] Send code failed:', err);
      setLoading(false);
      if (err.errorMessage === 'PHONE_NUMBER_INVALID') {
        setError('Invalid phone number. Please check the number and try again.');
      } else if (err.errorMessage === 'PHONE_NUMBER_FLOOD') {
        setError('Too many attempts. Please try again later.');
      } else if (err.errorMessage === 'PHONE_NUMBER_BANNED') {
        setError('This phone number has been banned from Telegram.');
      } else if (err.message?.includes('WebSocket') || err.message?.includes('timed out')) {
        setError('Could not connect to Telegram servers. Check your network.');
      } else {
        setError(err.errorMessage || err.message || 'Failed to send verification code.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400">Phone Number</label>
        <div className="flex gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-[#1e1f22] px-2.5 text-sm transition-colors hover:bg-accent"
              onClick={() => { setDropdownOpen(!dropdownOpen); setSearch(''); }}
            >
              <span>{selectedCountry.flag}</span>
              <span className="font-mono text-gray-300">{countryCode}</span>
              <svg className={`size-3 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-md border border-white/10 bg-[#1e1f22] shadow-xl">
                <div className="border-b border-white/5 p-2">
                  <input
                    type="text"
                    className="w-full rounded bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    placeholder="Search countries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCountries.map((c) => (
                    <button
                      key={`${c.country}-${c.code}`}
                      type="button"
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                        c.code === countryCode && c.country === selectedCountry.country ? 'bg-white/10' : ''
                      }`}
                      onClick={() => { setCountryCode(c.code); setDropdownOpen(false); setSearch(''); phoneInputRef.current?.focus(); }}
                    >
                      <span>{c.flag}</span>
                      <span className="flex-1 text-gray-200">{c.name}</span>
                      <span className="font-mono text-xs text-gray-500">{c.code}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="px-3 py-3 text-center text-xs text-gray-500">No results</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Input
            ref={phoneInputRef}
            type="tel"
            autoComplete="tel-national"
            placeholder="Phone number"
            className="flex-1 bg-[#1e1f22] focus-visible:ring-[#2AABEE]"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s\-()]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full bg-[#2AABEE] hover:bg-[#229ED9]" disabled={loading || !phoneNumber.trim()} onClick={handleSubmit}>
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
            Connecting...
          </span>
        ) : (
          'Send Code'
        )}
      </Button>
    </div>
  );
}

function CodeStep({
  phone,
  phoneCodeHash,
  onNeed2FA,
  onSuccess,
  onBack,
}: {
  phone: string;
  phoneCodeHash: string;
  onNeed2FA: () => void;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (code.length < 5) return;
    setError('');
    setLoading(true);

    try {
      await TelegramClientService.signIn(phone, phoneCodeHash, code);
      onSuccess();
    } catch (err: any) {
      console.error('[Telegram] Sign in failed:', err);
      setLoading(false);
      if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        onNeed2FA();
      } else if (err.errorMessage === 'PHONE_CODE_INVALID') {
        setError('Invalid verification code. Please try again.');
        setCode('');
      } else if (err.errorMessage === 'PHONE_CODE_EXPIRED') {
        setError('Code has expired. Please go back and request a new one.');
      } else {
        setError(err.errorMessage || err.message || 'Verification failed.');
      }
    }
  };

  const maskedPhone = phone.length > 4
    ? phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4)
    : phone;

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-gray-400">
        Enter the verification code sent to{' '}
        <span className="font-mono font-medium text-white">{maskedPhone}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400">Verification Code</label>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="00000"
          className="bg-[#1e1f22] text-center font-mono text-lg tracking-widest focus-visible:ring-[#2AABEE]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1 bg-[#2AABEE] hover:bg-[#229ED9]" disabled={loading || code.length < 5} onClick={handleSubmit}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
              Verifying...
            </span>
          ) : (
            'Verify'
          )}
        </Button>
      </div>
    </div>
  );
}

function PasswordStep({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password) return;
    setError('');
    setLoading(true);

    try {
      await TelegramClientService.signIn2FA(password);
      onSuccess();
    } catch (err: any) {
      console.error('[Telegram] 2FA failed:', err);
      setLoading(false);
      if (err.errorMessage === 'PASSWORD_HASH_INVALID') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.errorMessage || err.message || '2FA verification failed.');
      }
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-gray-400">
        Two-factor authentication is enabled. Enter your cloud password.
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase text-gray-400">Cloud Password</label>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="bg-[#1e1f22] focus-visible:ring-[#2AABEE]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1 bg-[#2AABEE] hover:bg-[#229ED9]" disabled={loading || !password} onClick={handleSubmit}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
              Verifying...
            </span>
          ) : (
            'Submit'
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Dialog ─────────────────────────────────────────────────

export default function ConnectTelegramDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCodeSent = useCallback((ph: string, hash: string) => {
    setPhone(ph);
    setPhoneCodeHash(hash);
    setStep('code');
  }, []);

  const handleNeed2FA = useCallback(() => {
    setStep('password');
  }, []);

  const handleSuccess = useCallback(async () => {
    setStep('success');
    await TelegramService.connect();
    setTimeout(() => {
      onOpenChange(false);
      setStep('phone');
    }, 1000);
  }, [onOpenChange]);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setStep('error');
  }, []);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      onOpenChange(o);
      if (!o) {
        setStep('phone');
        setPhone('');
        setPhoneCodeHash('');
        setErrorMsg('');
      }
    },
    [onOpenChange],
  );

  // Phone sub-steps (code, password) render outside the tabs
  const showTabs = step === 'phone';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Connect Telegram</DialogTitle>
          <DialogDescription>
            {showTabs
              ? 'Log in with your phone number or scan a QR code.'
              : step === 'code'
                ? 'Enter the verification code.'
                : step === 'password'
                  ? 'Enter your 2FA password.'
                  : step === 'success'
                    ? 'You are now connected.'
                    : 'Something went wrong.'}
          </DialogDescription>
        </DialogHeader>

        {showTabs && (
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <PhoneStep onCodeSent={handleCodeSent} onError={handleError} />
            </div>

            <div className="flex w-[250px] shrink-0 flex-col items-center justify-center border-l border-white/10 pl-6">
              <QrCodeStep
                active={open}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        )}

        {step === 'code' && (
          <CodeStep
            phone={phone}
            phoneCodeHash={phoneCodeHash}
            onNeed2FA={handleNeed2FA}
            onSuccess={handleSuccess}
            onBack={() => setStep('phone')}
          />
        )}

        {step === 'password' && (
          <PasswordStep
            onSuccess={handleSuccess}
            onBack={() => setStep('code')}
          />
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-500/20">
              <svg className="size-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-500">Connected successfully!</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/20">
              <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-center text-sm text-destructive">{errorMsg}</p>
            <Button
              variant="outline"
              onClick={() => { setStep('phone'); setErrorMsg(''); }}
            >
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
