import { describe, it, expect } from 'vitest';
import { DaveSession } from './discord-dave';
import fixture from './__fixtures__/dave-session-2.json';

// ─── Helpers ────────────────────────────────────────────────────

function b64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Fixture keys (convert base64 strings to Uint8Array at usage) ───

const FIXTURE_KEYS = {
  userId: fixture.keys.userId,
  signingPublicRaw: b64ToUint8Array(fixture.keys.signingPublicRaw),
  signingPrivateJwk: fixture.keys.signingPrivateJwk,
  hpkePublicRaw: b64ToUint8Array(fixture.keys.hpkePublicRaw),
  hpkePrivateJwk: fixture.keys.hpkePrivateJwk,
  encryptionPublicRaw: b64ToUint8Array(fixture.keys.encryptionPublicRaw),
  encryptionPrivateJwk: fixture.keys.encryptionPrivateJwk,
};

const POST_WELCOME_STATE = fixture.postWelcomeState;

// ─── Helper to create a session with post-welcome state ─────────
async function createReadySession(): Promise<DaveSession> {
  const session = new DaveSession();
  await session.initializeFromFixture(FIXTURE_KEYS);

  await session.restoreWelcomeStateForTest({
    epoch: POST_WELCOME_STATE.epoch,
    epochSecret: b64ToUint8Array(POST_WELCOME_STATE.epochSecret),
    exporterSecret: b64ToUint8Array(POST_WELCOME_STATE.exporterSecret),
    initSecret: b64ToUint8Array(POST_WELCOME_STATE.initSecret),
    groupId: b64ToUint8Array(POST_WELCOME_STATE.groupId),
    groupExtensions: b64ToUint8Array(POST_WELCOME_STATE.groupExtensions),
    confirmedTranscriptHash: b64ToUint8Array(POST_WELCOME_STATE.confirmedTranscriptHash),
    interimTranscriptHash: b64ToUint8Array(POST_WELCOME_STATE.interimTranscriptHash),
    leafIndex: POST_WELCOME_STATE.leafIndex,
    tree: POST_WELCOME_STATE.tree.map((entry) =>
      entry ? { t: entry.t as 'l' | 'p', rawBytes: b64ToUint8Array(entry.raw) } : null,
    ),
  });
  return session;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('DaveSession', () => {
  // ─── Tests that work without Welcome ────────────────────────
  // it('should initialize from fixture keys', async () => {
  //   const session = new DaveSession();
  //   await session.initializeFromFixture(FIXTURE_KEYS);

  //   expect(session.state).toBe('initialized');
  //   expect(session.userId).toBe('1280599292477964339');
  //   expect(session.signingPublicRaw).toHaveLength(65);
  //   expect(session.hpkePublicRaw).toHaveLength(65);
  //   expect(session.encryptionPublicRaw).toHaveLength(65);
  // });

  // it('should round-trip exported keys', async () => {
  //   const session = new DaveSession();
  //   await session.initializeFromFixture(FIXTURE_KEYS);

  //   expect(session.signingPublicRaw).toEqual(FIXTURE_KEYS.signingPublicRaw);
  //   expect(session.hpkePublicRaw).toEqual(FIXTURE_KEYS.hpkePublicRaw);
  //   expect(session.encryptionPublicRaw).toEqual(FIXTURE_KEYS.encryptionPublicRaw);

  //   const reExportedSig = await crypto.subtle.exportKey('jwk', session.signingKeyPair!.privateKey);
  //   expect(reExportedSig.d).toBe(FIXTURE_KEYS.signingPrivateJwk.d);
  // });

  // it('should handle external sender and produce a key package', async () => {
  //   const session = new DaveSession();
  //   await session.initializeFromFixture(FIXTURE_KEYS);

  //   const keyPackage = await session.handleExternalSender(
  //     b64ToUint8Array(fixture.externalSender),
  //   );

  //   expect(session.state).toBe('awaiting_welcome');
  //   expect(keyPackage.length).toBeGreaterThan(0);
  //   expect(keyPackage[0]).toBe(0x00);
  //   expect(keyPackage[1]).toBe(0x01);
  //   expect(keyPackage[2]).toBe(0x00);
  //   expect(keyPackage[3]).toBe(0x02);
  // });

  // it('should parse add proposals', () => {
  //   const session = new DaveSession();
  //   session.state = 'ready';
  //   session.handleProposals(b64ToUint8Array(fixture.messages.addProposal1));
  //   expect(session.pendingProposals.length).toBe(1);
  //   expect(session.pendingProposals[0].type).toBe(1);
  // });

  // it('should parse remove proposals', () => {
  //   const session = new DaveSession();
  //   session.state = 'ready';
  //   session.handleProposals(b64ToUint8Array(fixture.messages.removeProposal));
  //   expect(session.pendingProposals.length).toBe(1);
  //   expect(session.pendingProposals[0].type).toBe(3);
  // });

  // it('should handle prepare and execute transition lifecycle', () => {
  //   const session = new DaveSession();
  //   const result = session.handlePrepareTransition({ transition_id: 42 });
  //   expect(result.epoch).toBe(0);
  //   expect(session.transitioning).toBe(true);
  //   expect(session.pendingTransitionId).toBe(42);
  // });

  // it('should reset group state', () => {
  //   const session = new DaveSession();
  //   session.epoch = 5;
  //   session.leafIndex = 2;
  //   session.resetGroupState();
  //   expect(session.epoch).toBe(0);
  //   expect(session.leafIndex).toBe(-1);
  //   expect(session.state).toBe('initialized');
  //   expect(session.tree).toEqual([]);
  //   expect(session.pendingProposals).toEqual([]);
  // });

  // it('should passthrough non-DAVE frames', async () => {
  //   const session = new DaveSession();
  //   session.senderRatchet = {} as any;
  //   const plainFrame = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  //   const result = await session.decryptFrame(plainFrame);
  //   expect(result).toEqual(plainFrame);
  // });

  // it('should return empty for frames when no keys available', async () => {
  //   const session = new DaveSession();
  //   const frame = new Uint8Array([0x01, 0x02, 0x03]);
  //   const result = await session.decryptFrame(frame);
  //   expect(result).toEqual(new Uint8Array(0));
  // });

  // it('should passthrough Opus silence packets when ratchets exist', async () => {
  //   const session = new DaveSession();
  //   session.senderRatchet = {} as any;
  //   const silence = new Uint8Array([0xf8, 0xff, 0xfe]);
  //   const result = await session.decryptFrame(silence);
  //   expect(result).toEqual(silence);
  // });

  // it('should enforce MAX_OLD_EPOCHS', () => {
  //   expect(DaveSession.MAX_OLD_EPOCHS).toBe(2);
  // });

  // // ─── Tests that need post-Welcome state ─────────────────────

  // it('should encrypt and decrypt a frame round-trip', async () => {
  //   const session = await createReadySession();

  //   await session.registerSpeakingSsrc(12345, FIXTURE_KEYS.userId);

  //   const plaintext = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  //   const encrypted = await session.encryptFrame(plaintext);

  //   expect(encrypted.length).toBeGreaterThan(plaintext.length);
  //   expect(encrypted[encrypted.length - 1]).toBe(0xfa);
  //   expect(encrypted[encrypted.length - 2]).toBe(0xfa);

  //   const decrypted = await session.decryptFrame(encrypted, 12345);
  //   expect(decrypted).toEqual(plaintext);
  // });

  // it('should process add proposal + commit and advance epoch', async () => {
  //   const session = await createReadySession();
  //   const epochBefore = session.epoch;

  //   session.handleProposals(b64ToUint8Array(fixture.messages.addProposal1));
  //   expect(session.pendingProposals.length).toBe(1);
  //   expect(session.pendingProposals[0].type).toBe(1);

  //   const result = await session.handleCommit(b64ToUint8Array(fixture.messages.addCommit1));

  //   expect(result).not.toBeNull();
  //   // Confirmation tag verification depends on tree hash matching the server's computation.
  //   // The commit is still processed and epoch secrets are derived regardless.
  //   expect(result).toHaveProperty('confirmationTagVerified');

  //   await session.handleExecuteTransition({ transition_id: 1 });
  //   expect(session.epoch).toBe(epochBefore + 1);
  // });

  // it('should process remove proposal + commit and advance epoch', async () => {
  //   const session = await createReadySession();
  //   const epochBefore = session.epoch;

  //   session.handleProposals(b64ToUint8Array(fixture.messages.removeProposal));
  //   expect(session.pendingProposals.length).toBe(1);
  //   expect(session.pendingProposals[0].type).toBe(3);

  //   const result = await session.handleCommit(b64ToUint8Array(fixture.messages.removeCommit));

  //   expect(result).not.toBeNull();
  //   expect(result).toHaveProperty('confirmationTagVerified');

  //   expect(session.pendingEpochSecret).not.toBeNull();

  //   await session.handleExecuteTransition({ transition_id: 1 });

  //   expect(session.epoch).toBe(epochBefore + 1);
  //   expect(session.epochSecret).not.toBeNull();
  //   expect(session.senderRatchet).not.toBeNull();
  // });

  it('should process welcome then add, add, add then remove with all epochs advancing', async () => {
    const session = await createReadySession();
    const epochBefore = session.epoch;

    // Step 1: addProposal1 + addCommit1
    session.handleProposals(b64ToUint8Array(fixture.messages.addProposal1));
    expect(session.pendingProposals.length).toBe(1);

    const result1 = await session.handleCommit(b64ToUint8Array(fixture.messages.addCommit1));
    expect(result1).not.toBeNull();
    expect(result1!.confirmationTagVerified).toBe(true);

    await session.handleExecuteTransition({ transition_id: 1 });

    // Step 2: addProposal2 + addCommit2
    session.handleProposals(b64ToUint8Array(fixture.messages.addProposal2));
    expect(session.pendingProposals.length).toBe(1);

    const result2 = await session.handleCommit(b64ToUint8Array(fixture.messages.addCommit2));
    expect(result2).not.toBeNull();
    expect(result2!.confirmationTagVerified).toBe(true);

    await session.handleExecuteTransition({ transition_id: 2 });

    // Step 3: addProposal3 + addCommit3
    session.handleProposals(b64ToUint8Array(fixture.messages.addProposal3));
    expect(session.pendingProposals.length).toBe(1);

    const result3 = await session.handleCommit(b64ToUint8Array(fixture.messages.addCommit3));
    expect(result3).not.toBeNull();
    expect(result3!.confirmationTagVerified).toBe(true);

    await session.handleExecuteTransition({ transition_id: 3 });

    // Step 3: removeProposal + removeCommit
    session.handleProposals(b64ToUint8Array(fixture.messages.removeProposal));
    expect(session.pendingProposals.length).toBe(1);

    const result4 = await session.handleCommit(b64ToUint8Array(fixture.messages.removeCommit));
    expect(result4).not.toBeNull();
    expect(result4!.confirmationTagVerified).toBe(true);

    await session.handleExecuteTransition({ transition_id: 3 });

    // Verify final state
    expect(session.epoch).toBe(epochBefore + 3);
    expect(session.senderRatchet).not.toBeNull();
  });
});
