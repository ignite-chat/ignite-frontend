import { useDiscordStore } from '../store/discord.store';
import { useDiscordVoiceStore } from '../store/discord-voice.store';
import { DiscordGatewayService } from './discord-gateway.service';
import { DaveSession } from './discord-dave';

// Voice Gateway Opcodes
const VoiceOp = {
  IDENTIFY: 0,
  SELECT_PROTOCOL: 1,
  READY: 2,
  HEARTBEAT: 3,
  SESSION_DESCRIPTION: 4,
  SPEAKING: 5,
  HEARTBEAT_ACK: 6,
  RESUME: 7,
  HELLO: 8,
  RESUMED: 9,
  CLIENT_DISCONNECT: 13,
  MEDIA_SINK_WANTS: 15,
  CLIENT_FLAGS: 16,
  // DAVE E2EE opcodes
  DAVE_MLS_EXTERNAL_SENDER: 20,
  DAVE_MLS_KEY_PACKAGE: 21,
  DAVE_MLS_PROPOSALS: 22,
  DAVE_MLS_COMMIT_WELCOME: 23,
  DAVE_PREPARE_TRANSITION: 24,
  DAVE_EXECUTE_TRANSITION: 25,
  DAVE_PREPARE_EPOCH: 26,
  DAVE_MLS_INVALID_COMMIT_WELCOME: 27,
} as const;

export const DiscordVoiceService = {
  // Voice gateway WebSocket
  voiceWs: null as WebSocket | null,
  voiceHeartbeatInterval: null as ReturnType<typeof setInterval> | null,
  voiceHeartbeatAcked: true,
  voiceHeartbeatNonce: 0,
  voiceSeqAck: -1,

  // WebRTC
  peerConnection: null as RTCPeerConnection | null,
  localStream: null as MediaStream | null,

  // State for voice server handshake
  pendingVoiceState: null as { session_id: string } | null,
  pendingVoiceServer: null as { token: string; guild_id: string; endpoint: string } | null,
  ssrc: 0,
  rtcConnectionId: crypto.randomUUID(),

  // Remote audio elements for playback
  remoteAudioElements: new Map<string, HTMLAudioElement>(),

  // DAVE E2EE session
  daveSession: null as DaveSession | null,

  /**
   * Join a Discord voice channel.
   * Sends Op 4 to the main gateway and waits for VOICE_STATE_UPDATE + VOICE_SERVER_UPDATE.
   */
  async joinVoiceChannel(
    guildId: string,
    channelId: string,
    channelName: string,
    guildName: string,
  ) {
    const store = useDiscordVoiceStore.getState();

    // Already in this channel
    if (store.channelId === channelId && store.connectionState !== 'disconnected') {
      return;
    }

    // Leave current channel first
    if (store.connectionState !== 'disconnected') {
      await this.leaveVoiceChannel();
    }

    store.setConnectionState('connecting');
    store.setChannel(guildId, channelId, channelName, guildName);

    // Reset pending handshake state
    this.pendingVoiceState = null;
    this.pendingVoiceServer = null;
    this.rtcConnectionId = crypto.randomUUID();

    // Send Op 4 (VOICE_STATE_UPDATE) to main gateway
    DiscordGatewayService.send({
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: channelId,
        self_mute: store.isMuted,
        self_deaf: store.isDeafened,
      },
    });
  },

  /**
   * Leave the current voice channel.
   */
  async leaveVoiceChannel() {
    const store = useDiscordVoiceStore.getState();
    const { guildId, connectionState } = store;

    // Send Op 4 to leave (channel_id: null) — only if we have an active connection
    if (guildId && connectionState !== 'force_disconnected') {
      DiscordGatewayService.send({
        op: 4,
        d: {
          guild_id: guildId,
          channel_id: null,
          self_mute: false,
          self_deaf: false,
        },
      });
    }

    this._cleanup();
    store.reset();
  },

  /**
   * Toggle self-mute.
   */
  toggleMute() {
    const store = useDiscordVoiceStore.getState();
    const newMuted = !store.isMuted;
    store.setMuted(newMuted);

    // Unmuting while deafened → also undeafen
    if (!newMuted && store.isDeafened) {
      store.setDeafened(false);
    }

    // Update on gateway
    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: 4,
        d: {
          guild_id: store.guildId,
          channel_id: store.channelId,
          self_mute: newMuted,
          self_deaf: !newMuted ? false : store.isDeafened,
        },
      });
    }

    // Mute/unmute local audio track
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !newMuted && !(!newMuted ? false : store.isDeafened);
      }
    }
  },

  /**
   * Toggle self-deafen.
   */
  toggleDeafen() {
    const store = useDiscordVoiceStore.getState();
    const newDeafened = !store.isDeafened;
    store.setDeafened(newDeafened);

    // Deafening → also mute
    if (newDeafened) {
      store.setMuted(true);
    }

    // Update on gateway
    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: 4,
        d: {
          guild_id: store.guildId,
          channel_id: store.channelId,
          self_mute: newDeafened ? true : store.isMuted,
          self_deaf: newDeafened,
        },
      });
    }

    // Mute/unmute local audio
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !newDeafened && !store.isMuted;
      }
    }

    // Mute/unmute remote audio
    this.remoteAudioElements.forEach((el) => {
      el.muted = newDeafened;
    });
  },

  // ─── Gateway Event Handlers ──────────────────────────────────────

  /**
   * Called from the main gateway when VOICE_STATE_UPDATE is for our own user.
   * Provides the session_id needed for voice gateway identify.
   */
  handleVoiceStateUpdate(data: any) {
    const currentUser = useDiscordStore.getState().user;
    if (!currentUser || data.user_id !== currentUser.id) return;

    const store = useDiscordVoiceStore.getState();
    if (store.connectionState !== 'connecting') return;

    this.pendingVoiceState = { session_id: data.session_id };
    this._tryConnect();
  },

  /**
   * Called from the main gateway when VOICE_SERVER_UPDATE is received.
   * Provides the token and endpoint for the voice gateway.
   */
  handleVoiceServerUpdate(data: any) {
    const store = useDiscordVoiceStore.getState();
    if (store.connectionState !== 'connecting') return;
    if (data.guild_id !== store.guildId) return;

    this.pendingVoiceServer = {
      token: data.token,
      guild_id: data.guild_id,
      endpoint: data.endpoint,
    };
    this._tryConnect();
  },

  // ─── Voice Gateway Connection ────────────────────────────────────

  /**
   * Attempt to connect once we have both VOICE_STATE_UPDATE and VOICE_SERVER_UPDATE.
   */
  _tryConnect() {
    if (!this.pendingVoiceState || !this.pendingVoiceServer) return;

    const { session_id } = this.pendingVoiceState;
    const { token, guild_id, endpoint } = this.pendingVoiceServer;
    const user = useDiscordStore.getState().user;
    const channelId = useDiscordVoiceStore.getState().channelId;

    if (!user || !channelId) return;

    this._connectVoiceGateway(endpoint, guild_id, channelId, user.id, session_id, token);
  },

  /**
   * Open a WebSocket to the Discord voice gateway.
   */
  _connectVoiceGateway(
    endpoint: string,
    serverId: string,
    channelId: string,
    userId: string,
    sessionId: string,
    token: string,
  ) {
    this._disconnectVoiceGateway();

    const url = `wss://${endpoint}/?v=9`;
    console.log(`[Discord Voice] Connecting to voice gateway: ${url}`);

    this.voiceWs = new WebSocket(url);
    this.voiceWs.binaryType = 'arraybuffer';

    this.voiceWs.onopen = () => {
      console.log('[Discord Voice] Voice gateway connected');
    };

    this.voiceWs.onmessage = (event) => {
      try {
        const data = event.data;
        console.log('[Discord Voice] Raw message type:', typeof data, 'constructor:', data?.constructor?.name, 'instanceof ArrayBuffer:', data instanceof ArrayBuffer, 'byteLength:', data?.byteLength, 'length:', data?.length);

        let parsed;
        if (data instanceof ArrayBuffer) {
          const buffer: ArrayBuffer = data;
          if (buffer.byteLength < 1) return;

          const view = new Uint8Array(buffer);
          const relativeOp = view[0];
          const op = VoiceOp.DAVE_MLS_EXTERNAL_SENDER + relativeOp;
          const d = new Uint8Array(buffer, 1);

          console.log(`[Discord Voice] Binary DAVE message: relative op ${relativeOp}, absolute op ${op}, ${d.byteLength} bytes, first bytes: [${view.slice(0, 8).join(', ')}]`);
          parsed = { op, d };
        } else if (typeof data === 'string') {
          parsed = JSON.parse(data);
        } else {
          // Unknown type — log details and try to handle
          console.warn('[Discord Voice] Unknown message data type:', Object.prototype.toString.call(data), data);
          // Try treating as ArrayBuffer-like (e.g., Buffer in Node/Electron)
          if (data?.buffer instanceof ArrayBuffer) {
            const buffer = data.buffer;
            const offset = data.byteOffset || 0;
            const view = new Uint8Array(buffer, offset, data.byteLength);
            const relativeOp = view[0];
            const op = VoiceOp.DAVE_MLS_EXTERNAL_SENDER + relativeOp;
            const d = new Uint8Array(buffer, offset + 1, data.byteLength - 1);
            console.log(`[Discord Voice] Buffer-like DAVE message: relative op ${relativeOp}, absolute op ${op}, ${d.byteLength} bytes`);
            parsed = { op, d };
          } else {
            return;
          }
        }
        this._handleVoiceMessage(parsed, serverId, channelId, userId, sessionId, token);
      } catch (err) {
        console.warn('[Discord Voice] Failed to parse voice message:', err);
      }
    };

    this.voiceWs.onclose = (event) => {
      console.log(`[Discord Voice] Voice gateway closed: ${event.code} ${event.reason}`);
      this._stopVoiceHeartbeat();

      const store = useDiscordVoiceStore.getState();
      if (store.connectionState === 'connected' || store.connectionState === 'connecting') {
        // Unexpected / forced disconnect — clean up resources but keep channel info
        this._cleanupConnection();
        store.setConnectionState('force_disconnected');
      }
    };

    this.voiceWs.onerror = (error) => {
      console.error('[Discord Voice] Voice gateway error:', error);
    };
  },

  /**
   * Handle an incoming voice gateway message.
   */
  async _handleVoiceMessage(
    payload: any,
    serverId: string,
    channelId: string,
    userId: string,
    sessionId: string,
    token: string,
  ) {
    const { op, d, seq } = payload;
    // Track sequence number for heartbeat seq_ack
    if (typeof seq === 'number' && seq > this.voiceSeqAck) {
      this.voiceSeqAck = seq;
    }
    console.log('[Discord Voice] Processing opcode:', op, 'seq:', seq, 'daveSession:', !!this.daveSession);

    switch (op) {
      case VoiceOp.HELLO:
        console.log('[Discord Voice] HELLO received');

        // Send Identify BEFORE starting heartbeat — voice gateway
        // rejects heartbeats (4003) until authenticated.
        this._sendVoice(VoiceOp.IDENTIFY, {
          server_id: serverId,
          user_id: userId,
          session_id: sessionId,
          channel_id: channelId,
          token,
          video: false,
          streams: [{ type: 'video', rid: '100', quality: 100 }],
          max_dave_protocol_version: 1,
        });

        // Send client flags (Op 16)
        this._sendVoice(VoiceOp.CLIENT_FLAGS, {});

        this._startVoiceHeartbeat(d.heartbeat_interval);
        break;

      case VoiceOp.READY: {
        console.log('[Discord Voice] READY received, ssrc:', d.ssrc, 'full READY data:', JSON.stringify(d));
        this.ssrc = d.ssrc;

        // Initialize DAVE session if the server supports it
        console.log('[Discord Voice] dave_protocol_version:', d.dave_protocol_version, typeof d.dave_protocol_version);
        // Always create DAVE session — it's required by Discord
        console.log('[Discord Voice] Creating DAVE session...');
        this.daveSession = new DaveSession();
        try {
          await this.daveSession.initialize(userId);
          console.log('[Discord Voice] DAVE session initialized, key pairs ready');
        } catch (err) {
          console.error('[Discord Voice] DAVE initialize failed:', err);
          this.daveSession = null;
        }

        this._setupWebRTC(d);
        break;
      }

      case VoiceOp.SESSION_DESCRIPTION:
        console.log('[Discord Voice] SESSION_DESCRIPTION received');
        this._handleSessionDescription(d);
        break;

      case VoiceOp.HEARTBEAT_ACK:
        this.voiceHeartbeatAcked = true;
        break;

      case VoiceOp.SPEAKING:
        // Other user speaking state change — no action needed
        break;

      case VoiceOp.RESUMED:
        console.log('[Discord Voice] Voice session resumed');
        break;

      case VoiceOp.CLIENT_FLAGS:
        // Server acknowledges client flags — no action needed
        break;

      case VoiceOp.MEDIA_SINK_WANTS:
        // Server indicates which media SSRCs it wants — no action needed for audio-only
        break;

      // ─── DAVE E2EE Opcodes ──────────────────────────────────────

      case VoiceOp.DAVE_MLS_EXTERNAL_SENDER:
        this._handleDaveExternalSender(d);
        break;

      case VoiceOp.DAVE_MLS_PROPOSALS:
        if (this.daveSession) {
          this.daveSession.handleProposals(d);
        }
        break;

      case VoiceOp.DAVE_MLS_COMMIT_WELCOME:
        this._handleDaveCommitWelcome(d);
        break;

      case VoiceOp.DAVE_PREPARE_TRANSITION:
        this._handleDavePrepareTransition(d);
        break;

      case VoiceOp.DAVE_EXECUTE_TRANSITION:
        if (this.daveSession) {
          this.daveSession.handleExecuteTransition(d);
        }
        break;

      case VoiceOp.DAVE_MLS_INVALID_COMMIT_WELCOME:
        console.warn('[Discord Voice] DAVE invalid commit/welcome:', d);
        break;

      default:
        console.log(`[Discord Voice] Unhandled voice opcode: ${op}`, d);
    }
  },

  // ─── DAVE Handlers ──────────────────────────────────────────────

  async _handleDaveExternalSender(d: Uint8Array) {
    if (!this.daveSession) return;

    try {
      const keyPackage = await this.daveSession.handleExternalSender(d);

      // Send our key package back as binary (Op 21)
      this._sendDaveBinary(VoiceOp.DAVE_MLS_KEY_PACKAGE, keyPackage);
    } catch (err) {
      console.error('[Discord Voice] DAVE external sender handling failed:', err);
    }
  },

  async _handleDaveCommitWelcome(d: Uint8Array) {
    if (!this.daveSession) return;

    try {
      await this.daveSession.handleCommitWelcome(d);

      // Set up encoded transforms now that we have keys
      if (this.daveSession.state === 'ready' && this.peerConnection) {
        this.daveSession.setupEncodedTransforms(this.peerConnection);
      }
    } catch (err) {
      console.error('[Discord Voice] DAVE commit/welcome handling failed:', err);
    }
  },

  _handleDavePrepareTransition(d: any) {
    if (!this.daveSession) return;

    try {
      const result = this.daveSession.handlePrepareTransition(d);

      // Acknowledge the prepare (Op 26)
      this._sendVoice(VoiceOp.DAVE_PREPARE_EPOCH, {
        epoch: result.epoch,
      });
    } catch (err) {
      console.error('[Discord Voice] DAVE prepare transition failed:', err);
    }
  },

  /** Decode DAVE binary data from voice gateway JSON payload. */
  _decodeDAVEBinary(d: any): Uint8Array {
    if (d instanceof Uint8Array) return d;
    if (d?.data && Array.isArray(d.data)) return new Uint8Array(d.data);
    if (typeof d === 'string') {
      // Base64 encoded
      const binary = atob(d);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    if (Array.isArray(d)) return new Uint8Array(d);
    // If it's an object with specific fields, extract the relevant binary data
    if (d?.key_package) return this._decodeDAVEBinary(d.key_package);
    if (d?.commit) return this._decodeDAVEBinary(d.commit);
    if (d?.welcome) return this._decodeDAVEBinary(d.welcome);
    return new Uint8Array(0);
  },

  /** Encode binary data for DAVE voice gateway payloads. */
  _encodeDAVEBinary(data: Uint8Array): string {
    // Base64 encode for JSON transport
    let binary = '';
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    return btoa(binary);
  },

  // ─── WebRTC ──────────────────────────────────────────────────────

  /**
   * Set up the WebRTC peer connection after receiving Ready from the voice gateway.
   */
  async _setupWebRTC(_readyData: any) {
    try {
      // Get microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const store = useDiscordVoiceStore.getState();

      // Apply current mute state
      if (store.isMuted || store.isDeafened) {
        for (const track of this.localStream.getAudioTracks()) {
          track.enabled = false;
        }
      }

      // Create peer connection (enable encoded insertable streams for DAVE E2EE)
      this.peerConnection = new RTCPeerConnection({
        bundlePolicy: 'max-bundle',
        // @ts-ignore - encodedInsertableStreams is a Chrome/Electron API
        encodedInsertableStreams: !!this.daveSession,
      });

      // Handle remote tracks (incoming audio from other users)
      this.peerConnection.ontrack = (event) => {
        console.log('[Discord Voice] Remote track received:', event.track.kind);
        if (event.track.kind === 'audio') {
          const audio = new Audio();
          audio.srcObject = event.streams[0] || new MediaStream([event.track]);
          audio.autoplay = true;
          audio.muted = store.isDeafened;
          this.remoteAudioElements.set(event.track.id, audio);

          event.track.onended = () => {
            const el = this.remoteAudioElements.get(event.track.id);
            if (el) {
              el.pause();
              el.srcObject = null;
            }
            this.remoteAudioElements.delete(event.track.id);
          };
        }
      };

      // Add local audio track as sendrecv transceiver
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnection.addTransceiver(audioTrack, { direction: 'sendrecv' });
      }

      // Create offer
      const offer = await this.peerConnection.createOffer();

      // Modify SDP to use Discord's assigned SSRC
      let sdp = offer.sdp || '';
      sdp = this._modifySdpSsrc(sdp, this.ssrc);

      const modifiedOffer = new RTCSessionDescription({ type: 'offer', sdp });
      await this.peerConnection.setLocalDescription(modifiedOffer);

      // Send Select Protocol with WebRTC SDP
      this._sendVoice(VoiceOp.SELECT_PROTOCOL, {
        protocol: 'webrtc',
        data: sdp,
        sdp,
        codecs: [{ name: 'opus', type: 'audio', priority: 1000, payload_type: 111 }],
        rtc_connection_id: this.rtcConnectionId,
      });
    } catch (err) {
      console.error('[Discord Voice] WebRTC setup failed:', err);
      this._cleanup();
      useDiscordVoiceStore.getState().reset();
    }
  },

  /**
   * Replace auto-generated SSRCs in the SDP with Discord's assigned SSRC.
   */
  _modifySdpSsrc(sdp: string, ssrc: number): string {
    const lines = sdp.split('\r\n');
    const result: string[] = [];

    for (const line of lines) {
      if (line.startsWith('a=ssrc:')) {
        const oldSsrc = line.split(':')[1].split(' ')[0];
        result.push(line.replace(`a=ssrc:${oldSsrc}`, `a=ssrc:${ssrc}`));
      } else if (line.startsWith('a=ssrc-group:')) {
        // Replace all SSRC references in the group line
        const parts = line.split(' ');
        const prefix = parts.slice(0, 1).join(' ');
        const ssrcCount = parts.length - 1;
        result.push(`${prefix} ${Array(ssrcCount).fill(ssrc).join(' ')}`);
      } else {
        result.push(line);
      }
    }

    return result.join('\r\n');
  },

  /**
   * Handle the Session Description response — set the remote SDP answer.
   *
   * Discord's voice gateway returns a non-standard SDP with a custom
   * `ICE/SDP` protocol in the m-line. We need to construct a proper
   * WebRTC SDP answer from the server's ICE/DTLS info + our local
   * offer's codec parameters.
   */
  async _handleSessionDescription(data: any) {
    if (!this.peerConnection) return;

    try {
      const rawSdp: string = data.sdp || '';
      const localSdp = this.peerConnection.localDescription?.sdp || '';

      // Extract server-provided ICE/DTLS info from Discord's non-standard SDP
      const iceUfrag = rawSdp.match(/a=ice-ufrag:(\S+)/)?.[1] || '';
      const icePwd = rawSdp.match(/a=ice-pwd:(\S+)/)?.[1] || '';
      const fingerprint = rawSdp.match(/a=fingerprint:(\S+ \S+)/)?.[1] || '';
      const candidates = [...rawSdp.matchAll(/a=candidate:(.+)/g)].map((m) => m[1]);
      const connectionLine = rawSdp.match(/c=IN IP4 (\S+)/)?.[0] || 'c=IN IP4 0.0.0.0';

      // Extract port from m=audio line
      const port = rawSdp.match(/m=audio (\d+)/)?.[1] || '9';

      // Extract codec info from our local offer to mirror in the answer.
      // We need the payload types, rtpmap, and fmtp lines.
      const localPayloadTypes: string[] = [];
      const localCodecLines: string[] = [];
      for (const line of localSdp.split('\r\n')) {
        if (line.startsWith('a=rtpmap:') || line.startsWith('a=fmtp:') || line.startsWith('a=rtcp-fb:')) {
          localCodecLines.push(line);
          const pt = line.match(/^a=rtpmap:(\d+)/)?.[1];
          if (pt && !localPayloadTypes.includes(pt)) localPayloadTypes.push(pt);
        }
      }

      // If no codec lines found, default to opus
      if (localPayloadTypes.length === 0) {
        localPayloadTypes.push('111');
        localCodecLines.push('a=rtpmap:111 opus/48000/2');
        localCodecLines.push('a=fmtp:111 minptime=10;useinbandfec=1');
      }

      const fmtList = localPayloadTypes.join(' ');

      // Build a proper SDP answer
      const answerLines = [
        'v=0',
        'o=- 0 0 IN IP4 0.0.0.0',
        's=-',
        't=0 0',
        'a=group:BUNDLE 0',
        'a=msid-semantic: WMS *',
        `m=audio ${port} UDP/TLS/RTP/SAVPF ${fmtList}`,
        connectionLine,
        `a=rtcp:${port}`,
        `a=ice-ufrag:${iceUfrag}`,
        `a=ice-pwd:${icePwd}`,
        `a=fingerprint:${fingerprint}`,
        'a=setup:active',
        'a=mid:0',
        'a=sendrecv',
        'a=rtcp-mux',
        ...localCodecLines,
        ...candidates.map((c) => `a=candidate:${c}`),
        '',
      ];

      const sdp = answerLines.join('\r\n');
      console.log('[Discord Voice] Setting constructed SDP answer');

      const answer = new RTCSessionDescription({ type: 'answer', sdp });
      await this.peerConnection.setRemoteDescription(answer);

      console.log('[Discord Voice] WebRTC connection established');
      useDiscordVoiceStore.getState().setConnectionState('connected');

      // Announce that we're speaking (microphone source)
      this._sendVoice(VoiceOp.SPEAKING, {
        speaking: 1,
        delay: 0,
        ssrc: this.ssrc,
      });
    } catch (err) {
      console.error('[Discord Voice] Failed to set remote description:', err);
      console.error('[Discord Voice] Raw SDP from server:', data.sdp);
      this._cleanup();
      useDiscordVoiceStore.getState().reset();
    }
  },

  // ─── Voice Gateway Utilities ─────────────────────────────────────

  _sendVoice(op: number, d: any) {
    if (this.voiceWs && this.voiceWs.readyState === WebSocket.OPEN) {
      this.voiceWs.send(JSON.stringify({ op, d }));
    }
  },

  /** Send a DAVE binary frame: 1 byte relative opcode + raw payload */
  _sendDaveBinary(absoluteOp: number, payload: Uint8Array) {
    if (!this.voiceWs || this.voiceWs.readyState !== WebSocket.OPEN) return;
    const relativeOp = absoluteOp - VoiceOp.DAVE_MLS_EXTERNAL_SENDER;
    const frame = new Uint8Array(1 + payload.length);
    frame[0] = relativeOp;
    frame.set(payload, 1);
    this.voiceWs.send(frame.buffer);
  },

  _startVoiceHeartbeat(intervalMs: number) {
    this._stopVoiceHeartbeat();
    this.voiceHeartbeatAcked = true;
    this.voiceHeartbeatNonce = 0;

    // First heartbeat after jitter (like main gateway), then regular interval
    const jitter = Math.random();
    setTimeout(() => {
      this._sendVoiceHeartbeat();

      this.voiceHeartbeatInterval = setInterval(() => {
        if (!this.voiceHeartbeatAcked) {
          console.warn('[Discord Voice] Voice heartbeat not ACKed, closing');
          this.voiceWs?.close(4009, 'Voice heartbeat timeout');
          return;
        }
        this._sendVoiceHeartbeat();
      }, intervalMs);
    }, intervalMs * jitter);
  },

  _stopVoiceHeartbeat() {
    if (this.voiceHeartbeatInterval) {
      clearInterval(this.voiceHeartbeatInterval);
      this.voiceHeartbeatInterval = null;
    }
  },

  _sendVoiceHeartbeat() {
    this.voiceHeartbeatAcked = false;
    this.voiceHeartbeatNonce++;
    this._sendVoice(VoiceOp.HEARTBEAT, {
      t: Date.now(),
      seq_ack: this.voiceSeqAck,
    });
  },

  _disconnectVoiceGateway() {
    this._stopVoiceHeartbeat();
    if (this.voiceWs) {
      this.voiceWs.close(1000, 'Intentional disconnect');
      this.voiceWs = null;
    }
  },

  // ─── Cleanup ─────────────────────────────────────────────────────

  /** Clean up connection resources (WebRTC, audio, DAVE) but keep store state */
  _cleanupConnection() {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Clean up remote audio elements
    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
    });
    this.remoteAudioElements.clear();

    // Reset internal state
    this.pendingVoiceState = null;
    this.pendingVoiceServer = null;
    this.ssrc = 0;
    this.voiceSeqAck = -1;

    // Destroy DAVE session
    if (this.daveSession) {
      this.daveSession.destroy();
      this.daveSession = null;
    }
  },

  /** Full cleanup including voice gateway disconnect */
  _cleanup() {
    this._disconnectVoiceGateway();
    this._cleanupConnection();
  },
};
