/**
 * Discord Gateway Web Worker
 *
 * Runs the gateway WebSocket + heartbeat on a separate thread so that
 * main-thread lag (React rendering, etc.) cannot cause missed heartbeats
 * and gateway disconnections.
 *
 * Communication with main thread via postMessage.
 */

import * as pako from 'pako';
import { GatewayOp } from '../constants/gateway-opcodes';

// ─── Types ─────────────────────────────────────────────────────

/** Messages the main thread sends to this worker */
type MainToWorker =
  | { type: 'connect'; token: string; bufferedMessages?: ArrayBuffer[] }
  | { type: 'disconnect' }
  | { type: 'send'; data: any }
  | { type: 'wsMessage'; data: ArrayBuffer }; // forwarded from fast-connect WS on main thread

/** Messages this worker sends to the main thread */
type WorkerToMain =
  | { type: 'dispatch'; eventName: string; data: any }
  | { type: 'connectionState'; connected: boolean }
  | { type: 'sessionInfo'; sessionId: string; resumeGatewayUrl: string | null }
  | { type: 'invalidSession'; resumable: boolean }
  | { type: 'authFailed' }
  | { type: 'maxReconnect' }
  | { type: 'wsSend'; data: string } // ask main thread to send over the proxied WS
  | { type: 'log'; level: string; args: any[] };

// ─── Constants ─────────────────────────────────────────────────

const GATEWAY_URL = 'wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream';

// zlib flush suffix: 0x00 0x00 0xFF 0xFF
const ZLIB_SUFFIX = new Uint8Array([0x00, 0x00, 0xff, 0xff]);

const IDENTIFY_PROPERTIES = {
  os: 'Windows',
  browser: 'Chrome',
  device: '',
  system_locale: 'en-US',
  browser_user_agent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  browser_version: '145.0.0.0',
  os_version: '10',
  referrer: 'https://discord.com/',
  referring_domain: 'discord.com',
  referrer_current: '',
  referring_domain_current: '',
  release_channel: 'stable',
  client_build_number: 500334,
  client_event_source: null,
  has_client_mods: false,
  client_launch_id: crypto.randomUUID(),
  is_fast_connect: true,
};

const CAPABILITIES = 1734653;

// ─── Worker State ──────────────────────────────────────────────

let ws: WebSocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatAcked = true;
let lastSequence: number | null = null;
let resumeGatewayUrl: string | null = null;
let sessionId: string | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
let intentionalClose = false;
let token = '';
// When true, the WS lives on the main thread and we proxy messages via postMessage
let proxied = false;

// zlib-stream inflate context — persists across messages for the entire connection
let inflate: pako.Inflate | null = null;
let zlibChunks: Uint8Array[] = [];

const Z_SYNC_FLUSH = (pako as any).constants?.Z_SYNC_FLUSH ?? 2;
const textDecoder = new TextDecoder();

function resetInflate() {
  inflate = new pako.Inflate();
  zlibChunks = [];
}

/**
 * Check if a buffer ends with the zlib flush suffix (0x00 0x00 0xFF 0xFF).
 */
function endsWithFlush(data: Uint8Array): boolean {
  const len = data.length;
  if (len < 4) return false;
  return (
    data[len - 4] === 0x00 &&
    data[len - 3] === 0x00 &&
    data[len - 2] === 0xff &&
    data[len - 1] === 0xff
  );
}

/**
 * Decompress a zlib-stream message. Buffers partial chunks and flushes
 * when the zlib suffix is detected, returning the decoded JSON payload.
 * Returns null if the message is incomplete (waiting for more chunks).
 *
 * pako v2's Inflate.push() only calls onData when the output buffer is
 * completely full (avail_out === 0) or on Z_STREAM_END. For Z_SYNC_FLUSH
 * messages smaller than chunkSize, onData is never called — the output
 * sits in strm.output without being emitted. We work around this by
 * collecting onData chunks for full-buffer flushes AND manually extracting
 * any remaining output from strm.output/next_out after push() returns.
 */
function decompressMessage(data: ArrayBuffer): any | null {
  if (!inflate) resetInflate();

  const chunk = new Uint8Array(data);
  zlibChunks.push(chunk);

  if (!endsWithFlush(chunk)) {
    return null; // partial message, wait for more
  }

  // Concatenate all buffered chunks
  let totalLen = 0;
  for (const c of zlibChunks) totalLen += c.length;
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of zlibChunks) {
    combined.set(c, offset);
    offset += c.length;
  }
  zlibChunks = [];

  const strm = (inflate as any).strm;

  // Force fresh output buffer so we don't read stale data from prior pushes
  strm.avail_out = 0;

  // Collect full-buffer flushes via onData (fires when avail_out hits 0)
  const outputChunks: Uint8Array[] = [];
  inflate!.onData = (chunk: Uint8Array) => {
    // Copy the chunk — pako passes a subarray view of its internal buffer
    outputChunks.push(chunk.slice());
  };

  inflate!.push(combined, Z_SYNC_FLUSH);

  if (inflate!.err) {
    warn('zlib inflate error:', inflate!.msg);
    resetInflate();
    return null;
  }

  // After push(), any remaining output (smaller than chunkSize) is still
  // sitting in strm.output[0..next_out) without having triggered onData.
  // Extract it manually.
  if (strm.next_out > 0) {
    outputChunks.push(strm.output.slice(0, strm.next_out));
    // Reset so the next push starts with a fresh buffer
    strm.avail_out = 0;
  }

  if (outputChunks.length === 0) return null;

  if (outputChunks.length === 1) {
    return JSON.parse(textDecoder.decode(outputChunks[0]));
  }

  let outLen = 0;
  for (const c of outputChunks) outLen += c.length;
  const result = new Uint8Array(outLen);
  let pos = 0;
  for (const c of outputChunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return JSON.parse(textDecoder.decode(result));
}

// ─── Helpers ───────────────────────────────────────────────────

function post(msg: WorkerToMain) {
  self.postMessage(msg);
}

function log(...args: any[]) {
  post({ type: 'log', level: 'log', args: ['[Gateway Worker]', ...args] });
}

function warn(...args: any[]) {
  post({ type: 'log', level: 'warn', args: ['[Gateway Worker]', ...args] });
}

function send(data: any) {
  const json = JSON.stringify(data);
  if (proxied) {
    // Ask the main thread to send over the fast-connect WS
    post({ type: 'wsSend', data: json } as any);
    return;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(json);
  }
}

// ─── Connection ────────────────────────────────────────────────

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    log('Already connected or connecting');
    return;
  }

  intentionalClose = false;
  const url = resumeGatewayUrl || GATEWAY_URL;
  log(`Connecting to ${url}`);

  resetInflate();
  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    log('WebSocket connected');
    reconnectAttempts = 0;
  };

  ws.onmessage = (event) => {
    const payload = decompressMessage(event.data as ArrayBuffer);
    if (payload) handleMessage(payload);
  };

  ws.onclose = (event) => {
    log(`WebSocket closed: ${event.code} ${event.reason}`);
    stopHeartbeat();
    post({ type: 'connectionState', connected: false });

    if (event.code === 4004) {
      post({ type: 'authFailed' });
      return;
    }

    if (!intentionalClose) {
      reconnect();
    }
  };

  ws.onerror = () => {
    warn('WebSocket error');
  };
}

function disconnect() {
  intentionalClose = true;
  stopHeartbeat();
  if (ws) {
    ws.close(1000, 'Intentional disconnect');
    ws = null;
  }
  lastSequence = null;
  resumeGatewayUrl = null;
  sessionId = null;
  reconnectAttempts = 0;
  inflate = null;
  zlibChunks = [];
  post({ type: 'connectionState', connected: false });
}

// ─── Message Handling ──────────────────────────────────────────

function handleMessage(payload: any) {
  const { op, d, s, t } = payload;

  if (s !== null && s !== undefined) {
    lastSequence = s;
  }

  switch (op) {
    case GatewayOp.HELLO:
      handleHello(d);
      break;

    case GatewayOp.DISPATCH:
      // Extract session info from READY for our own resume state
      if (t === 'READY') {
        sessionId = d.session_id;
        if (d.resume_gateway_url) {
          resumeGatewayUrl = d.resume_gateway_url;
        }
        post({
          type: 'sessionInfo',
          sessionId: d.session_id,
          resumeGatewayUrl: d.resume_gateway_url || null,
        });
      }
      // Forward ALL dispatch events to main thread for store updates
      post({ type: 'dispatch', eventName: t, data: d });
      break;

    case GatewayOp.HEARTBEAT:
      sendHeartbeat();
      break;

    case GatewayOp.RECONNECT:
      log('Server requested reconnect');
      ws?.close(4000, 'Reconnect requested');
      break;

    case GatewayOp.INVALID_SESSION:
      log('Invalid session, resumable:', d);
      if (!d) {
        lastSequence = null;
        resumeGatewayUrl = null;
        sessionId = null;
      }
      post({ type: 'invalidSession', resumable: !!d });
      setTimeout(() => {
        if (d && sessionId) {
          sendResume();
        } else {
          sendIdentify();
        }
      }, 1000 + Math.random() * 4000);
      break;

    case GatewayOp.HEARTBEAT_ACK:
      heartbeatAcked = true;
      break;

    default:
      log(`Unhandled opcode: ${op}`);
  }
}

// ─── Hello / Identify / Resume ─────────────────────────────────

function handleHello(data: any) {
  const { heartbeat_interval } = data;
  log(`HELLO received, heartbeat interval: ${heartbeat_interval}ms`);

  startHeartbeat(heartbeat_interval);

  if (sessionId && lastSequence !== null) {
    sendResume();
  } else {
    sendIdentify();
  }
}

function sendIdentify() {
  log('Sending IDENTIFY');
  send({
    op: GatewayOp.IDENTIFY,
    d: {
      token,
      capabilities: CAPABILITIES,
      properties: IDENTIFY_PROPERTIES,
      client_state: {
        guild_versions: {},
      },
    },
  });
}

function sendResume() {
  log(`Sending RESUME (session: ${sessionId})`);
  send({
    op: GatewayOp.RESUME,
    d: {
      token,
      session_id: sessionId,
      seq: lastSequence,
    },
  });
}

// ─── Heartbeat ─────────────────────────────────────────────────

function startHeartbeat(intervalMs: number) {
  stopHeartbeat();
  heartbeatAcked = true;

  const jitter = Math.random();
  setTimeout(() => {
    sendHeartbeat();

    heartbeatInterval = setInterval(() => {
      if (!heartbeatAcked) {
        warn('Heartbeat not ACKed, reconnecting...');
        ws?.close(4009, 'Heartbeat timeout');
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
  send({ op: GatewayOp.HEARTBEAT, d: lastSequence });
}

// ─── Reconnect ─────────────────────────────────────────────────

function reconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    warn('Max reconnect attempts reached');
    post({ type: 'maxReconnect' });
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;

  log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

  setTimeout(() => {
    connect();
  }, delay);
}

// ─── Worker Entry Point ────────────────────────────────────────

self.onmessage = (event: MessageEvent<MainToWorker>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'connect':
      token = msg.token;
      if (msg.bufferedMessages && msg.bufferedMessages.length > 0) {
        // Fast-connect: WS lives on the main thread, we proxy messages
        proxied = true;
        resetInflate();
        log(`Replaying ${msg.bufferedMessages.length} fast-connect messages`);
        for (const raw of msg.bufferedMessages) {
          try {
            const payload = decompressMessage(raw);
            if (!payload) continue; // partial chunk
            // Skip HELLO — the fast-connect script already handled it and sent IDENTIFY
            if (payload.op === GatewayOp.HELLO) {
              // Still need to start heartbeat from the HELLO interval
              startHeartbeat(payload.d.heartbeat_interval);
              continue;
            }
            handleMessage(payload);
          } catch (e) {
            warn('Failed to parse fast-connect message:', e);
          }
        }
        post({ type: 'connectionState', connected: true });
        log('Fast-connect replay done, proxying via main thread WS');
      } else {
        connect();
      }
      break;

    case 'wsMessage':
      // Forwarded binary message from the fast-connect WS on the main thread
      try {
        const payload = decompressMessage(msg.data);
        if (payload) handleMessage(payload);
      } catch (e) {
        warn('Failed to parse proxied WS message:', e);
      }
      break;

    case 'disconnect':
      proxied = false;
      disconnect();
      break;

    case 'send':
      send(msg.data);
      break;
  }
};
