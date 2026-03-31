import { TelegramClient, Api, sessions, password as passwordModule } from 'telegram';
import { TELEGRAM_API_ID, TELEGRAM_API_HASH } from '../constants/api-credentials';
import { useTelegramStore } from '../store/telegram.store';
import { TelegramPhotoCacheService } from './telegram-photo-cache.service';

const { StringSession } = sessions;

export const TelegramClientService = {
  _client: null as TelegramClient | null,

  /**
   * Initialize the TelegramClient with stored session or empty session.
   */
  initialize(sessionString?: string) {
    const session = sessionString || useTelegramStore.getState().session || '';
    this._client = new TelegramClient(
      new StringSession(session),
      TELEGRAM_API_ID,
      TELEGRAM_API_HASH,
      {
        connectionRetries: 3,
        useWSS: true,
        timeout: 10,
      },
    );
    return this._client;
  },

  /**
   * Connect using existing session. Returns true if connected successfully.
   */
  async connect(): Promise<boolean> {
    if (!this._client) {
      this.initialize();
    }
    try {
      await this.connectWithTimeout();

      // Check if we're authorized
      const authorized = await this._client!.checkAuthorization();
      if (authorized) {
        // Save the session string in case it changed
        const sessionStr = (this._client!.session as InstanceType<typeof StringSession>).save();
        useTelegramStore.getState().setSession(sessionStr);
      }
      return authorized;
    } catch (error) {
      console.error('[Telegram] Connection failed:', error);
      return false;
    }
  },

  /**
   * Connect with a timeout. Throws if connection takes too long.
   */
  async connectWithTimeout(timeoutMs: number = 15000): Promise<void> {
    const connectPromise = this._client!.connect();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out. Could not reach Telegram servers.')), timeoutMs),
    );
    await Promise.race([connectPromise, timeoutPromise]);
  },

  /**
   * Send verification code to phone number.
   */
  async sendCode(phoneNumber: string) {
    if (!this._client) {
      this.initialize();
    }
    if (!this._client!.connected) {
      await this.connectWithTimeout();
    }
    const result = await this._client!.invoke(
      new Api.auth.SendCode({
        phoneNumber,
        apiId: TELEGRAM_API_ID,
        apiHash: TELEGRAM_API_HASH,
        settings: new Api.CodeSettings({}),
      }),
    );
    return result;
  },

  /**
   * Complete sign in with phone code.
   */
  async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string) {
    if (!this._client) throw new Error('Client not initialized');
    const result = await this._client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      }),
    );
    // Save session after successful auth
    const sessionStr = (this._client.session as InstanceType<typeof StringSession>).save();
    useTelegramStore.getState().setSession(sessionStr);
    return result;
  },

  /**
   * Complete 2FA verification with password.
   */
  async signIn2FA(password: string) {
    if (!this._client) throw new Error('Client not initialized');
    const passwordInfo = await this._client.invoke(new Api.account.GetPassword());
    const inputPassword = await passwordModule.computeCheck(passwordInfo, password);
    const result = await this._client.invoke(
      new Api.auth.CheckPassword({
        password: inputPassword,
      }),
    );
    // Save session after successful 2FA
    const sessionStr = (this._client.session as InstanceType<typeof StringSession>).save();
    useTelegramStore.getState().setSession(sessionStr);
    return result;
  },

  /**
   * Sign in via QR code. Calls `onQrCode` each time a new QR token is generated.
   * The user scans the QR with their phone's Telegram app.
   * Returns the authenticated user, or throws on error/cancellation.
   */
  async signInWithQrCode(
    onQrCode: (url: string, expires: number) => void,
    onPassword: () => Promise<string>,
  ): Promise<any> {
    if (!this._client) {
      this.initialize();
    }
    if (!this._client!.connected) {
      await this.connectWithTimeout();
    }

    const user = await this._client!.signInUserWithQrCode(
      { apiId: TELEGRAM_API_ID, apiHash: TELEGRAM_API_HASH },
      {
        qrCode: async (qrCode: { token: any; expires: number }) => {
          // token is a Buffer/Uint8Array — encode as base64url for tg:// login URL
          const bytes = new Uint8Array(qrCode.token);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const tokenBase64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

          const url = `tg://login?token=${tokenBase64}`;
          console.log('[Telegram] QR login URL generated, expires:', new Date(qrCode.expires * 1000).toLocaleTimeString());
          onQrCode(url, qrCode.expires);
        },
        password: async (_hint?: string) => {
          return onPassword();
        },
        onError: async (err: Error) => {
          console.error('[Telegram] QR auth error:', err);
          return false; // don't stop, let it retry
        },
      },
    );

    // Save session
    const sessionStr = (this._client!.session as InstanceType<typeof StringSession>).save();
    useTelegramStore.getState().setSession(sessionStr);

    return user;
  },

  /**
   * Get the raw TelegramClient for direct API calls.
   */
  getClient(): TelegramClient | null {
    return this._client;
  },

  /**
   * Disconnect and clean up.
   */
  async disconnect() {
    if (this._client) {
      try {
        await this._client.disconnect();
      } catch {}
      this._client = null;
    }
  },

  /**
   * Download and cache a user/chat photo, returning a blob URL.
   * 1. Check in-memory cache (instant)
   * 2. Check IndexedDB persistent cache (fast, no network)
   * 3. Download from Telegram API and save to both caches
   */
  async getPhotoUrl(entity: Api.User | Api.Chat | Api.Channel | undefined | null, cacheKey?: string): Promise<string | null> {
    if (!entity || !this._client) return null;

    const key = cacheKey || `photo_${String(entity.id)}`;

    // 1. In-memory
    const memoryCached = TelegramPhotoCacheService.getMemoryCached(key);
    if (memoryCached) return memoryCached;

    // 2. Persistent disk cache (IndexedDB)
    const diskCached = await TelegramPhotoCacheService.loadFromDisk(key);
    if (diskCached) return diskCached;

    // 3. Download from Telegram
    try {
      const result = await this._client.downloadProfilePhoto(entity);
      if (!result) return null;

      const data = result instanceof Uint8Array ? result : new Uint8Array(result as any);
      if (data.length === 0) return null;

      // Save to persistent cache + in-memory
      const url = await TelegramPhotoCacheService.saveToDisk(key, data);
      return url;
    } catch {
      return null;
    }
  },

  /**
   * Get cached photo URL (memory or disk) without downloading.
   */
  async getCachedPhotoUrl(cacheKey: string): Promise<string | null> {
    const mem = TelegramPhotoCacheService.getMemoryCached(cacheKey);
    if (mem) return mem;
    return TelegramPhotoCacheService.loadFromDisk(cacheKey);
  },
};
