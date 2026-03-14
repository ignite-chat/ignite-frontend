/**
 * Discord DAVE (Discord Audio/Video Encryption) E2EE Protocol v1.1
 *
 * Per protocol.md:
 * Cipher suite: MLS_128_DHKEMP256_AES128GCM_SHA256_P256 (MLS ciphersuite 2)
 * - P-256 (ECDH) for DHKEM key encapsulation
 * - AES-128-GCM for AEAD
 * - SHA-256 for hashing
 * - ECDSA P-256 for signatures
 *
 * Vector length headers use MLS variable-size format (RFC 9420 Section 2.1.2).
 */

// ─── MLS Variable-Size Wire Format Utilities ─────────────────

class MLSWriter {
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

  writeBytes(data: Uint8Array) {
    for (let i = 0; i < data.length; i++) this.buf.push(data[i]);
  }

  /**
   * Write a variable-length vector with MLS variable-size length header.
   * Per RFC 9420 Section 2.1.2:
   * - 1 byte for lengths 0-63       (top 2 bits: 00)
   * - 2 bytes for lengths 64-16383  (top 2 bits: 01)
   * - 4 bytes for lengths 16384+    (top 2 bits: 10)
   */
  writeVarVector(data: Uint8Array) {
    this._writeVarLen(data.length);
    this.writeBytes(data);
  }

  _writeVarLen(len: number) {
    if (len < 64) {
      this.writeUint8(len); // top 2 bits = 00
    } else if (len < 16384) {
      this.writeUint8(0x40 | ((len >> 8) & 0x3f));
      this.writeUint8(len & 0xff);
    } else {
      this.writeUint8(0x80 | ((len >> 24) & 0x3f));
      this.writeUint8((len >> 16) & 0xff);
      this.writeUint8((len >> 8) & 0xff);
      this.writeUint8(len & 0xff);
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

class MLSReader {
  private data: Uint8Array;
  private pos: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  get offset() {
    return this.pos;
  }
  get remaining() {
    return this.data.length - this.pos;
  }

  readUint8(): number {
    return this.data[this.pos++];
  }

  readUint16(): number {
    const v = (this.data[this.pos] << 8) | this.data[this.pos + 1];
    this.pos += 2;
    return v;
  }

  readUint32(): number {
    const v =
      (this.data[this.pos] << 24) |
      (this.data[this.pos + 1] << 16) |
      (this.data[this.pos + 2] << 8) |
      this.data[this.pos + 3];
    this.pos += 4;
    return v >>> 0;
  }

  readBytes(n: number): Uint8Array {
    const slice = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return new Uint8Array(slice);
  }

  /** Read MLS variable-size length header */
  readVarLen(): number {
    const first = this.data[this.pos++];
    const tag = first >> 6;
    if (tag === 0) {
      return first & 0x3f;
    } else if (tag === 1) {
      const second = this.data[this.pos++];
      return ((first & 0x3f) << 8) | second;
    } else {
      const b1 = this.data[this.pos++];
      const b2 = this.data[this.pos++];
      const b3 = this.data[this.pos++];
      return (((first & 0x3f) << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    }
  }

  /** Read a variable-length vector with MLS variable-size length header */
  readVarVector(): Uint8Array {
    const len = this.readVarLen();
    return this.readBytes(len);
  }
}

// ─── Crypto Helpers ────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    salt.length > 0 ? salt : new Uint8Array(32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const prk = await crypto.subtle.sign('HMAC', key, ikm);
  return new Uint8Array(prk);
}

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
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

function hex(d: Uint8Array): string {
  return Array.from(d)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

/**
 * Convert ECDSA P1363 signature (raw r||s, 64 bytes) to DER format.
 * MLS uses IEEE 1363 format (raw r||s), but some implementations use DER.
 * We produce P1363 from WebCrypto and keep it as-is for MLS.
 */
function ecdsaP1363ToDer(sig: Uint8Array): Uint8Array {
  let r = sig.slice(0, 32);
  let s = sig.slice(32, 64);

  // Strip leading zeros, keep at least 1 byte
  let rStart = 0;
  while (rStart < r.length - 1 && r[rStart] === 0) rStart++;
  r = r.slice(rStart);
  if (r[0] & 0x80) r = concatBytes(new Uint8Array([0]), r);

  let sStart = 0;
  while (sStart < s.length - 1 && s[sStart] === 0) sStart++;
  s = s.slice(sStart);
  if (s[0] & 0x80) s = concatBytes(new Uint8Array([0]), s);

  const totalLen = 2 + r.length + 2 + s.length;
  const der = new Uint8Array(2 + totalLen);
  let offset = 0;
  der[offset++] = 0x30; // SEQUENCE
  der[offset++] = totalLen;
  der[offset++] = 0x02; // INTEGER
  der[offset++] = r.length;
  der.set(r, offset);
  offset += r.length;
  der[offset++] = 0x02; // INTEGER
  der[offset++] = s.length;
  der.set(s, offset);

  return der;
}

// ─── HPKE (RFC 9180) Helpers for DHKEM(P-256, HKDF-SHA256) + AES-128-GCM ───

// KEM suite_id = "KEM" || I2OSP(0x0010, 2) — DHKEM(P-256, HKDF-SHA256)
const KEM_SUITE_ID = concatBytes(
  new TextEncoder().encode('KEM'),
  new Uint8Array([0x00, 0x10]),
);

// HPKE suite_id = "HPKE" || I2OSP(kem_id, 2) || I2OSP(kdf_id, 2) || I2OSP(aead_id, 2)
const HPKE_SUITE_ID = concatBytes(
  new TextEncoder().encode('HPKE'),
  new Uint8Array([0x00, 0x10]), // KEM: DHKEM(P-256)
  new Uint8Array([0x00, 0x01]), // KDF: HKDF-SHA256
  new Uint8Array([0x00, 0x01]), // AEAD: AES-128-GCM
);

async function hpkeLabeledExtract(
  salt: Uint8Array,
  label: string,
  ikm: Uint8Array,
  suiteId: Uint8Array,
): Promise<Uint8Array> {
  const labeledIkm = concatBytes(
    new TextEncoder().encode('HPKE-v1'),
    suiteId,
    new TextEncoder().encode(label),
    ikm,
  );
  return hkdfExtract(salt, labeledIkm);
}

async function hpkeLabeledExpand(
  prk: Uint8Array,
  label: string,
  info: Uint8Array,
  L: number,
  suiteId: Uint8Array,
): Promise<Uint8Array> {
  const labeledInfo = concatBytes(
    new Uint8Array([(L >> 8) & 0xff, L & 0xff]), // I2OSP(L, 2)
    new TextEncoder().encode('HPKE-v1'),
    suiteId,
    new TextEncoder().encode(label),
    info,
  );
  return hkdfExpand(prk, labeledInfo, L);
}

/** DHKEM(P-256) Decap: derive shared secret from kem_output + our private key */
async function dhkemDecap(
  kemOutput: Uint8Array,
  privateKey: CryptoKey,
  publicKeyRaw: Uint8Array,
): Promise<Uint8Array> {
  const senderPub = await crypto.subtle.importKey(
    'raw',
    kemOutput,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const dh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: senderPub }, privateKey, 256),
  );

  const kemContext = concatBytes(kemOutput, publicKeyRaw);

  // RFC 9180 Section 4.1: ExtractAndExpand(dh, kem_context)
  // prk = LabeledExtract("", "eae_prk", dh)
  // shared_secret = LabeledExpand(prk, "shared_secret", kem_context, Nsecret)
  const prk = await hpkeLabeledExtract(new Uint8Array(0), 'eae_prk', dh, KEM_SUITE_ID);
  return hpkeLabeledExpand(prk, 'shared_secret', kemContext, 32, KEM_SUITE_ID);
}

/** HPKE Base mode decrypt: SetupBaseR + Open */
async function hpkeBaseOpen(
  kemOutput: Uint8Array,
  privateKey: CryptoKey,
  publicKeyRaw: Uint8Array,
  info: Uint8Array,
  aad: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  // Decap → shared_secret
  const sharedSecret = await dhkemDecap(kemOutput, privateKey, publicKeyRaw);

  // Key Schedule (Base mode = 0)
  const pskIdHash = await hpkeLabeledExtract(
    new Uint8Array(0),
    'psk_id_hash',
    new Uint8Array(0),
    HPKE_SUITE_ID,
  );
  const infoHash = await hpkeLabeledExtract(new Uint8Array(0), 'info_hash', info, HPKE_SUITE_ID);
  const ksContext = concatBytes(new Uint8Array([0x00]), pskIdHash, infoHash); // mode=0

  const secret = await hpkeLabeledExtract(
    sharedSecret,
    'secret',
    new Uint8Array(0),
    HPKE_SUITE_ID,
  );
  const key = await hpkeLabeledExpand(secret, 'key', ksContext, 16, HPKE_SUITE_ID); // Nk=16
  const nonce = await hpkeLabeledExpand(secret, 'base_nonce', ksContext, 12, HPKE_SUITE_ID); // Nn=12

  // AEAD Open (AES-128-GCM)
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
    cryptoKey,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}

// ─── MLS Key Schedule Helpers ──────────────────────────────────

/**
 * MLS ExpandWithLabel (RFC 9420 Section 8):
 * HKDF-Expand(Secret, HkdfLabel, Length)
 * where HkdfLabel = { uint16 length, opaque label<V> = "MLS 1.0 " + Label, opaque context<V> }
 */
async function mlsExpandWithLabel(
  secret: Uint8Array,
  label: string,
  context: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const w = new MLSWriter();
  w.writeUint16(length);
  w.writeVarVector(new TextEncoder().encode(`MLS 1.0 ${label}`));
  w.writeVarVector(context);
  return hkdfExpand(secret, w.toUint8Array(), length);
}

// ─── MLS Constants ─────────────────────────────────────────────

const MLS_VERSION = 1; // mls10
// Per protocol.md: "MLS ciphersuite is DHKEMP256_AES128GCM_SHA256_P256 (MLS ciphersuite 2)"
const CIPHER_SUITE_ID = 2;

// LeafNodeSource enum
const LEAF_NODE_SOURCE_KEY_PACKAGE = 1;

// CredentialType enum
const CREDENTIAL_TYPE_BASIC = 1;

// ─── Key Ratchet (per RFC 9420 Section 9.1) ───────────────────

/**
 * Per-sender key ratchet derived from sender_base_secret.
 *
 * Discord's libdave wraps mlspp's HashRatchet which uses DeriveTreeSecret:
 *   DeriveTreeSecret(Secret, Label, Generation, Length) =
 *     ExpandWithLabel(Secret, Label, tls::marshal(Generation), Length)
 *
 * where tls::marshal(generation) is uint32 big-endian.
 *
 * ratchet_secret[0] = base_secret
 * ratchet_key[n] = ExpandWithLabel(ratchet_secret[n], "key", BE32(n), 16)
 * ratchet_nonce[n] = ExpandWithLabel(ratchet_secret[n], "nonce", BE32(n), 12)  [DISCARDED]
 * ratchet_secret[n+1] = ExpandWithLabel(ratchet_secret[n], "secret", BE32(n), 32)
 *
 * The generation is the MSB of the 32-bit truncated nonce.
 * AES-GCM key = ratchet_key[generation]
 * AES-GCM IV = expanded frame nonce (NO XOR — Discord discards ratchet nonce)
 *
 * Nonce expansion: memcpy from uint32 on x86/ARM-LE → little-endian byte order.
 */
class KeyRatchet {
  private baseSecret: Uint8Array;
  private cache: Map<number, CryptoKey> = new Map();
  private currentSecret: Uint8Array;
  private currentGeneration: number = 0;

  constructor(baseSecret: Uint8Array) {
    this.baseSecret = baseSecret;
    this.currentSecret = baseSecret;
  }

  async getKey(generation: number): Promise<CryptoKey> {
    const cached = this.cache.get(generation);
    if (cached) return cached;

    // Ratchet forward from current generation to requested generation
    // mlspp DeriveTreeSecret uses generation as uint32 big-endian context
    while (this.currentGeneration <= generation) {
      const secret =
        this.currentGeneration === 0
          ? this.baseSecret
          : this.currentSecret;

      // tls::marshal(generation) = uint32 big-endian
      const genCtx = new Uint8Array(4);
      genCtx[0] = (this.currentGeneration >>> 24) & 0xff;
      genCtx[1] = (this.currentGeneration >>> 16) & 0xff;
      genCtx[2] = (this.currentGeneration >>> 8) & 0xff;
      genCtx[3] = this.currentGeneration & 0xff;

      const keyBytes = await mlsExpandWithLabel(secret, 'key', genCtx, 16);
      // nonce is derived but discarded (Discord doesn't use ratchet nonce)
      // const nonce = await mlsExpandWithLabel(secret, 'nonce', genCtx, 12);
      const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
        'encrypt',
        'decrypt',
      ]);

      this.cache.set(this.currentGeneration, key);

      if (this.currentGeneration < generation) {
        this.currentSecret = await mlsExpandWithLabel(secret, 'secret', genCtx, 32);
      }
      this.currentGeneration++;
    }

    return this.cache.get(generation)!;
  }
}

// ─── DAVE Session ──────────────────────────────────────────────

export type DaveState = 'idle' | 'initialized' | 'awaiting_welcome' | 'ready';

export class DaveSession {
  state: DaveState = 'idle';

  // ECDSA P-256 key pair for signing
  signingKeyPair: CryptoKeyPair | null = null;
  signingPublicRaw: Uint8Array | null = null; // 65 bytes uncompressed

  // ECDH P-256 key pair for HPKE init key
  hpkeKeyPair: CryptoKeyPair | null = null;
  hpkePublicRaw: Uint8Array | null = null; // 65 bytes uncompressed

  // ECDH P-256 key pair for leaf node encryption key
  encryptionKeyPair: CryptoKeyPair | null = null;
  encryptionPublicRaw: Uint8Array | null = null; // 65 bytes uncompressed

  // External sender credential from the server (Op 25)
  externalSenderKey: Uint8Array | null = null;

  // User identity
  userId: string = '';

  // Group state
  epoch: number = 0;
  epochSecret: Uint8Array | null = null;
  exporterSecret: Uint8Array | null = null;
  sframeKeyMaterial: { key: CryptoKey; baseSalt: Uint8Array } | null = null;
  sendCounter: bigint = 0n;

  // Per-user receiver key ratchets: userId → KeyRatchet
  receiverRatchets: Map<string, KeyRatchet> = new Map();
  // Our own sender ratchet
  senderRatchet: KeyRatchet | null = null;
  // SSRC → userId mapping (from SPEAKING messages)
  ssrcToUserId: Map<number, string> = new Map();

  // Debug counter for decryptFrame logging
  _decryptLogCount: number = 0;

  // Transition state
  transitioning: boolean = false;
  pendingEpochSecret: Uint8Array | null = null;

  /**
   * Initialize the DAVE session — generate P-256 key pairs.
   */
  async initialize(userId: string) {
    this.userId = userId;

    // Generate ECDSA P-256 signing key pair
    this.signingKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    this.signingPublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', this.signingKeyPair.publicKey),
    );

    // Generate ECDH P-256 key pair for HPKE init key
    this.hpkeKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    this.hpkePublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', this.hpkeKeyPair.publicKey),
    );

    // Generate ECDH P-256 key pair for leaf node encryption key
    this.encryptionKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    this.encryptionPublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', this.encryptionKeyPair.publicKey),
    );

    this.state = 'initialized';
    console.log(
      '[DAVE] Session initialized with P-256 key pairs, sig:',
      this.signingPublicRaw.length,
      'hpke:',
      this.hpkePublicRaw.length,
      'enc:',
      this.encryptionPublicRaw.length,
    );
  }

  /**
   * Handle the external sender package from the server (Op 25).
   * Returns the MLSMessage-wrapped key package to send back (Op 26).
   */
  async handleExternalSender(data: Uint8Array): Promise<Uint8Array> {
    this.externalSenderKey = data;
    console.log(
      '[DAVE] Received external sender:',
      data.length,
      'bytes, first 16:',
      Array.from(data.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' '),
    );

    // Send raw KeyPackage directly (no MLSMessage wrapper — Discord sends raw KP on Op 26)
    const keyPackage = await this._createKeyPackage();

    console.log(
      '[DAVE] Key package:',
      keyPackage.length,
      'bytes, first 16:',
      Array.from(keyPackage.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' '),
    );

    this.state = 'awaiting_welcome';
    return keyPackage;
  }

  /**
   * Handle MLS proposals from the server (Op 27).
   */
  handleProposals(data: Uint8Array) {
    console.log('[DAVE] Received MLS proposals:', data.length, 'bytes');
    // Proposals are cached — actual processing happens when we commit or receive a commit
  }

  /**
   * Handle MLS commit from announce_commit_transition (Op 29).
   * For existing group members receiving a commit.
   */
  async handleCommit(data: Uint8Array): Promise<void> {
    console.log('[DAVE] Received commit:', data.length, 'bytes');

    try {
      if (!this.epochSecret) {
        console.warn('[DAVE] No epoch secret, cannot process commit');
        return;
      }

      // Derive next epoch secret from current epoch secret and commit data
      const commitHash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
      const combined = concatBytes(this.epochSecret, commitHash);
      const prk = await hkdfExtract(new Uint8Array(32), combined);
      this.pendingEpochSecret = prk;

      console.log('[DAVE] Commit processed, pending epoch secret derived');
    } catch (err) {
      console.error('[DAVE] Commit processing failed:', err);
    }
  }

  /**
   * Handle MLS Welcome from the server (Op 30).
   * For new joiners being welcomed to the group.
   */
  async handleWelcome(data: Uint8Array): Promise<void> {
    console.log('[DAVE] Received welcome:', data.length, 'bytes');

    try {
      await this._processWelcome(data);
    } catch (err) {
      console.error('[DAVE] Welcome processing failed:', err);
      // No fallback — wrong keys would only cause silent failures
    }
  }

  /**
   * Handle prepare transition (Op 21).
   */
  handlePrepareTransition(data: any): { epoch: number } {
    const transitionId = typeof data === 'object' ? data.transition_id : 0;
    console.log('[DAVE] Prepare transition:', transitionId);
    this.transitioning = true;
    return { epoch: this.epoch };
  }

  /**
   * Handle execute transition (Op 22).
   * Switch to the new epoch's encryption keys.
   */
  async handleExecuteTransition(data: any) {
    console.log('[DAVE] Execute transition');

    if (this.pendingEpochSecret) {
      this.epochSecret = this.pendingEpochSecret;
      this.pendingEpochSecret = null;
      this.epoch++;
      this.sendCounter = 0n;
      await this._deriveSenderKeys();
    }

    this.transitioning = false;
  }

  /** Reset group state (for epoch=1 re-creation) */
  resetGroupState() {
    this.epoch = 0;
    this.epochSecret = null;
    this.exporterSecret = null;
    this.pendingEpochSecret = null;
    this.sframeKeyMaterial = null;
    this.sendCounter = 0n;
    this.transitioning = false;
    this.state = 'initialized';
    console.log('[DAVE] Group state reset');
  }

  // ─── Key Package Creation ──────────────────────────────────────

  /**
   * Create an MLS KeyPackage in wire format.
   * Per protocol.md: "The KeyPackage and its associated members are
   * un-modified from the MLS Protocol definition (RFC 9420 Section 10)."
   */
  private async _createKeyPackage(): Promise<Uint8Array> {
    const credential = this._buildCredential();
    const leafNodeTBS = this._buildLeafNodeTBS(credential);

    // Sign leaf node with SignWithLabel("LeafNodeTBS", leafNodeTBS)
    const leafNodeSig = await this._signWithLabel('LeafNodeTBS', leafNodeTBS);
    const leafNode = this._buildLeafNode(credential, leafNodeSig);

    // Build KeyPackageTBS content
    const kpTBSContent = this._buildKeyPackageTBSContent(leafNode);

    // Sign key package with SignWithLabel("KeyPackageTBS", kpTBSContent)
    const kpSig = await this._signWithLabel('KeyPackageTBS', kpTBSContent);

    // Full KeyPackage
    const w = new MLSWriter();
    w.writeUint16(MLS_VERSION);
    w.writeUint16(CIPHER_SUITE_ID);
    w.writeVarVector(this.hpkePublicRaw!); // init_key: HPKEPublicKey<V>
    w.writeBytes(leafNode); // leaf_node (inline)
    w.writeVarVector(new Uint8Array(0)); // extensions<V> (empty)
    w.writeVarVector(kpSig); // signature<V>

    return w.toUint8Array();
  }

  /**
   * MLS SignWithLabel: sign content with the "MLS 1.0 " + label prefix.
   * Returns the raw P1363 signature (64 bytes for P-256).
   */
  private async _signWithLabel(label: string, content: Uint8Array): Promise<Uint8Array> {
    const labelBytes = new TextEncoder().encode(`MLS 1.0 ${label}`);
    const w = new MLSWriter();
    w.writeVarVector(labelBytes); // opaque label<V>
    w.writeVarVector(content); // opaque content<V>
    const signContent = w.toUint8Array();

    // ECDSA P-256 with SHA-256 — WebCrypto produces P1363 (raw r||s, 64 bytes)
    // MLS/TLS 1.3 requires DER-encoded ECDSA signatures, so convert.
    const p1363Sig = new Uint8Array(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        this.signingKeyPair!.privateKey,
        signContent,
      ),
    );
    const derSig = ecdsaP1363ToDer(p1363Sig);
    console.log(
      `[DAVE] SignWithLabel("${label}"): P1363=${p1363Sig.length}B → DER=${derSig.length}B`,
    );
    return derSig;
  }

  private _buildCredential(): Uint8Array {
    // Per protocol.md: "The basic credential identity for a given member is
    // the big-endian 64-bit unsigned integer representation of their snowflake Discord user ID."
    const userId = BigInt(this.userId);
    const identity = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      identity[7 - i] = Number((userId >> BigInt(i * 8)) & 0xffn);
    }
    const w = new MLSWriter();
    w.writeUint16(CREDENTIAL_TYPE_BASIC);
    w.writeVarVector(identity); // opaque identity<V>
    return w.toUint8Array();
  }

  private _buildLeafNodeTBS(credential: Uint8Array): Uint8Array {
    const w = new MLSWriter();

    // encryption_key: HPKEPublicKey<V> (65 bytes P-256 uncompressed)
    w.writeVarVector(this.encryptionPublicRaw!);

    // signature_key: SignaturePublicKey<V> (65 bytes P-256 uncompressed)
    w.writeVarVector(this.signingPublicRaw!);

    // credential (serialized inline)
    w.writeBytes(credential);

    // capabilities
    // versions<V>: [mls10 = 0x0001]
    w.writeVarVector(new Uint8Array([(MLS_VERSION >> 8) & 0xff, MLS_VERSION & 0xff]));
    // cipher_suites<V>: [0x0002]
    w.writeVarVector(new Uint8Array([(CIPHER_SUITE_ID >> 8) & 0xff, CIPHER_SUITE_ID & 0xff]));
    // extensions<V>: empty
    w.writeVarVector(new Uint8Array(0));
    // proposals<V>: empty
    w.writeVarVector(new Uint8Array(0));
    // credential_types<V>: [basic = 0x0001]
    w.writeVarVector(
      new Uint8Array([(CREDENTIAL_TYPE_BASIC >> 8) & 0xff, CREDENTIAL_TYPE_BASIC & 0xff]),
    );

    // leaf_node_source: key_package (uint8)
    w.writeUint8(LEAF_NODE_SOURCE_KEY_PACKAGE);

    // lifetime: not_before (uint64 = 0), not_after (uint64 = UINT64_MAX)
    // Per protocol.md: "not_before = 0, not_after = 2^64 - 1"
    w.writeUint32(0);
    w.writeUint32(0);
    w.writeUint32(0xffffffff);
    w.writeUint32(0xffffffff);

    // leaf_node extensions<V> (empty — "No leaf node extensions")
    w.writeVarVector(new Uint8Array(0));

    // Note: for key_package source, no group_id or leaf_index context

    return w.toUint8Array();
  }

  private _buildLeafNode(credential: Uint8Array, signature: Uint8Array): Uint8Array {
    const w = new MLSWriter();

    w.writeVarVector(this.encryptionPublicRaw!); // encryption_key
    w.writeVarVector(this.signingPublicRaw!); // signature_key
    w.writeBytes(credential); // credential

    // capabilities (same as TBS)
    w.writeVarVector(new Uint8Array([(MLS_VERSION >> 8) & 0xff, MLS_VERSION & 0xff]));
    w.writeVarVector(new Uint8Array([(CIPHER_SUITE_ID >> 8) & 0xff, CIPHER_SUITE_ID & 0xff]));
    w.writeVarVector(new Uint8Array(0));
    w.writeVarVector(new Uint8Array(0));
    w.writeVarVector(
      new Uint8Array([(CREDENTIAL_TYPE_BASIC >> 8) & 0xff, CREDENTIAL_TYPE_BASIC & 0xff]),
    );

    w.writeUint8(LEAF_NODE_SOURCE_KEY_PACKAGE); // leaf_node_source
    w.writeUint32(0);
    w.writeUint32(0); // not_before
    w.writeUint32(0xffffffff);
    w.writeUint32(0xffffffff); // not_after
    w.writeVarVector(new Uint8Array(0)); // extensions

    w.writeVarVector(signature); // signature<V>

    return w.toUint8Array();
  }

  private _buildKeyPackageTBSContent(leafNode: Uint8Array): Uint8Array {
    const w = new MLSWriter();
    w.writeUint16(MLS_VERSION);
    w.writeUint16(CIPHER_SUITE_ID);
    w.writeVarVector(this.hpkePublicRaw!); // init_key
    w.writeBytes(leafNode);
    w.writeVarVector(new Uint8Array(0)); // extensions
    return w.toUint8Array();
  }

  // ─── Welcome Processing ─────────────────────────────────────

  /**
   * Process an MLS Welcome message (received via Op 30).
   * Full HPKE decryption + MLS key schedule per RFC 9420.
   */
  private async _processWelcome(data: Uint8Array) {
    console.log('[DAVE] Processing welcome message:', data.length, 'bytes');
    if (data.length < 4) throw new Error('Welcome too short');

    const reader = new MLSReader(data);

    // Welcome: { CipherSuite, EncryptedGroupSecrets secrets<V>, opaque encrypted_group_info<V> }
    const cs = reader.readUint16();
    const secretsData = reader.readVarVector();
    const encryptedGroupInfo = reader.readVarVector();
    console.log(
      '[DAVE] Welcome: cs=',
      cs,
      'secrets=',
      secretsData.length,
      'B, encGroupInfo=',
      encryptedGroupInfo.length,
      'B',
    );

    // Build HPKE info = EncryptContext("MLS 1.0 Welcome", encrypted_group_info)
    // Per RFC 9420 Section 5.1.2: EncryptWithLabel uses this as the HPKE info
    const infoWriter = new MLSWriter();
    infoWriter.writeVarVector(new TextEncoder().encode('MLS 1.0 Welcome'));
    infoWriter.writeVarVector(encryptedGroupInfo);
    const hpkeInfo = infoWriter.toUint8Array();

    // Try each EncryptedGroupSecrets entry
    const secretsReader = new MLSReader(secretsData);
    let groupSecretsBytes: Uint8Array | null = null;

    while (secretsReader.remaining > 0) {
      // EncryptedGroupSecrets: { KeyPackageRef new_member<V>, HPKECiphertext { kem_output<V>, ciphertext<V> } }
      secretsReader.readVarVector(); // key_package_ref (skip)
      const kemOutput = secretsReader.readVarVector();
      const ciphertext = secretsReader.readVarVector();

      console.log(
        '[DAVE] Trying HPKE decrypt: kem=',
        kemOutput.length,
        'B, ct=',
        ciphertext.length,
        'B',
      );

      try {
        groupSecretsBytes = await hpkeBaseOpen(
          kemOutput,
          this.hpkeKeyPair!.privateKey,
          this.hpkePublicRaw!,
          hpkeInfo,
          new Uint8Array(0), // empty AAD
          ciphertext,
        );
        console.log('[DAVE] HPKE decrypted group secrets:', groupSecretsBytes.length, 'B');
        break;
      } catch (err) {
        console.log('[DAVE] HPKE decrypt failed for this entry:', err);
        continue;
      }
    }

    if (!groupSecretsBytes) {
      throw new Error('Could not decrypt any group secret entry');
    }

    // Parse GroupSecrets: { opaque joiner_secret<V>, optional<PathSecret>, PreSharedKeyID psks<V> }
    const gsReader = new MLSReader(groupSecretsBytes);
    const joinerSecret = gsReader.readVarVector();

    // Check for optional path_secret and psks
    let pathSecret: Uint8Array | null = null;
    if (gsReader.remaining > 0) {
      const hasPathSecret = gsReader.readUint8();
      if (hasPathSecret === 1) {
        pathSecret = gsReader.readVarVector();
      }
    }

    console.log('[DAVE] Joiner secret:', joinerSecret.length, 'B');

    // RFC 9420 Section 8 Key Schedule:
    // pre1 = KDF.Extract(salt=joiner_secret, ikm=psk_secret)
    // welcome_secret = DeriveSecret(pre1, "welcome") = ExpandWithLabel(pre1, "welcome", "", Nh)
    // member_secret = ExpandWithLabel(pre1, "member", GroupContext, Nh)
    const pskSecret = new Uint8Array(32); // no PSKs → zeros
    const pre1 = await hkdfExtract(joinerSecret, pskSecret);

    // Derive welcome_secret → welcome_key + welcome_nonce to decrypt GroupInfo
    const welcomeSecret = await mlsExpandWithLabel(pre1, 'welcome', new Uint8Array(0), 32);
    const welcomeKey = await mlsExpandWithLabel(welcomeSecret, 'key', new Uint8Array(0), 16);
    const welcomeNonce = await mlsExpandWithLabel(welcomeSecret, 'nonce', new Uint8Array(0), 12);

    // Decrypt GroupInfo
    const giCryptoKey = await crypto.subtle.importKey('raw', welcomeKey, 'AES-GCM', false, [
      'decrypt',
    ]);
    const groupInfoBytes = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: welcomeNonce, tagLength: 128 },
        giCryptoKey,
        encryptedGroupInfo,
      ),
    );
    console.log('[DAVE] Decrypted GroupInfo:', groupInfoBytes.length, 'B');

    // Parse GroupContext from GroupInfo
    // GroupInfo: { GroupContext, Extension extensions<V>, opaque confirmation_tag<V>, uint32 signer, opaque signature<V> }
    // GroupContext: { uint16 version, uint16 cipher_suite, opaque group_id<V>, uint64 epoch,
    //                opaque tree_hash<V>, opaque confirmed_transcript_hash<V>, Extension extensions<V> }
    const giReader = new MLSReader(groupInfoBytes);
    const gcStart = giReader.offset;
    giReader.readUint16(); // version
    giReader.readUint16(); // cipher_suite
    giReader.readVarVector(); // group_id
    giReader.readUint32(); // epoch hi
    const epochLo = giReader.readUint32(); // epoch lo
    giReader.readVarVector(); // tree_hash
    giReader.readVarVector(); // confirmed_transcript_hash
    giReader.readVarVector(); // extensions
    const gcEnd = giReader.offset;
    const groupContextBytes = groupInfoBytes.subarray(gcStart, gcEnd);
    this.epoch = epochLo;
    console.log(
      '[DAVE] GroupContext parsed, epoch:',
      this.epoch,
      'gc:',
      groupContextBytes.length,
      'B',
    );

    // Key schedule per mlspp's make_epoch_secret (Welcome path):
    //   member_secret = KDF.Extract(joiner_secret, psk_secret) = pre1
    //   epoch_secret = ExpandWithLabel(member_secret, "epoch", GroupContext, Nh)
    //   exporter_secret = DeriveSecret(epoch_secret, "exporter")
    // Note: mlspp names Extract(joiner, psk) as "member_secret" — there is NO separate
    // ExpandWithLabel("member",...) step or second Extract with init_secret for Welcome joins.
    this.epochSecret = await mlsExpandWithLabel(pre1, 'epoch', groupContextBytes, 32);

    // DeriveSecret(S, L) = ExpandWithLabel(S, L, "", Nh)
    this.exporterSecret = await mlsExpandWithLabel(
      this.epochSecret,
      'exporter',
      new Uint8Array(0),
      32,
    );

    this.sendCounter = 0n;
    await this._deriveSenderKeys();

    // Derive receiver keys for all users we already know about (from SPEAKING messages
    // that arrived before the Welcome was processed)
    for (const [, userId] of this.ssrcToUserId) {
      if (userId !== this.userId && !this.receiverRatchets.has(userId)) {
        await this.deriveReceiverKeyForUser(userId);
      }
    }

    this.state = 'ready';
    console.log('[DAVE] Welcome fully processed, epoch:', this.epoch, 'state: ready, receiverRatchets:', this.receiverRatchets.size);
  }

  // ─── Sender Key Derivation ─────────────────────────────────

  /**
   * Derive per-sender media encryption key using MLS-Exporter.
   * Per protocol.md:
   * - Label: "Discord Secure Frames v0"
   * - Context: little-endian 64-bit user ID of the sender
   * - Length: 16 bytes
   *
   * MLS-Exporter(label, context, length):
   *   secret = DeriveSecret(exporter_secret, label) = ExpandWithLabel(exporter_secret, label, "", 32)
   *   return ExpandWithLabel(secret, "exported", Hash(context), length)
   */
  private async _deriveSenderKeys() {
    if (!this.exporterSecret) return;

    // Build sender context: little-endian 64-bit user ID
    const userId = BigInt(this.userId);
    const senderContext = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      senderContext[i] = Number((userId >> BigInt(i * 8)) & 0xffn);
    }

    // MLS-Exporter("Discord Secure Frames v0", littleEndianSenderID, 16)
    const secret = await mlsExpandWithLabel(
      this.exporterSecret,
      'Discord Secure Frames v0',
      new Uint8Array(0),
      32,
    );
    const contextHash = new Uint8Array(await crypto.subtle.digest('SHA-256', senderContext));
    const senderBaseSecret = await mlsExpandWithLabel(secret, 'exported', contextHash, 16);

    console.log('[DAVE] Our sender base secret (16B):', hex(senderBaseSecret), 'userId:', this.userId);

    // Create key ratchet from base secret
    this.senderRatchet = new KeyRatchet(senderBaseSecret);
    console.log('[DAVE] Sender key ratchet created for epoch', this.epoch);
  }

  /**
   * Derive receiver key for another user and store it.
   * Uses same MLS-Exporter logic as _deriveSenderKeys but with the other user's ID.
   */
  async deriveReceiverKeyForUser(userId: string) {
    if (!this.exporterSecret) return;

    const uid = BigInt(userId);
    const senderContext = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      senderContext[i] = Number((uid >> BigInt(i * 8)) & 0xffn);
    }

    const secret = await mlsExpandWithLabel(
      this.exporterSecret,
      'Discord Secure Frames v0',
      new Uint8Array(0),
      32,
    );
    const contextHash = new Uint8Array(await crypto.subtle.digest('SHA-256', senderContext));
    const receiverBaseSecret = await mlsExpandWithLabel(secret, 'exported', contextHash, 16);

    console.log('[DAVE] Receiver base secret for user', userId, '(16B):', hex(receiverBaseSecret));

    this.receiverRatchets.set(userId, new KeyRatchet(receiverBaseSecret));
  }

  /**
   * Register an SSRC → userId mapping (from SPEAKING messages).
   * Derives the receiver key if we have an exporter secret and don't have it yet.
   */
  async registerSpeakingSsrc(ssrc: number, userId: string) {
    this.ssrcToUserId.set(ssrc, userId);
    console.log('[DAVE] SSRC', ssrc, '→ user', userId, '(total mappings:', this.ssrcToUserId.size, ')');

    if (this.exporterSecret && !this.receiverRatchets.has(userId) && userId !== this.userId) {
      await this.deriveReceiverKeyForUser(userId);
    }
  }

  // ─── Frame Encryption / Decryption ─────────────────────────

  /**
   * Encrypt a media frame per protocol.md "Payload Format".
   * For OPUS audio: entire frame is encrypted.
   * Output: [encrypted_data][8-byte truncated auth tag][ULEB128 nonce][0 suppl_size][0xFAFA]
   */
  async encryptFrame(plaintext: Uint8Array): Promise<Uint8Array> {
    if (!this.senderRatchet) return plaintext;

    const nonce32 = Number(this.sendCounter++ & 0xffffffffn);
    const generation = (nonce32 >>> 24) & 0xff;

    // Get ratcheted key for this generation
    const key = await this.senderRatchet.getKey(generation);

    // Build expanded frame nonce: 8 zero bytes + 4-byte little-endian truncated nonce
    // (matches x86/ARM-LE memcpy behavior in Discord's native client)
    // Discord does NOT XOR with ratchet nonce — expanded nonce is used directly as IV
    const iv = new Uint8Array(12);
    iv[8] = nonce32 & 0xff;
    iv[9] = (nonce32 >>> 8) & 0xff;
    iv[10] = (nonce32 >>> 16) & 0xff;
    iv[11] = (nonce32 >>> 24) & 0xff;

    // For OPUS: no unencrypted ranges, no AAD — encrypt with 64-bit tag
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 64 },
        key,
        plaintext,
      ),
    );

    // AES-GCM with tagLength: 64 outputs ciphertext + 8-byte tag
    const ciphertext = encrypted.subarray(0, encrypted.length - 8);
    const truncatedTag = encrypted.subarray(encrypted.length - 8);

    // ULEB128 encode the nonce
    const nonceBytes = uleb128Encode(nonce32);

    // Supplemental data size: tag(8) + nonce(var) + unencrypted_ranges(0) + suppl_size(1) + marker(2)
    const supplSize = 8 + nonceBytes.length + 0 + 1 + 2;

    // Build output: [ciphertext][truncated_tag][uleb128_nonce][suppl_size][0xFAFA]
    return concatBytes(
      ciphertext,
      truncatedTag,
      nonceBytes,
      new Uint8Array([supplSize]),
      new Uint8Array([0xfa, 0xfa]),
    );
  }

  /**
   * Decrypt a DAVE protocol frame.
   */
  async decryptFrame(frame: Uint8Array, ssrc?: number): Promise<Uint8Array> {
    // Look up the correct ratchet: use receiver ratchet for the SSRC's user, fallback to sender
    let ratchet: KeyRatchet | null = null;
    if (ssrc !== undefined) {
      const userId = this.ssrcToUserId.get(ssrc);
      if (userId) {
        ratchet = this.receiverRatchets.get(userId) || null;
      }
    }
    if (!ratchet) {
      ratchet = this.senderRatchet;
    }
    if (!ratchet) return frame;

    // Check for magic marker 0xFAFA at the end
    if (
      frame.length < 13 ||
      frame[frame.length - 1] !== 0xfa ||
      frame[frame.length - 2] !== 0xfa
    ) {
      // Not a protocol frame — passthrough
      if (this._decryptLogCount < 10) {
        this._decryptLogCount++;
        const tail = frame.slice(Math.max(0, frame.length - 10));
        console.log(
          `[DAVE] decryptFrame: NO 0xFAFA marker. len=${frame.length}, last10=[${Array.from(tail).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`,
        );
      }
      return frame;
    }

    // Parse supplemental data from the end
    const supplSize = frame[frame.length - 3];
    const supplStart = frame.length - supplSize;
    if (supplStart < 0) return frame;

    // Supplemental region: [truncated_tag(8)][uleb128_nonce][unencrypted_ranges...][suppl_size(1)][marker(2)]
    const supplData = frame.subarray(supplStart);

    // Extract truncated tag (first 8 bytes of supplemental)
    const truncatedTag = supplData.subarray(0, 8);

    // Decode ULEB128 nonce (after tag, before suppl_size + marker)
    const nonceArea = supplData.subarray(8, supplData.length - 3);
    const { value: nonce32 } = uleb128Decode(nonceArea);

    // Generation = MSB of the 32-bit truncated nonce
    const generation = (nonce32 >>> 24) & 0xff;

    // Get ratcheted key for this generation
    const key = await ratchet.getKey(generation);

    // Build expanded frame nonce: 8 zero bytes + 4-byte little-endian truncated nonce
    // (matches x86/ARM-LE memcpy behavior in Discord's native client)
    // Discord does NOT XOR with ratchet nonce — expanded nonce is used directly as IV
    const iv = new Uint8Array(12);
    iv[8] = nonce32 & 0xff;
    iv[9] = (nonce32 >>> 8) & 0xff;
    iv[10] = (nonce32 >>> 16) & 0xff;
    iv[11] = (nonce32 >>> 24) & 0xff;

    // Ciphertext is everything before supplemental data
    const ciphertext = frame.subarray(0, supplStart);

    // Combine ciphertext + truncated 8-byte tag for AES-GCM decrypt with tagLength: 64
    const combined = concatBytes(ciphertext, truncatedTag);

    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 64 },
        key,
        combined,
      );
      return new Uint8Array(plaintext);
    } catch (err) {
      // Log first few failures to debug
      if (this._decryptLogCount < 10) {
        this._decryptLogCount++;
        console.error(
          `[DAVE] AES-GCM decrypt failed: nonce=${nonce32}, gen=${generation}, ctLen=${ciphertext.length}, supplSize=${supplSize}`,
          err,
        );
      }
      return frame;
    }
  }

  // ─── WebRTC Encoded Transforms ────────────────────────────────

  setupEncodedTransforms(peerConnection: RTCPeerConnection) {
    // Set up sender transforms for existing senders
    for (const sender of peerConnection.getSenders()) {
      if (sender.track?.kind === 'audio') {
        this._setupSenderTransform(sender);
      }
    }

    // Set up receiver transforms for existing receivers IMMEDIATELY.
    // The receiver already exists from addTransceiver('sendrecv') — we must
    // call createEncodedStreams() on it NOW, before setRemoteDescription(),
    // so the encoded frames pipeline is ready when RTP starts arriving.
    for (const receiver of peerConnection.getReceivers()) {
      if (receiver.track?.kind === 'audio') {
        this._setupReceiverTransform(receiver);
      }
    }

    // Also handle any future tracks (e.g. renegotiation adds new receivers)
    peerConnection.addEventListener('track', (event) => {
      if (event.track.kind === 'audio' && event.receiver) {
        // Only set up if not already done
        // @ts-ignore - custom flag to prevent double createEncodedStreams()
        if (!event.receiver._daveTransformSetUp) {
          this._setupReceiverTransform(event.receiver);
        }
      }
    });
  }

  private _setupSenderTransform(sender: RTCRtpSender) {
    try {
      // @ts-ignore
      const streams = sender.createEncodedStreams?.();
      if (!streams) {
        console.log('[DAVE] Encoded streams not available for sender');
        return;
      }

      const { readable, writable } = streams;
      const session = this;

      let senderFrameCount = 0;
      const transformStream = new TransformStream({
        async transform(chunk: any, controller: any) {
          senderFrameCount++;
          if (senderFrameCount <= 5 || senderFrameCount % 500 === 0) {
            console.log(
              `[DAVE] Sender frame #${senderFrameCount}, state: ${session.state}, hasRatchet: ${!!session.senderRatchet}, size: ${chunk.data?.byteLength}`,
            );
          }

          if (session.state !== 'ready' || !session.senderRatchet) {
            controller.enqueue(chunk);
            return;
          }

          try {
            const data = new Uint8Array(chunk.data);
            const encrypted = await session.encryptFrame(data);
            chunk.data = encrypted.buffer;
            controller.enqueue(chunk);
          } catch (err) {
            if (senderFrameCount <= 10) console.error('[DAVE] Sender encrypt error:', err);
            controller.enqueue(chunk);
          }
        },
      });

      readable
        .pipeThrough(transformStream)
        .pipeTo(writable)
        .catch((err: any) => console.error('[DAVE] Sender pipe error:', err));
      console.log('[DAVE] Sender transform set up');
    } catch (err) {
      console.warn('[DAVE] Failed to set up sender transform:', err);
    }
  }

  private _setupReceiverTransform(receiver: RTCRtpReceiver) {
    try {
      // @ts-ignore - mark to prevent double setup
      receiver._daveTransformSetUp = true;
      // @ts-ignore
      const streams = receiver.createEncodedStreams?.();
      console.log(
        '[DAVE] Receiver createEncodedStreams result:',
        streams ? Object.keys(streams) : 'null/undefined',
        'receiver.track:',
        receiver.track?.kind,
        receiver.track?.readyState,
        receiver.track?.muted,
      );
      if (!streams) {
        console.log('[DAVE] Encoded streams not available for receiver');
        return;
      }

      const { readable, writable } = streams;
      console.log(
        '[DAVE] Receiver streams - readable:',
        readable?.constructor?.name,
        'locked:',
        readable?.locked,
        'writable:',
        writable?.constructor?.name,
        'locked:',
        writable?.locked,
      );
      const session = this;

      let receiverFrameCount = 0;
      const transformStream = new TransformStream({
        async transform(chunk: any, controller: any) {
          receiverFrameCount++;

          // Extract SSRC from encoded frame metadata for per-user key lookup
          const metadata = chunk.getMetadata?.();
          const ssrc = metadata?.synchronizationSource;

          if (receiverFrameCount <= 10 || receiverFrameCount % 500 === 0) {
            const data = new Uint8Array(chunk.data);
            const userId = ssrc ? session.ssrcToUserId.get(ssrc) : undefined;
            const tail = data.slice(Math.max(0, data.byteLength - 20));
            const tailHex = Array.from(tail).map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log(
              `[DAVE] Receiver frame #${receiverFrameCount}, ssrc: ${ssrc}, user: ${userId}, state: ${session.state}, hasRatchet: ${userId ? session.receiverRatchets.has(userId) : false}, size: ${data.byteLength}`,
              `\n  first8: [${Array.from(data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`,
              `\n  last20: [${tailHex}]`,
              `\n  last2: 0x${data[data.byteLength-2]?.toString(16)} 0x${data[data.byteLength-1]?.toString(16)}`,
            );
          }

          if (session.state !== 'ready') {
            controller.enqueue(chunk);
            return;
          }

          try {
            const data = new Uint8Array(chunk.data);
            const decrypted = await session.decryptFrame(data, ssrc);
            if (receiverFrameCount <= 5) {
              console.log(
                `[DAVE] Receiver decrypted #${receiverFrameCount}, ssrc: ${ssrc}, in: ${data.byteLength}, out: ${decrypted.byteLength}`,
              );
            }
            chunk.data = decrypted.buffer;
            controller.enqueue(chunk);
          } catch (err) {
            if (receiverFrameCount <= 10) console.error('[DAVE] Receiver decrypt error:', err);
            controller.enqueue(chunk);
          }
        },
      });

      readable
        .pipeThrough(transformStream)
        .pipeTo(writable)
        .catch((err: any) => console.error('[DAVE] Receiver pipe error:', err));
      console.log('[DAVE] Receiver transform set up, readable:', !!readable, 'writable:', !!writable);
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
    this.exporterSecret = null;
    this.pendingEpochSecret = null;
    this.sframeKeyMaterial = null;
    this.senderRatchet = null;
    this.receiverRatchets.clear();
    this.ssrcToUserId.clear();
    this.sendCounter = 0n;
    this.epoch = 0;
    this.transitioning = false;
  }
}

// ─── ULEB128 Encoding/Decoding ───────────────────────────────

function uleb128Encode(value: number): Uint8Array {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value > 0) byte |= 0x80;
    bytes.push(byte);
  } while (value > 0);
  return new Uint8Array(bytes);
}

function uleb128Decode(data: Uint8Array): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    value |= (byte & 0x7f) << shift;
    shift += 7;
    bytesRead++;
    if ((byte & 0x80) === 0) break;
  }
  return { value: value >>> 0, bytesRead };
}
