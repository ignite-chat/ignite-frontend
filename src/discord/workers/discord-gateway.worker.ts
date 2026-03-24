/**
 * Discord Gateway Web Worker
 *
 * Runs the gateway WebSocket + heartbeat on a separate thread so that
 * main-thread lag (React rendering, etc.) cannot cause missed heartbeats
 * and gateway disconnections.
 *
 * Communication with main thread via postMessage.
 */

import { GatewayOp } from '../constants/gateway-opcodes';

// ─── Types ─────────────────────────────────────────────────────

/** Messages the main thread sends to this worker */
type MainToWorker =
  | { type: 'connect'; token: string; bufferedMessages?: string[] }
  | { type: 'disconnect' }
  | { type: 'send'; data: any }
  | { type: 'wsMessage'; data: string }; // forwarded from fast-connect WS on main thread

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

const GATEWAY_URL = 'wss://gateway.discord.gg/?encoding=json&v=9&compress=none';

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

  ws = new WebSocket(url);

  ws.onopen = () => {
    log('WebSocket connected');
    reconnectAttempts = 0;
  };

  ws.onmessage = (event) => {
    handleMessage(JSON.parse(event.data));
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
        log(`Replaying ${msg.bufferedMessages.length} fast-connect messages`);
        for (const raw of msg.bufferedMessages) {
          try {
            const payload = JSON.parse(raw);
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
      // Forwarded message from the fast-connect WS on the main thread
      try {
        handleMessage(JSON.parse(msg.data));
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
