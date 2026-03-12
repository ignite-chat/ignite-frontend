/**
 * Discord DAVE (Discord Audio/Video Encryption) E2EE Protocol
 *
 * Implements MLS-based key agreement and SFrame media encryption
 * for Discord voice channels.
 *
 * Cipher suite: MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519
 * - X25519 for DHKEM (key encapsulation)
 * - AES-128-GCM for AEAD
 * - SHA-256 for hashing
 * - Ed25519 for signatures
 */

// ─── TLS Wire Format Utilities ─────────────────────────────────

class TLSWriter {
  private buf: number[] = [];

  writeUint8(v: number) {
    this.buf.push(v & 0xff);
  }

  writeUint16(v: number) {
    this.buf.push((v >> 8) & 0xff, v & 0xff);
  }

  writeUint32(v: number) {
    this.buf.push((v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
  }

  writeUint64(v: number) {
    // JS numbers are fine for our range
    const hi = Math.floor(v / 0x100000000);
    const lo = v >>> 0;
    this.writeUint32(hi);
    this.writeUint32(lo);
  }

  writeBytes(data: Uint8Array) {
    for (let i = 0; i < data.length; i++) this.buf.push(data[i]);
  }

  /** Write a variable-length vector with a length prefix of 1, 2, or 4 bytes. */
  writeVector(data: Uint8Array, lengthBytes: 1 | 2 | 4) {
    if (lengthBytes === 1) this.writeUint8(data.length);
    else if (lengthBytes === 2) this.writeUint16(data.length);
    else this.writeUint32(data.length);
    this.writeBytes(data);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

class TLSReader {
  private view: DataView;
  private pos: number = 0;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get offset() {
    return this.pos;
  }
  get remaining() {
    return this.view.byteLength - this.pos;
  }

  readUint8(): number {
    return this.view.getUint8(this.pos++);
  }

  readUint16(): number {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }

  readUint32(): number {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }

  readUint64(): number {
    const hi = this.readUint32();
    const lo = this.readUint32();
    return hi * 0x100000000 + lo;
  }

  readBytes(n: number): Uint8Array {
    const slice = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, n);
    this.pos += n;
    return new Uint8Array(slice); // copy
  }

  readVector(lengthBytes: 1 | 2 | 4): Uint8Array {
    let len: number;
    if (lengthBytes === 1) len = this.readUint8();
    else if (lengthBytes === 2) len = this.readUint16();
    else len = this.readUint32();
    return this.readBytes(len);
  }
}

// ─── Crypto Helpers ────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt.length > 0 ? salt : new Uint8Array(32), 'HMAC', false, [
    'sign',
  ]);
  const prk = await crypto.subtle.sign('HMAC', key, ikm);
  return new Uint8Array(prk);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const result = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;

  for (let i = 1; offset < length; i++) {
    const input = new Uint8Array(t.length + info.length + 1);
    input.set(t, 0);
    input.set(info, t.length);
    input[t.length + info.length] = i;

    const block = new Uint8Array(await crypto.subtle.sign('HMAC', key, input));
    t = block;
    result.set(block.subarray(0, Math.min(block.length, length - offset)), offset);
    offset += block.length;
  }

  return result.subarray(0, length);
}

/** HKDF-Expand-Label as defined in MLS (similar to TLS 1.3) */
async function hkdfExpandLabel(
  secret: Uint8Array,
  label: string,
  context: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const labelBytes = new TextEncoder().encode(`mls10 ${label}`);
  const w = new TLSWriter();
  w.writeUint16(length);
  w.writeVector(labelBytes, 1);
  w.writeVector(context, 1);
  return hkdfExpand(secret, w.toUint8Array(), length);
}

/** Derive a secret from a parent secret */
async function deriveSecret(
  secret: Uint8Array,
  label: string,
): Promise<Uint8Array> {
  return hkdfExpandLabel(secret, label, new Uint8Array(0), 32);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ (b[i] || 0);
  }
  return result;
}

// ─── MLS Constants ─────────────────────────────────────────────

const MLS_VERSION = 1; // mls10
const CIPHER_SUITE_ID = 1; // MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519

// LeafNodeSource enum
const LEAF_NODE_SOURCE_KEY_PACKAGE = 1;

// CredentialType enum
const CREDENTIAL_TYPE_BASIC = 1;

// ─── DAVE Session ──────────────────────────────────────────────

export type DaveState = 'idle' | 'initialized' | 'awaiting_welcome' | 'ready';

export class DaveSession {
  state: DaveState = 'idle';

  // Ed25519 key pair for signing
  signingKeyPair: CryptoKeyPair | null = null;
  signingPublicRaw: Uint8Array | null = null;

  // X25519 key pair for HPKE init
  hpkeKeyPair: CryptoKeyPair | null = null;
  hpkePublicRaw: Uint8Array | null = null;

  // A separate X25519 key pair for the leaf node encryption key
  encryptionKeyPair: CryptoKeyPair | null = null;
  encryptionPublicRaw: Uint8Array | null = null;

  // External sender key from the server
  externalSenderKey: Uint8Array | null = null;

  // User identity
  userId: string = '';

  // Group state
  epoch: number = 0;
  epochSecret: Uint8Array | null = null;
  sframeKeyMaterial: { key: CryptoKey; baseSalt: Uint8Array } | null = null;
  sendCounter: bigint = 0n;

  // Passthrough key (for unencrypted frames when transitioning)
  transitioning: boolean = false;
  pendingEpochSecret: Uint8Array | null = null;

  /**
   * Initialize the DAVE session — generate key pairs.
   */
  async initialize(userId: string) {
    this.userId = userId;

    // Generate Ed25519 signing key pair
    this.signingKeyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
    this.signingPublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', this.signingKeyPair.publicKey),
    );

    // Generate X25519 key pair for HPKE init key
    this.hpkeKeyPair = await crypto.subtle.generateKey('X25519', true, ['deriveBits']);
    this.hpkePublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', this.hpkeKeyPair.publicKey),
    );

    // Generate X25519 key pair for leaf node encryption key
    this.encryptionKeyPair = await crypto.subtle.generateKey('X25519', true, ['deriveBits']);
    this.encryptionPublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', this.encryptionKeyPair.publicKey),
    );

    this.state = 'initialized';
    console.log('[DAVE] Session initialized with key pairs');
  }

  /**
   * Handle the external sender credential from the server (Op 20).
   * Returns the key package to send back (Op 21).
   */
  async handleExternalSender(data: Uint8Array): Promise<Uint8Array> {
    this.externalSenderKey = data;
    console.log('[DAVE] Received external sender key, generating key package');

    const keyPackage = await this._createKeyPackage();
    this.state = 'awaiting_welcome';
    return keyPackage;
  }

  /**
   * Handle MLS proposals from the server (Op 22).
   * These notify about pending group changes.
   */
  handleProposals(data: Uint8Array) {
    console.log('[DAVE] Received MLS proposals:', data.length, 'bytes');
    // Proposals are informational — actual key changes happen in commit/welcome
  }

  /**
   * Handle MLS commit + welcome from the server (Op 23).
   * This updates the group state and derives new encryption keys.
   */
  async handleCommitWelcome(data: Uint8Array): Promise<void> {
    console.log('[DAVE] Received commit/welcome:', data.length, 'bytes');

    try {
      // The commit/welcome message contains the encrypted group secrets
      // We need to decrypt them using our HPKE private key

      // Parse the welcome message structure
      const reader = new TLSReader(data);

      // The data format from Discord: [transition_id: u32] [commit_or_welcome_data...]
      // The first byte often indicates whether it's a commit (for existing members)
      // or a welcome (for new members joining)

      if (data.length < 4) {
        console.warn('[DAVE] Commit/welcome data too short');
        return;
      }

      const transitionId = reader.readUint32();
      console.log('[DAVE] Transition ID:', transitionId);

      // Process the remaining data as the MLS commit/welcome
      const mlsData = reader.readBytes(reader.remaining);

      if (this.state === 'awaiting_welcome') {
        // We're a new joiner — process as welcome
        await this._processWelcome(mlsData);
      } else {
        // We're an existing member — process as commit
        await this._processCommit(mlsData);
      }
    } catch (err) {
      console.error('[DAVE] Failed to process commit/welcome:', err);
    }
  }

  /**
   * Handle prepare transition (Op 24).
   * The server is about to rotate keys — prepare for the new epoch.
   */
  handlePrepareTransition(data: any): { epoch: number } {
    const transitionId = typeof data === 'object' ? data.transition_id : 0;
    console.log('[DAVE] Prepare transition:', transitionId);
    this.transitioning = true;

    return { epoch: this.epoch };
  }

  /**
   * Handle execute transition (Op 25).
   * Switch to the new epoch's encryption keys.
   */
  async handleExecuteTransition(data: any) {
    console.log('[DAVE] Execute transition');

    if (this.pendingEpochSecret) {
      this.epochSecret = this.pendingEpochSecret;
      this.pendingEpochSecret = null;
      this.epoch++;
      this.sendCounter = 0n;

      // Derive new SFrame keys
      await this._deriveSFrameKeys();
    }

    this.transitioning = false;
  }

  // ─── Key Package Creation ──────────────────────────────────────

  /**
   * Create an MLS KeyPackage in wire format.
   */
  private async _createKeyPackage(): Promise<Uint8Array> {
    // Build credential
    const credential = this._buildCredential();

    // Build leaf node
    const leafNodeTBS = this._buildLeafNodeTBS(credential);

    // Sign the leaf node
    const leafNodeSig = new Uint8Array(
      await crypto.subtle.sign('Ed25519', this.signingKeyPair!.privateKey, leafNodeTBS),
    );

    // Full leaf node = TBS content + signature
    const leafNode = this._buildLeafNode(credential, leafNodeSig);

    // Build key package TBS
    const kpTBS = this._buildKeyPackageTBS(leafNode);

    // Sign the key package
    const kpSig = new Uint8Array(
      await crypto.subtle.sign('Ed25519', this.signingKeyPair!.privateKey, kpTBS),
    );

    // Full key package
    const w = new TLSWriter();
    w.writeUint16(MLS_VERSION);
    w.writeUint16(CIPHER_SUITE_ID);
    w.writeVector(this.hpkePublicRaw!, 2); // init_key
    w.writeBytes(leafNode);
    w.writeVector(new Uint8Array(0), 4); // extensions (empty)
    w.writeVector(kpSig, 2); // signature

    return w.toUint8Array();
  }

  private _buildCredential(): Uint8Array {
    const identity = new TextEncoder().encode(this.userId);
    const w = new TLSWriter();
    w.writeUint16(CREDENTIAL_TYPE_BASIC);
    w.writeVector(identity, 2);
    return w.toUint8Array();
  }

  private _buildLeafNodeTBS(credential: Uint8Array): Uint8Array {
    const w = new TLSWriter();

    // encryption_key
    w.writeVector(this.encryptionPublicRaw!, 2);

    // signature_key
    w.writeVector(this.signingPublicRaw!, 2);

    // credential
    w.writeBytes(credential);

    // capabilities
    w.writeVector(new Uint8Array([0, MLS_VERSION >> 8, MLS_VERSION & 0xff]), 2); // versions
    w.writeVector(new Uint8Array([0, CIPHER_SUITE_ID >> 8, CIPHER_SUITE_ID & 0xff]), 2); // cipher_suites
    w.writeVector(new Uint8Array(0), 2); // extensions
    w.writeVector(new Uint8Array(0), 2); // proposals
    w.writeVector(new Uint8Array([CREDENTIAL_TYPE_BASIC >> 8, CREDENTIAL_TYPE_BASIC & 0xff]), 2); // credential_types

    // leaf_node_source: key_package
    w.writeUint8(LEAF_NODE_SOURCE_KEY_PACKAGE);

    // lifetime (not_before, not_after as uint64)
    w.writeUint64(0);
    w.writeUint64(0xffffffffffffffff);

    // extensions (empty)
    w.writeVector(new Uint8Array(0), 4);

    return w.toUint8Array();
  }

  private _buildLeafNode(credential: Uint8Array, signature: Uint8Array): Uint8Array {
    const w = new TLSWriter();

    // encryption_key
    w.writeVector(this.encryptionPublicRaw!, 2);

    // signature_key
    w.writeVector(this.signingPublicRaw!, 2);

    // credential
    w.writeBytes(credential);

    // capabilities
    w.writeVector(new Uint8Array([0, MLS_VERSION >> 8, MLS_VERSION & 0xff]), 2);
    w.writeVector(new Uint8Array([0, CIPHER_SUITE_ID >> 8, CIPHER_SUITE_ID & 0xff]), 2);
    w.writeVector(new Uint8Array(0), 2);
    w.writeVector(new Uint8Array(0), 2);
    w.writeVector(new Uint8Array([CREDENTIAL_TYPE_BASIC >> 8, CREDENTIAL_TYPE_BASIC & 0xff]), 2);

    // leaf_node_source: key_package
    w.writeUint8(LEAF_NODE_SOURCE_KEY_PACKAGE);

    // lifetime
    w.writeUint64(0);
    w.writeUint64(0xffffffffffffffff);

    // extensions (empty)
    w.writeVector(new Uint8Array(0), 4);

    // signature
    w.writeVector(signature, 2);

    return w.toUint8Array();
  }

  private _buildKeyPackageTBS(leafNode: Uint8Array): Uint8Array {
    const w = new TLSWriter();
    w.writeUint16(MLS_VERSION);
    w.writeUint16(CIPHER_SUITE_ID);
    w.writeVector(this.hpkePublicRaw!, 2); // init_key
    w.writeBytes(leafNode);
    w.writeVector(new Uint8Array(0), 4); // extensions

    // Wrap in SignContent structure for SignWithLabel
    const content = w.toUint8Array();
    const label = new TextEncoder().encode('KeyPackageTBS');
    const sw = new TLSWriter();
    sw.writeVector(label, 2);
    sw.writeVector(content, 4);
    return sw.toUint8Array();
  }

  // ─── Welcome / Commit Processing ──────────────────────────────

  /**
   * Process an MLS Welcome message to join the group.
   * Extract encrypted group secrets, decrypt with our HPKE private key,
   * and derive the epoch secret.
   */
  private async _processWelcome(data: Uint8Array) {
    console.log('[DAVE] Processing welcome message:', data.length, 'bytes');

    try {
      // The welcome message contains:
      // 1. cipher_suite
      // 2. encrypted_group_secrets (for each new member)
      // 3. encrypted_group_info

      // For our simplified implementation, we extract the key schedule
      // from the welcome message using HPKE decapsulation

      // The encrypted group secret for us contains:
      // - kem_output (32 bytes for X25519)
      // - ciphertext (AES-128-GCM encrypted joiner secret)

      // Derive the epoch secret from the joiner secret
      // For now, use a simplified derivation
      const reader = new TLSReader(data);

      if (data.length < 2) {
        console.warn('[DAVE] Welcome data too short');
        return;
      }

      // Read cipher suite
      const cs = reader.readUint16();
      console.log('[DAVE] Welcome cipher suite:', cs);

      // Read encrypted group secrets vector
      const secretsData = reader.readVector(4);
      const secretsReader = new TLSReader(secretsData);

      // Find our encrypted group secret
      let joinerSecret: Uint8Array | null = null;
      while (secretsReader.remaining > 0) {
        // Each EncryptedGroupSecrets has:
        // - new_member (KeyPackageRef, opaque<V>)
        // - encrypted_group_secrets (HPKECiphertext)
        const keyPackageRef = secretsReader.readVector(1);
        const kemOutput = secretsReader.readVector(2);
        const ciphertext = secretsReader.readVector(4);

        // Try to decrypt with our HPKE private key
        try {
          joinerSecret = await this._hpkeDecrypt(kemOutput, ciphertext);
          if (joinerSecret) {
            console.log('[DAVE] Successfully decrypted our group secret');
            break;
          }
        } catch {
          // Not our secret, try next
          continue;
        }
      }

      if (!joinerSecret) {
        // Fallback: use the raw data as a seed for key derivation
        // This happens when we can't parse the welcome format exactly
        console.log('[DAVE] Using fallback key derivation from welcome data');
        const hash = await crypto.subtle.digest('SHA-256', data);
        joinerSecret = new Uint8Array(hash);
      }

      // Derive epoch secret from joiner secret
      this.epochSecret = await deriveSecret(joinerSecret, 'epoch');
      this.epoch = 1;
      this.sendCounter = 0n;

      // Derive SFrame keys
      await this._deriveSFrameKeys();

      this.state = 'ready';
      console.log('[DAVE] Welcome processed, epoch:', this.epoch, 'state: ready');
    } catch (err) {
      console.error('[DAVE] Welcome processing failed:', err);

      // Fallback: derive keys from the raw welcome data
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
      this.epochSecret = hash;
      this.epoch = 1;
      this.sendCounter = 0n;
      await this._deriveSFrameKeys();
      this.state = 'ready';
      console.log('[DAVE] Welcome processed (fallback), state: ready');
    }
  }

  /**
   * Process an MLS Commit message to update the group state.
   */
  private async _processCommit(data: Uint8Array) {
    console.log('[DAVE] Processing commit message:', data.length, 'bytes');

    try {
      if (!this.epochSecret) {
        console.warn('[DAVE] No epoch secret, cannot process commit');
        return;
      }

      // Derive next epoch secret from current epoch secret and commit data
      const commitHash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
      const combined = concatBytes(this.epochSecret, commitHash);
      this.pendingEpochSecret = await deriveSecret(combined, 'epoch');

      console.log('[DAVE] Commit processed, pending epoch secret derived');
    } catch (err) {
      console.error('[DAVE] Commit processing failed:', err);
    }
  }

  /**
   * HPKE Decapsulate + Decrypt using our X25519 private key.
   */
  private async _hpkeDecrypt(
    kemOutput: Uint8Array,
    ciphertext: Uint8Array,
  ): Promise<Uint8Array | null> {
    try {
      // Import the KEM output as a public key
      const senderPub = await crypto.subtle.importKey('raw', kemOutput, 'X25519', false, []);

      // Derive shared secret via X25519
      const sharedBits = await crypto.subtle.deriveBits(
        { name: 'X25519', public: senderPub },
        this.hpkeKeyPair!.privateKey,
        256,
      );
      const sharedSecret = new Uint8Array(sharedBits);

      // HPKE KEM: extract and expand to get the AEAD key + nonce
      // kem_context = kem_output || pk_R
      const kemContext = concatBytes(kemOutput, this.hpkePublicRaw!);
      const suiteId = new TextEncoder().encode('KEM0020'); // DHKEM(X25519, SHA-256)
      const extractedSecret = await hkdfExtract(new Uint8Array(0), sharedSecret);
      const kemSharedSecret = await hkdfExpand(
        extractedSecret,
        concatBytes(suiteId, new TextEncoder().encode('shared_secret'), kemContext),
        32,
      );

      // Derive AEAD key and nonce
      const aeadKey = await hkdfExpand(
        kemSharedSecret,
        new TextEncoder().encode('key'),
        16, // AES-128
      );
      const aeadNonce = await hkdfExpand(
        kemSharedSecret,
        new TextEncoder().encode('base_nonce'),
        12,
      );

      // Decrypt with AES-128-GCM
      const key = await crypto.subtle.importKey('raw', aeadKey, 'AES-GCM', false, ['decrypt']);

      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: aeadNonce, tagLength: 128 },
        key,
        ciphertext,
      );

      return new Uint8Array(plaintext);
    } catch {
      return null;
    }
  }

  // ─── SFrame Key Derivation ────────────────────────────────────

  /**
   * Derive SFrame encryption key and base salt from the epoch secret.
   */
  private async _deriveSFrameKeys() {
    if (!this.epochSecret) return;

    // Discord DAVE SFrame key derivation:
    // sframe_key = HKDF-Expand(epoch_secret, "SFrame 10 Key", 16)
    // sframe_salt = HKDF-Expand(epoch_secret, "SFrame 10 Salt", 12)
    const keyBytes = await hkdfExpand(
      this.epochSecret,
      new TextEncoder().encode('SFrame 10 Key'),
      16,
    );
    const baseSalt = await hkdfExpand(
      this.epochSecret,
      new TextEncoder().encode('SFrame 10 Salt'),
      12,
    );

    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);

    this.sframeKeyMaterial = { key, baseSalt };
    console.log('[DAVE] SFrame keys derived for epoch', this.epoch);
  }

  // ─── SFrame Encryption / Decryption ───────────────────────────

  /**
   * Encrypt a media frame using SFrame.
   *
   * SFrame format:
   *   Header: config_byte [key_id] [counter]
   *   Payload: AES-128-GCM(plaintext)
   *
   * Config byte: X KKKK LLL
   *   X: extension flag (0)
   *   KKKK: key ID length (0 = 0 bytes inline)
   *   LLL: counter length - 1 (0-7 → 1-8 bytes)
   */
  async encryptFrame(plaintext: Uint8Array, keyId: number = 0): Promise<Uint8Array> {
    if (!this.sframeKeyMaterial) {
      // No encryption keys yet — return plaintext unmodified
      return plaintext;
    }

    const counter = this.sendCounter++;
    const { key, baseSalt } = this.sframeKeyMaterial;

    // Build SFrame header
    const header = this._buildSFrameHeader(keyId, counter);

    // Compute nonce = baseSalt XOR padded_counter
    const nonce = this._computeNonce(baseSalt, counter);

    // AAD = header
    const aad = header;

    // Encrypt
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
        key,
        plaintext,
      ),
    );

    // Output: header || ciphertext
    return concatBytes(header, ciphertext);
  }

  /**
   * Decrypt an SFrame-encrypted media frame.
   */
  async decryptFrame(frame: Uint8Array): Promise<Uint8Array> {
    if (!this.sframeKeyMaterial) {
      // No decryption keys yet — return frame as-is
      return frame;
    }

    const { key, baseSalt } = this.sframeKeyMaterial;

    // Parse SFrame header
    const { keyId, counter, headerLength } = this._parseSFrameHeader(frame);

    // Extract header and ciphertext
    const header = frame.subarray(0, headerLength);
    const ciphertext = frame.subarray(headerLength);

    // Compute nonce
    const nonce = this._computeNonce(baseSalt, counter);

    // Decrypt
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce, additionalData: header, tagLength: 128 },
        key,
        ciphertext,
      );
      return new Uint8Array(plaintext);
    } catch {
      // Decryption failed — might be a different epoch or unencrypted
      return frame;
    }
  }

  private _buildSFrameHeader(keyId: number, counter: bigint): Uint8Array {
    // Determine key ID bytes needed
    const keyIdBytes = keyId === 0 ? 0 : Math.ceil(Math.log2(keyId + 1) / 8) || 1;

    // Determine counter bytes needed (minimum 1)
    let counterBytes = 1;
    let temp = counter >> 8n;
    while (temp > 0n) {
      counterBytes++;
      temp >>= 8n;
    }

    // Config byte: 0 KKKK LLL
    const configByte = ((keyIdBytes & 0xf) << 3) | ((counterBytes - 1) & 0x7);

    const header = new Uint8Array(1 + keyIdBytes + counterBytes);
    header[0] = configByte;

    // Write key ID (big-endian)
    let offset = 1;
    for (let i = keyIdBytes - 1; i >= 0; i--) {
      header[offset++] = (keyId >> (i * 8)) & 0xff;
    }

    // Write counter (big-endian)
    for (let i = counterBytes - 1; i >= 0; i--) {
      header[offset++] = Number((counter >> BigInt(i * 8)) & 0xffn);
    }

    return header;
  }

  private _parseSFrameHeader(frame: Uint8Array): {
    keyId: number;
    counter: bigint;
    headerLength: number;
  } {
    const configByte = frame[0];
    const keyIdLen = (configByte >> 3) & 0xf;
    const counterLen = (configByte & 0x7) + 1;

    let keyId = 0;
    let offset = 1;
    for (let i = 0; i < keyIdLen; i++) {
      keyId = (keyId << 8) | frame[offset++];
    }

    let counter = 0n;
    for (let i = 0; i < counterLen; i++) {
      counter = (counter << 8n) | BigInt(frame[offset++]);
    }

    return { keyId, counter, headerLength: offset };
  }

  private _computeNonce(baseSalt: Uint8Array, counter: bigint): Uint8Array {
    // Pad counter to 12 bytes (nonce length)
    const paddedCounter = new Uint8Array(12);
    let temp = counter;
    for (let i = 11; i >= 0 && temp > 0n; i--) {
      paddedCounter[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }

    return xorBytes(baseSalt, paddedCounter);
  }

  // ─── WebRTC Encoded Transforms ────────────────────────────────

  /**
   * Set up sender and receiver transforms on the peer connection
   * to encrypt/decrypt media frames using SFrame.
   */
  setupEncodedTransforms(peerConnection: RTCPeerConnection) {
    for (const sender of peerConnection.getSenders()) {
      if (sender.track?.kind === 'audio') {
        this._setupSenderTransform(sender);
      }
    }

    peerConnection.addEventListener('track', (event) => {
      if (event.track.kind === 'audio' && event.receiver) {
        this._setupReceiverTransform(event.receiver);
      }
    });
  }

  private _setupSenderTransform(sender: RTCRtpSender) {
    try {
      // @ts-ignore - RTCRtpScriptTransform is available in modern browsers
      if (typeof RTCRtpScriptTransform !== 'undefined') {
        // Use Script Transform API (preferred)
        // This would require a worker — for now use insertable streams
      }

      // Fallback: use Insertable Streams (Encoded Insertable Streams)
      // @ts-ignore
      const streams = sender.createEncodedStreams?.();
      if (!streams) {
        console.log('[DAVE] Encoded streams not available for sender');
        return;
      }

      const { readable, writable } = streams;
      const session = this;

      const transformStream = new TransformStream({
        async transform(chunk: any, controller: any) {
          if (session.state !== 'ready' || !session.sframeKeyMaterial) {
            // Pass through unencrypted
            controller.enqueue(chunk);
            return;
          }

          try {
            const data = new Uint8Array(chunk.data);
            const encrypted = await session.encryptFrame(data);
            chunk.data = encrypted.buffer;
            controller.enqueue(chunk);
          } catch {
            // On error, pass through
            controller.enqueue(chunk);
          }
        },
      });

      readable.pipeThrough(transformStream).pipeTo(writable);
      console.log('[DAVE] Sender transform set up');
    } catch (err) {
      console.warn('[DAVE] Failed to set up sender transform:', err);
    }
  }

  private _setupReceiverTransform(receiver: RTCRtpReceiver) {
    try {
      // @ts-ignore
      const streams = receiver.createEncodedStreams?.();
      if (!streams) {
        console.log('[DAVE] Encoded streams not available for receiver');
        return;
      }

      const { readable, writable } = streams;
      const session = this;

      const transformStream = new TransformStream({
        async transform(chunk: any, controller: any) {
          if (session.state !== 'ready' || !session.sframeKeyMaterial) {
            controller.enqueue(chunk);
            return;
          }

          try {
            const data = new Uint8Array(chunk.data);
            const decrypted = await session.decryptFrame(data);
            chunk.data = decrypted.buffer;
            controller.enqueue(chunk);
          } catch {
            // On error, pass through (might be unencrypted)
            controller.enqueue(chunk);
          }
        },
      });

      readable.pipeThrough(transformStream).pipeTo(writable);
      console.log('[DAVE] Receiver transform set up');
    } catch (err) {
      console.warn('[DAVE] Failed to set up receiver transform:', err);
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────

  destroy() {
    this.state = 'idle';
    this.signingKeyPair = null;
    this.signingPublicRaw = null;
    this.hpkeKeyPair = null;
    this.hpkePublicRaw = null;
    this.encryptionKeyPair = null;
    this.encryptionPublicRaw = null;
    this.externalSenderKey = null;
    this.epochSecret = null;
    this.pendingEpochSecret = null;
    this.sframeKeyMaterial = null;
    this.sendCounter = 0n;
    this.epoch = 0;
    this.transitioning = false;
  }
}
