/**
 * Discord Gateway Connection — runs on the main thread.
 *
 * Handles WebSocket connection, heartbeat, identify/resume, and reconnection
 * for a single Discord account.
 */

import { GatewayOp } from '../constants/gateway-opcodes';

// ─── Constants ─────────────────────────────────────────────────

const GATEWAY_URL = 'wss://gateway.discord.gg/?encoding=json&v=9';

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
};

const CAPABILITIES = 1734653;
const MAX_RECONNECT_ATTEMPTS = 10;

export type GatewayEvent =
  | { type: 'dispatch'; eventName: string; data: any }
  | { type: 'connectionState'; connected: boolean }
  | { type: 'sessionInfo'; sessionId: string; resumeGatewayUrl: string | null }
  | { type: 'invalidSession'; resumable: boolean }
  | { type: 'authFailed' }
  | { type: 'maxReconnect' };

export class GatewayConnection {
  private token: string;
  private onEvent: (event: GatewayEvent) => void;

  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatAcked = true;
  private lastSequence: number | null = null;
  private resumeGatewayUrl: string | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;

  private tag: string;

  constructor(token: string, onEvent: (event: GatewayEvent) => void) {
    this.token = token;
    this.onEvent = onEvent;
    this.tag = token.slice(-4);
  }

  // ─── Public API ──────────────────────────────────────────────

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.intentionalClose = false;
    this._connect();
  }

  disconnect() {
    this.intentionalClose = true;
    this._stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
    this.lastSequence = null;
    this.resumeGatewayUrl = null;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.onEvent({ type: 'connectionState', connected: false });
  }

  send(data: any) {
    const json = JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(json);
    }
  }

  // ─── Connection ──────────────────────────────────────────────

  private _connect() {
    const url = this.resumeGatewayUrl || GATEWAY_URL;
    console.log(`[Discord Gateway] Connecting to ${url}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[Discord Gateway:${this.tag}] WebSocket connected`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.op === GatewayOp.DISPATCH) {
          console.log(`[Discord Gateway:${this.tag}] DISPATCH ${payload.t}`);
        }
        this._handleMessage(payload);
      } catch (e) {
        console.warn(`[Discord Gateway:${this.tag}] Failed to parse message:`, e);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[Discord Gateway:${this.tag}] WebSocket closed: ${event.code} ${event.reason}`);
      this._stopHeartbeat();
      this.onEvent({ type: 'connectionState', connected: false });

      if (event.code === 4004) {
        this.onEvent({ type: 'authFailed' });
        return;
      }

      if (!this.intentionalClose) {
        this._reconnect();
      }
    };

    this.ws.onerror = () => {
      console.warn('[Discord Gateway] WebSocket error');
    };
  }

  private _reconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[Discord Gateway] Max reconnect attempts reached');
      this.onEvent({ type: 'maxReconnect' });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[Discord Gateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this._connect();
    }, delay);
  }

  // ─── Message Handling ────────────────────────────────────────

  private _handleMessage(payload: any) {
    const { op, d, s, t } = payload;

    if (s !== null && s !== undefined) {
      this.lastSequence = s;
    }

    switch (op) {
      case GatewayOp.HELLO:
        this._handleHello(d);
        break;

      case GatewayOp.DISPATCH:
        if (t === 'READY') {
          this.sessionId = d.session_id;
          if (d.resume_gateway_url) {
            this.resumeGatewayUrl = d.resume_gateway_url;
          }
          this.onEvent({
            type: 'sessionInfo',
            sessionId: d.session_id,
            resumeGatewayUrl: d.resume_gateway_url || null,
          });
          this.onEvent({ type: 'connectionState', connected: true });
        }
        if (t === 'RESUMED') {
          this.onEvent({ type: 'connectionState', connected: true });
        }
        this.onEvent({ type: 'dispatch', eventName: t, data: d });
        break;

      case GatewayOp.HEARTBEAT:
        this._sendHeartbeat();
        break;

      case GatewayOp.RECONNECT:
        console.log('[Discord Gateway] Server requested reconnect');
        this.ws?.close(4000, 'Reconnect requested');
        break;

      case GatewayOp.INVALID_SESSION:
        console.log('[Discord Gateway] Invalid session, resumable:', d);
        if (!d) {
          this.lastSequence = null;
          this.resumeGatewayUrl = null;
          this.sessionId = null;
        }
        this.onEvent({ type: 'invalidSession', resumable: !!d });
        setTimeout(() => {
          if (d && this.sessionId) {
            this._sendResume();
          } else {
            this._sendIdentify();
          }
        }, 1000 + Math.random() * 4000);
        break;

      case GatewayOp.HEARTBEAT_ACK:
        this.heartbeatAcked = true;
        break;

      default:
        console.log(`[Discord Gateway] Unhandled opcode: ${op}`);
    }
  }

  // ─── Hello / Identify / Resume ───────────────────────────────

  private _handleHello(data: any) {
    const { heartbeat_interval } = data;
    console.log(`[Discord Gateway] HELLO received, heartbeat interval: ${heartbeat_interval}ms`);

    this._startHeartbeat(heartbeat_interval);

    if (this.sessionId && this.lastSequence !== null) {
      this._sendResume();
    } else {
      this._sendIdentify();
    }
  }

  private _sendIdentify() {
    console.log('[Discord Gateway] Sending IDENTIFY');
    this.send({
      op: GatewayOp.IDENTIFY,
      d: {
        token: this.token,
        capabilities: CAPABILITIES,
        properties: { ...IDENTIFY_PROPERTIES, client_launch_id: crypto.randomUUID() },
        client_state: {
          guild_versions: {},
        },
      },
    });
  }

  private _sendResume() {
    console.log(`[Discord Gateway] Sending RESUME (session: ${this.sessionId})`);
    this.send({
      op: GatewayOp.RESUME,
      d: {
        token: this.token,
        session_id: this.sessionId,
        seq: this.lastSequence,
      },
    });
  }

  // ─── Heartbeat ───────────────────────────────────────────────

  private _startHeartbeat(intervalMs: number) {
    this._stopHeartbeat();
    this.heartbeatAcked = true;

    const jitter = Math.random();
    setTimeout(() => {
      this._sendHeartbeat();

      this.heartbeatInterval = setInterval(() => {
        if (!this.heartbeatAcked) {
          console.warn('[Discord Gateway] Heartbeat not ACKed, reconnecting...');
          this.ws?.close(4009, 'Heartbeat timeout');
          return;
        }
        this._sendHeartbeat();
      }, intervalMs);
    }, intervalMs * jitter);
  }

  private _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private _sendHeartbeat() {
    this.heartbeatAcked = false;
    this.send({ op: GatewayOp.HEARTBEAT, d: this.lastSequence });
  }
}
