// Discord Remote Authentication (Desktop) - QR Code Flow
// Protocol: https://docs.discord.food/remote-authentication/desktop

const REMOTE_AUTH_GATEWAY = 'wss://remote-auth-gateway.discord.gg/?v=2';

// --- Crypto helpers ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  return arrayBufferToBase64(buffer)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// --- Types ---

export type ScannedUser = {
  userId: string;
  discriminator: string;
  avatarHash: string;
  username: string;
};

export type RemoteAuthState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'qr_ready'; qrUrl: string; fingerprint: string }
  | { status: 'scanned'; user: ScannedUser }
  | { status: 'authenticated'; token: string }
  | { status: 'cancelled' }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

// --- Service ---

export const DiscordRemoteAuthService = {
  ws: null as WebSocket | null,
  heartbeatInterval: null as ReturnType<typeof setInterval> | null,
  timeoutTimer: null as ReturnType<typeof setTimeout> | null,
  keyPair: null as CryptoKeyPair | null,
  publicKeySpkiBytes: null as ArrayBuffer | null,
  publicKeyBase64: null as string | null,
  computedFingerprint: null as string | null,

  onStateChange: null as ((state: RemoteAuthState) => void) | null,

  _emit(state: RemoteAuthState) {
    this.onStateChange?.(state);
  },

  async start() {
    this._cleanup();
    this._emit({ status: 'connecting' });

    try {
      // Generate RSA-OAEP 2048-bit keypair
      this.keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt'],
      );

      // Export public key as SPKI
      this.publicKeySpkiBytes = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
      this.publicKeyBase64 = arrayBufferToBase64(this.publicKeySpkiBytes);

      // Compute expected fingerprint: SHA-256 of SPKI bytes, base64url-encoded
      const digest = await crypto.subtle.digest('SHA-256', this.publicKeySpkiBytes);
      this.computedFingerprint = arrayBufferToBase64url(digest);
    } catch {
      this._emit({ status: 'error', message: 'Failed to generate cryptographic keys' });
      return;
    }

    // Open WebSocket
    try {
      this.ws = new WebSocket(REMOTE_AUTH_GATEWAY);
    } catch {
      this._emit({ status: 'error', message: 'Failed to connect to authentication server' });
      return;
    }

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this._handleMessage(payload);
      } catch {
        console.error('[Remote Auth] Failed to parse message');
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[Remote Auth] WebSocket closed: ${event.code}`);
      this._stopHeartbeat();
      this._clearTimeout();

      switch (event.code) {
        case 1000:
          // Normal closure (we initiated, or cancel/login already emitted state)
          break;
        case 4003:
          this._emit({ status: 'timeout' });
          break;
        case 4000:
          this._emit({ status: 'error', message: 'Invalid gateway version' });
          break;
        case 4001:
          this._emit({ status: 'error', message: 'Protocol error' });
          break;
        case 4002:
          this._emit({ status: 'error', message: 'Handshake failed' });
          break;
        default:
          // Abnormal close (1006) or rejected connection — likely Origin header issue
          this._emit({
            status: 'error',
            message: 'Connection rejected. QR login requires the desktop app.',
          });
      }
    };

    this.ws.onerror = () => {
      // onerror always fires before onclose; let onclose handle the state emission
    };
  },

  stop() {
    this._cleanup();
  },

  _cleanup() {
    this._stopHeartbeat();
    this._clearTimeout();
    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000);
      }
      this.ws = null;
    }
    this.keyPair = null;
    this.publicKeySpkiBytes = null;
    this.publicKeyBase64 = null;
    this.computedFingerprint = null;
  },

  _send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  _handleMessage(payload: any) {
    switch (payload.op) {
      case 'hello':
        this._handleHello(payload);
        break;
      case 'nonce_proof':
        this._handleNonceProof(payload);
        break;
      case 'pending_remote_init':
        this._handlePendingRemoteInit(payload);
        break;
      case 'pending_ticket':
        this._handlePendingTicket(payload);
        break;
      case 'pending_login':
        this._handlePendingLogin(payload);
        break;
      case 'cancel':
        this._handleCancel();
        break;
      case 'heartbeat_ack':
        break;
      default:
        console.log(`[Remote Auth] Unhandled op: ${payload.op}`);
    }
  },

  _handleHello(data: { heartbeat_interval: number; timeout_ms: number }) {
    this._startHeartbeat(data.heartbeat_interval);

    // Set session timeout
    this.timeoutTimer = setTimeout(() => {
      this._emit({ status: 'timeout' });
      this.ws?.close(1000);
    }, data.timeout_ms);

    // Send init with our public key
    this._send({
      op: 'init',
      encoded_public_key: this.publicKeyBase64,
    });
  },

  async _handleNonceProof(data: { encrypted_nonce: string }) {
    try {
      const encryptedBytes = base64ToUint8Array(data.encrypted_nonce);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        this.keyPair!.privateKey,
        encryptedBytes.buffer as ArrayBuffer,
      );

      // SHA-256 hash the decrypted nonce, then base64url-encode
      const hash = await crypto.subtle.digest('SHA-256', decrypted);
      const proof = arrayBufferToBase64url(hash);

      this._send({ op: 'nonce_proof', proof });
    } catch (err) {
      console.error('[Remote Auth] Nonce proof failed:', err);
      this._emit({ status: 'error', message: 'Cryptographic handshake failed' });
      this.ws?.close(1000);
    }
  },

  _handlePendingRemoteInit(data: { fingerprint: string }) {
    // Verify fingerprint matches our public key
    if (data.fingerprint !== this.computedFingerprint) {
      console.error('[Remote Auth] Fingerprint mismatch');
      this._emit({ status: 'error', message: 'Security verification failed' });
      this.ws?.close(1000);
      return;
    }

    this._emit({
      status: 'qr_ready',
      qrUrl: `https://discord.com/ra/${data.fingerprint}`,
      fingerprint: data.fingerprint,
    });
  },

  async _handlePendingTicket(data: { encrypted_user_payload: string }) {
    try {
      const encryptedBytes = base64ToUint8Array(data.encrypted_user_payload);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        this.keyPair!.privateKey,
        encryptedBytes.buffer as ArrayBuffer,
      );

      const payload = new TextDecoder().decode(decrypted);
      const [userId, discriminator, avatarHash, username] = payload.split(':');

      this._emit({
        status: 'scanned',
        user: { userId, discriminator, avatarHash, username },
      });
    } catch (err) {
      console.error('[Remote Auth] Failed to decrypt user payload:', err);
      this._emit({ status: 'error', message: 'Failed to decrypt user data' });
    }
  },

  async _handlePendingLogin(data: { ticket: string }) {
    try {
      // Exchange ticket for encrypted token
      const response = await fetch('https://discord.com/api/v9/users/@me/remote-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: data.ticket }),
      });

      if (!response.ok) {
        throw new Error(`Ticket exchange failed: ${response.status}`);
      }

      const { encrypted_token } = await response.json();

      // Decrypt the token
      const encryptedBytes = base64ToUint8Array(encrypted_token);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        this.keyPair!.privateKey,
        encryptedBytes.buffer as ArrayBuffer,
      );

      const token = new TextDecoder().decode(decrypted);
      this._emit({ status: 'authenticated', token });
      this._cleanup();
    } catch (err) {
      console.error('[Remote Auth] Login failed:', err);
      this._emit({ status: 'error', message: 'Failed to complete authentication' });
    }
  },

  _handleCancel() {
    this._emit({ status: 'cancelled' });
    this._cleanup();
  },

  // --- Heartbeat ---

  _startHeartbeat(intervalMs: number) {
    this._stopHeartbeat();

    // First heartbeat after random jitter
    const jitter = Math.random();
    setTimeout(() => {
      this._send({ op: 'heartbeat' });
      this.heartbeatInterval = setInterval(() => {
        this._send({ op: 'heartbeat' });
      }, intervalMs);
    }, intervalMs * jitter);
  },

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },

  _clearTimeout() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  },
};
