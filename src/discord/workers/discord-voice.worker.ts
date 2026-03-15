/**
 * Discord Voice Web Worker
 *
 * Runs the voice gateway WebSocket, heartbeat, and DAVE E2EE crypto on a
 * separate thread so that main-thread lag cannot cause missed heartbeats
 * or crypto timing issues.
 *
 * The RTCPeerConnection stays on the main thread (browser requirement).
 * Encoded audio streams are transferred to this worker for encryption/decryption.
 */

import { DaveSession } from '../services/discord-dave';
import { VoiceOp } from '../constants/gateway-opcodes';

// ─── Types ─────────────────────────────────────────────────────

/** Messages the main thread sends to this worker */
type MainToWorker =
  | {
      type: 'connect';
      endpoint: string;
      serverId: string;
      channelId: string;
      userId: string;
      sessionId: string;
      token: string;
    }
  | { type: 'disconnect' }
  | { type: 'send'; op: number; data: any }
  | { type: 'sendBinary'; op: number; payload: ArrayBuffer }
  | {
      type: 'setupSenderTransform';
      readable: ReadableStream;
      writable: WritableStream;
    }
  | {
      type: 'setupReceiverTransform';
      readable: ReadableStream;
      writable: WritableStream;
    }
  | { type: 'registerSsrc'; ssrc: number; userId: string };

/** Messages this worker sends to the main thread */
type WorkerToMain =
  | { type: 'ready'; ssrc: number; daveProtocolVersion: number; data: any }
  | { type: 'sessionDescription'; data: any }
  | { type: 'speaking'; data: any }
  | { type: 'clientsConnect'; data: any }
  | { type: 'clientDisconnect'; data: any }
  | { type: 'connectionState'; state: string }
  | { type: 'daveReady' }
  | { type: 'log'; level: string; args: any[] };

// ─── Worker State ──────────────────────────────────────────────

let voiceWs: WebSocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatAcked = true;
let heartbeatNonce = 0;
let seqAck = -1;
let daveSession: DaveSession | null = null;
let voiceMessageQueue: Promise<void> = Promise.resolve();

// Connection params (set on 'connect')
let serverId = '';
let channelId = '';
let userId = '';
let sessionId = '';
let voiceToken = '';

// Frame counters for logging
let senderFrameCount = 0;
let receiverFrameCount = 0;

// ─── Helpers ───────────────────────────────────────────────────

function post(msg: WorkerToMain) {
  self.postMessage(msg);
}

function log(...args: any[]) {
  post({ type: 'log', level: 'log', args: ['[Voice Worker]', ...args] });
}

function warn(...args: any[]) {
  post({ type: 'log', level: 'warn', args: ['[Voice Worker]', ...args] });
}

function sendVoice(op: number, d: any) {
  if (voiceWs && voiceWs.readyState === WebSocket.OPEN) {
    voiceWs.send(JSON.stringify({ op, d }));
  }
}

function sendDaveBinary(op: number, payload: Uint8Array) {
  if (!voiceWs || voiceWs.readyState !== WebSocket.OPEN) return;
  const frame = new Uint8Array(1 + payload.length);
  frame[0] = op;
  frame.set(payload, 1);
  log(`Sending DAVE binary: op=${op}, payload=${payload.length} bytes`);
  voiceWs.send(frame.buffer);
}

// ─── Connection ────────────────────────────────────────────────

function connect(
  endpoint: string,
  _serverId: string,
  _channelId: string,
  _userId: string,
  _sessionId: string,
  _token: string,
) {
  disconnectVoiceGateway();

  serverId = _serverId;
  channelId = _channelId;
  userId = _userId;
  sessionId = _sessionId;
  voiceToken = _token;

  const url = `wss://${endpoint}/?v=9`;
  log(`Connecting to voice gateway: ${url}`);

  voiceWs = new WebSocket(url);
  voiceWs.binaryType = 'arraybuffer';

  voiceWs.onopen = () => {
    log('Voice gateway connected');
  };

  voiceWs.onmessage = (event) => {
    try {
      const data = event.data;
      let parsed;

      if (data instanceof ArrayBuffer) {
        const buffer: ArrayBuffer = data;
        if (buffer.byteLength < 3) return;
        const view = new Uint8Array(buffer);
        const seqNum = (view[0] << 8) | view[1];
        const op = view[2];
        const d = new Uint8Array(buffer, 3);
        log(`Binary DAVE message: seq=${seqNum}, op=${op}, ${d.byteLength} bytes`);
        parsed = { op, d, seq: seqNum };
      } else if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else {
        warn('Unknown message data type');
        return;
      }

      // Serialize all voice message handling to avoid race conditions.
      // E.g., executeTransition must complete before the next commit is processed.
      voiceMessageQueue = voiceMessageQueue.then(() => handleVoiceMessage(parsed)).catch((e) => warn('Message handler error:', String(e)));
    } catch (err) {
      warn('Failed to parse voice message:', String(err));
    }
  };

  voiceWs.onclose = (event) => {
    log(`Voice gateway closed: ${event.code} ${event.reason}`);
    stopHeartbeat();
    post({ type: 'connectionState', state: 'disconnected' });
  };

  voiceWs.onerror = () => {
    warn('Voice gateway error');
  };
}

function disconnectVoiceGateway() {
  stopHeartbeat();
  if (voiceWs) {
    voiceWs.onclose = null;
    voiceWs.onerror = null;
    voiceWs.close(1000, 'Intentional disconnect');
    voiceWs = null;
  }
}

function cleanup() {
  disconnectVoiceGateway();
  if (daveSession) {
    daveSession.destroy();
    daveSession = null;
  }
  seqAck = -1;
  senderFrameCount = 0;
  receiverFrameCount = 0;
}

// ─── Voice Message Handling ────────────────────────────────────

async function handleVoiceMessage(payload: any) {
  const { op, d, seq } = payload;

  if (typeof seq === 'number' && seq > seqAck) {
    seqAck = seq;
  }

  switch (op) {
    case VoiceOp.HELLO:
      log('HELLO received');
      sendVoice(VoiceOp.IDENTIFY, {
        server_id: serverId,
        user_id: userId,
        session_id: sessionId,
        channel_id: channelId,
        token: voiceToken,
        video: true,
        streams: [{ type: 'video', rid: '100', quality: 100 }],
        max_dave_protocol_version: 1,
      });
      sendVoice(VoiceOp.CLIENT_FLAGS, {});
      startHeartbeat(d.heartbeat_interval);
      break;

    case VoiceOp.READY: {
      log('READY received, ssrc:', d.ssrc);

      // Initialize DAVE session
      daveSession = new DaveSession();
      try {
        await daveSession.initialize(userId);
        log('DAVE session initialized');
      } catch (err) {
        warn('DAVE initialize failed:', String(err));
        daveSession = null;
      }

      // Notify main thread to set up WebRTC
      post({
        type: 'ready',
        ssrc: d.ssrc,
        daveProtocolVersion: d.dave_protocol_version,
        data: d,
      });
      break;
    }

    case VoiceOp.SESSION_DESCRIPTION:
      log('SESSION_DESCRIPTION received');
      post({ type: 'sessionDescription', data: d });
      break;

    case VoiceOp.HEARTBEAT_ACK:
      heartbeatAcked = true;
      break;

    case VoiceOp.SPEAKING:
      log('SPEAKING:', JSON.stringify(d));
      if (d?.ssrc && d?.user_id) {
        if (daveSession) {
          daveSession.registerSpeakingSsrc(d.ssrc, d.user_id);
        }
      }
      // Forward to main thread for SDP renegotiation + audio monitoring
      post({ type: 'speaking', data: d });
      break;

    case VoiceOp.RESUMED:
      log('Voice session resumed');
      break;

    case VoiceOp.CLIENTS_CONNECT:
      log('CLIENTS_CONNECT: users in call:', d?.user_ids);
      post({ type: 'clientsConnect', data: d });
      break;

    case VoiceOp.CLIENT_DISCONNECT:
      log('CLIENT_DISCONNECT:', d?.user_id);
      post({ type: 'clientDisconnect', data: d });
      break;

    case VoiceOp.CLIENT_FLAGS:
    case VoiceOp.CLIENT_PLATFORM:
    case VoiceOp.MEDIA_SINK_WANTS:
    case VoiceOp.VOICE_BACKEND_VERSION:
      break;

    // ─── DAVE E2EE Opcodes ───────────────────────────────────────

    case VoiceOp.DAVE_PROTOCOL_PREPARE_TRANSITION:
      log('DAVE prepare transition:', JSON.stringify(d));
      if (daveSession) daveSession.handlePrepareTransition(d);
      break;

    case VoiceOp.DAVE_PROTOCOL_EXECUTE_TRANSITION:
      log('DAVE execute transition:', JSON.stringify(d));
      if (daveSession) await daveSession.handleExecuteTransition(d);
      break;

    case VoiceOp.DAVE_PROTOCOL_PREPARE_EPOCH: {
      log('DAVE prepare epoch:', JSON.stringify(d));
      const epoch = d?.epoch ?? 0;
      if (epoch === 1 && daveSession) {
        log('DAVE group (re)creation, resetting group state');
        daveSession.resetGroupState();
      }
      break;
    }

    case VoiceOp.DAVE_MLS_EXTERNAL_SENDER_PACKAGE:
      if (d instanceof Uint8Array) {
        await handleDaveExternalSender(d);
      }
      break;

    case VoiceOp.DAVE_MLS_PROPOSALS:
      if (d instanceof Uint8Array && daveSession) {
        daveSession.handleProposals(d);
      }
      break;

    case VoiceOp.DAVE_MLS_ANNOUNCE_COMMIT_TRANSITION:
      if (d instanceof Uint8Array) {
        await handleDaveAnnounceCommitTransition(d);
      }
      break;

    case VoiceOp.DAVE_MLS_WELCOME:
      if (d instanceof Uint8Array) {
        await handleDaveWelcome(d);
      }
      break;

    case VoiceOp.DAVE_MLS_INVALID_COMMIT_WELCOME:
      warn('DAVE invalid commit/welcome:', d);
      break;

    default:
      log(`Unhandled voice opcode: ${op}`);
  }
}

// ─── DAVE Handlers ─────────────────────────────────────────────

async function handleDaveExternalSender(d: Uint8Array) {
  if (!daveSession) return;
  try {
    const keyPackageMsg = await daveSession.handleExternalSender(d);
    log('DAVE key package created, length:', keyPackageMsg.length);
    sendDaveBinary(VoiceOp.DAVE_MLS_KEY_PACKAGE, keyPackageMsg);
    log('DAVE key package sent (Op 26)');
  } catch (err) {
    warn('DAVE external sender handling failed:', String(err));
  }
}

async function handleDaveAnnounceCommitTransition(d: Uint8Array) {
  if (!daveSession) return;
  try {
    if (d.length < 2) return;
    const transitionId = (d[0] << 8) | d[1];
    const commitData = d.subarray(2);
    log('DAVE announce commit transition: transitionId=', transitionId);

    await daveSession.handleCommit(commitData);
    log('DAVE commit processed, state:', daveSession.state);

    sendVoice(VoiceOp.DAVE_PROTOCOL_READY_FOR_TRANSITION, {
      transition_id: transitionId,
    });

    // Do NOT post daveReady here — encoded transforms are already set up
    // from the initial welcome and use the session object by reference,
    // so key updates from commit transitions are reflected automatically.
  } catch (err) {
    warn('DAVE announce commit transition failed:', String(err));
  }
}

async function handleDaveWelcome(d: Uint8Array) {
  if (!daveSession) return;
  try {
    if (d.length < 2) return;
    const transitionId = (d[0] << 8) | d[1];
    const welcomeData = d.subarray(2);
    log('DAVE welcome: transitionId=', transitionId);

    await daveSession.handleWelcome(welcomeData);
    log('DAVE welcome processed, state:', daveSession.state, 'epoch:', daveSession.epoch);

    sendVoice(VoiceOp.DAVE_PROTOCOL_READY_FOR_TRANSITION, {
      transition_id: transitionId,
    });

    if (daveSession.state === 'ready') {
      post({ type: 'daveReady' });
    }
  } catch (err) {
    warn('DAVE welcome handling failed:', String(err));
  }
}

// ─── Heartbeat ─────────────────────────────────────────────────

function startHeartbeat(intervalMs: number) {
  stopHeartbeat();
  heartbeatAcked = true;
  heartbeatNonce = 0;

  const jitter = Math.random();
  setTimeout(() => {
    sendHeartbeat();

    heartbeatInterval = setInterval(() => {
      if (!heartbeatAcked) {
        warn('Voice heartbeat not ACKed, closing');
        voiceWs?.close(4009, 'Voice heartbeat timeout');
        return;
      }
      sendHeartbeat();
    }, intervalMs);
  }, intervalMs * jitter);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function sendHeartbeat() {
  heartbeatAcked = false;
  heartbeatNonce++;
  sendVoice(VoiceOp.HEARTBEAT, {
    t: Date.now(),
    seq_ack: seqAck,
  });
}

// ─── Encoded Transform Streams (DAVE E2EE) ────────────────────

function setupSenderTransform(readable: ReadableStream, writable: WritableStream) {
  const session = daveSession;
  senderFrameCount = 0;

  const transformStream = new TransformStream({
    async transform(chunk: any, controller: any) {
      senderFrameCount++;
      // if (senderFrameCount <= 5 || senderFrameCount % 500 === 0) {
      //   log(
      //     `Sender frame #${senderFrameCount}, state: ${session?.state}, hasRatchet: ${!!session?.senderRatchet}, size: ${chunk.data?.byteLength}`,
      //   );
      // }

      if (!session || session.state !== 'ready' || !session.senderRatchet) {
        controller.enqueue(chunk);
        return;
      }

      try {
        const data = new Uint8Array(chunk.data);
        const encrypted = await session.encryptFrame(data);
        chunk.data = encrypted.buffer;
        controller.enqueue(chunk);
      } catch (err) {
        if (senderFrameCount <= 10) warn('Sender encrypt error:', String(err));
        controller.enqueue(chunk);
      }
    },
  });

  readable
    .pipeThrough(transformStream)
    .pipeTo(writable)
    .catch((err: any) => warn('Sender pipe error:', String(err)));
  log('Sender transform set up');
}

function setupReceiverTransform(readable: ReadableStream, writable: WritableStream) {
  const session = daveSession;
  let localReceiverFrameCount = 0;

  const transformStream = new TransformStream({
    async transform(chunk: any, controller: any) {
      localReceiverFrameCount++;
      receiverFrameCount++;

      const metadata = chunk.getMetadata?.();
      const ssrc = metadata?.synchronizationSource;

      // if (localReceiverFrameCount <= 10 || localReceiverFrameCount % 500 === 0) {
      //   const data = new Uint8Array(chunk.data);
      //   const userId = ssrc ? session?.ssrcToUserId.get(ssrc) : undefined;
      //   log(
      //     `Receiver frame #${localReceiverFrameCount}, ssrc: ${ssrc}, user: ${userId}, state: ${session?.state}, size: ${data.byteLength}`,
      //   );
      // }

      if (!session || session.state !== 'ready') {
        controller.enqueue(chunk);
        return;
      }

      try {
        const data = new Uint8Array(chunk.data);
        const decrypted = await session.decryptFrame(data, ssrc);
        // if (localReceiverFrameCount <= 5) {
        //   log(
        //     `Receiver decrypted #${localReceiverFrameCount}, ssrc: ${ssrc}, in: ${data.byteLength}, out: ${decrypted.byteLength}`,
        //   );
        // }
        chunk.data = decrypted.buffer;
        controller.enqueue(chunk);
      } catch (err) {
        if (localReceiverFrameCount <= 10) warn('Receiver decrypt error:', String(err));
        controller.enqueue(chunk);
      }
    },
  });

  readable
    .pipeThrough(transformStream)
    .pipeTo(writable)
    .catch((err: any) => warn('Receiver pipe error:', String(err)));
  log('Receiver transform set up');
}

// ─── Worker Entry Point ────────────────────────────────────────

self.onmessage = (event: MessageEvent<MainToWorker>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'connect':
      connect(msg.endpoint, msg.serverId, msg.channelId, msg.userId, msg.sessionId, msg.token);
      break;

    case 'disconnect':
      cleanup();
      break;

    case 'send':
      sendVoice(msg.op, msg.data);
      break;

    case 'sendBinary':
      sendDaveBinary(msg.op, new Uint8Array(msg.payload));
      break;

    case 'setupSenderTransform':
      setupSenderTransform(msg.readable, msg.writable);
      break;

    case 'setupReceiverTransform':
      setupReceiverTransform(msg.readable, msg.writable);
      break;

    case 'registerSsrc':
      if (daveSession) {
        daveSession.registerSpeakingSsrc(msg.ssrc, msg.userId);
      }
      break;
  }
};
