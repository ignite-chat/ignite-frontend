import { useDiscordStore } from '../store/discord.store';
import { useDiscordVoiceStore } from '../store/discord-voice.store';
import { DiscordGatewayService } from './discord-gateway.service';
import { DaveSession } from './discord-dave';

// Voice Gateway Opcodes (per protocol.md)
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
  CLIENTS_CONNECT: 11,
  CLIENT_DISCONNECT: 13,
  MEDIA_SINK_WANTS: 15,
  CLIENT_FLAGS: 16,
  CLIENT_PLATFORM: 18,        // server→client: { user_id, platform, flags }
  VOICE_BACKEND_VERSION: 20,  // server→client: { user_id, platform }
  // DAVE E2EE opcodes (per protocol.md section "Voice Gateway Opcodes")
  DAVE_PROTOCOL_PREPARE_TRANSITION: 21,  // JSON, server→client
  DAVE_PROTOCOL_EXECUTE_TRANSITION: 22,  // JSON, server→client
  DAVE_PROTOCOL_READY_FOR_TRANSITION: 23, // JSON, client→server
  DAVE_PROTOCOL_PREPARE_EPOCH: 24,       // JSON, server→client
  DAVE_MLS_EXTERNAL_SENDER_PACKAGE: 25,  // Binary, server→client
  DAVE_MLS_KEY_PACKAGE: 26,              // Binary, client→server
  DAVE_MLS_PROPOSALS: 27,               // Binary, server→client
  DAVE_MLS_COMMIT_WELCOME: 28,          // Binary, client→server
  DAVE_MLS_ANNOUNCE_COMMIT_TRANSITION: 29, // Binary, server→client
  DAVE_MLS_WELCOME: 30,                 // Binary, server→client
  DAVE_MLS_INVALID_COMMIT_WELCOME: 31,  // JSON, client→server
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

  // Audio level monitoring for speaking indicators
  audioContext: null as AudioContext | null,
  audioAnalysers: new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; userId: string | null }>(),
  speakingMonitorInterval: null as ReturnType<typeof setInterval> | null,
  midToUserId: new Map<number, string>(),

  // SSRC → userId mappings from SPEAKING messages (needed for SDP construction)
  remoteSsrcs: new Map<number, string>(),

  // Number of recvonly audio transceivers created (for SDP renegotiation)
  numAudioReceivers: 10,
  numVideoReceivers: 10,

  // Cached server ICE/DTLS info from SESSION_DESCRIPTION
  serverSdpInfo: null as {
    iceUfrag: string;
    icePwd: string;
    fingerprint: string;
    candidates: string[];
    connectionLine: string;
    port: string;
  } | null,

  // Stats monitor interval
  statsMonitorInterval: null as ReturnType<typeof setInterval> | null,

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

    // Already actively connected to this channel — nothing to do
    if (store.channelId === channelId && store.connectionState === 'connected') {
      return;
    }

    // Leave/cleanup current channel first
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
    // if (this.localStream) {
    //   for (const track of this.localStream.getAudioTracks()) {
    //     track.enabled = !newDeafened && !store.isMuted;
    //   }
    // }

    // // Mute/unmute remote audio
    // this.remoteAudioElements.forEach((el) => {
    //   el.muted = newDeafened;
    // });
  },

  /**
   * Toggle fake mute — tells Discord you're muted but keeps mic active locally.
   */
  toggleFakeMute() {
    const store = useDiscordVoiceStore.getState();
    const newFakeMuted = !store.isFakeMuted;
    store.setFakeMuted(newFakeMuted);

    // Send mute state to gateway without touching local tracks
    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: 4,
        d: {
          guild_id: store.guildId,
          channel_id: store.channelId,
          self_mute: newFakeMuted || store.isMuted,
          self_deaf: store.isFakeDeafened || store.isDeafened,
        },
      });
    }
  },

  /**
   * Toggle fake deafen — tells Discord you're deafened but keeps hearing audio locally.
   */
  toggleFakeDeafen() {
    const store = useDiscordVoiceStore.getState();
    const newFakeDeafened = !store.isFakeDeafened;
    store.setFakeDeafened(newFakeDeafened);

    // Send deafen state to gateway without touching local tracks
    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: 4,
        d: {
          guild_id: store.guildId,
          channel_id: store.channelId,
          self_mute: store.isFakeMuted || store.isMuted,
          self_deaf: newFakeDeafened || store.isDeafened,
        },
      });
    }
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
          // Binary DAVE messages from server: [seq_hi, seq_lo, opcode, ...data]
          // Per protocol.md: uint16 sequence_number + uint8 opcode + payload
          const buffer: ArrayBuffer = data;
          if (buffer.byteLength < 3) return;

          const view = new Uint8Array(buffer);
          const seqNum = (view[0] << 8) | view[1];
          const op = view[2];
          const d = new Uint8Array(buffer, 3);

          console.log(`[Discord Voice] Binary DAVE message: seq=${seqNum}, op=${op}, ${d.byteLength} bytes, first bytes: [${view.slice(0, 8).join(', ')}]`);
          parsed = { op, d, seq: seqNum };
        } else if (typeof data === 'string') {
          parsed = JSON.parse(data);
        } else {
          // Unknown type — log details and try to handle
          console.warn('[Discord Voice] Unknown message data type:', Object.prototype.toString.call(data), data);
          if (data?.buffer instanceof ArrayBuffer) {
            const buffer = data.buffer;
            const offset = data.byteOffset || 0;
            const view = new Uint8Array(buffer, offset, data.byteLength);
            if (data.byteLength < 3) return;
            const seqNum = (view[0] << 8) | view[1];
            const op = view[2];
            const d = new Uint8Array(buffer, offset + 3, data.byteLength - 3);
            console.log(`[Discord Voice] Buffer-like DAVE message: seq=${seqNum}, op=${op}, ${d.byteLength} bytes`);
            parsed = { op, d, seq: seqNum };
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
        // Unexpected / forced disconnect — clean up resources and reset state
        this._cleanupConnection();
        store.reset();
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
          video: true,
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

        // Always create DAVE session — Discord requires E2EE (4017 if missing)
        console.log('[Discord Voice] dave_protocol_version:', d.dave_protocol_version);
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
        console.log('[Discord Voice] SPEAKING:', JSON.stringify(d));
        if (d?.ssrc && d?.user_id) {
          const isNew = !this.remoteSsrcs.has(d.ssrc);
          this.remoteSsrcs.set(d.ssrc, d.user_id);
          if (this.daveSession) {
            this.daveSession.registerSpeakingSsrc(d.ssrc, d.user_id);
          }
          // Renegotiate SDP when a new SSRC appears so Chrome knows about it
          if (isNew && this.serverSdpInfo) {
            this._renegotiateSdp();
          }
          // Update track→userId mapping for audio level monitoring
          this._updateTrackUserMappings();
        }
        break;

      case VoiceOp.RESUMED:
        console.log('[Discord Voice] Voice session resumed');
        break;

      case VoiceOp.CLIENTS_CONNECT:
        console.log('[Discord Voice] CLIENTS_CONNECT: users in call:', d?.user_ids);
        break;

      case VoiceOp.CLIENT_DISCONNECT:
        console.log('[Discord Voice] CLIENT_DISCONNECT:', d?.user_id);
        break;

      case VoiceOp.CLIENT_FLAGS:
        // Server acknowledges client flags — no action needed
        break;

      case VoiceOp.CLIENT_PLATFORM:
        console.log('[Discord Voice] CLIENT_PLATFORM: user:', d?.user_id, 'platform:', d?.platform, 'flags:', d?.flags);
        break;

      case VoiceOp.MEDIA_SINK_WANTS:
        console.log('[Discord Voice] MEDIA_SINK_WANTS:', JSON.stringify(d));
        break;

      case VoiceOp.VOICE_BACKEND_VERSION:
        console.log('[Discord Voice] VOICE_BACKEND_VERSION: user:', d?.user_id, 'platform:', d?.platform);
        break;

      // ─── DAVE E2EE Opcodes (per protocol.md) ─────────────────────

      case VoiceOp.DAVE_PROTOCOL_PREPARE_TRANSITION:
        // JSON: { protocol_version, transition_id }
        console.log('[Discord Voice] DAVE prepare transition:', JSON.stringify(d));
        this._handleDavePrepareTransition(d);
        break;

      case VoiceOp.DAVE_PROTOCOL_EXECUTE_TRANSITION:
        // JSON: { transition_id }
        console.log('[Discord Voice] DAVE execute transition:', JSON.stringify(d));
        if (this.daveSession) {
          this.daveSession.handleExecuteTransition(d);
        }
        break;

      case VoiceOp.DAVE_PROTOCOL_PREPARE_EPOCH:
        // JSON: { protocol_version, epoch }
        console.log('[Discord Voice] DAVE prepare epoch:', JSON.stringify(d));
        this._handleDavePrepareEpoch(d);
        break;

      case VoiceOp.DAVE_MLS_EXTERNAL_SENDER_PACKAGE: {
        // Binary (op 25): ExternalSender credential from server
        console.log('[Discord Voice] DAVE Op 25 external sender package:', d instanceof Uint8Array ? d.length + ' bytes' : JSON.stringify(d));
        if (d instanceof Uint8Array) {
          this._handleDaveExternalSender(d);
        }
        break;
      }

      case VoiceOp.DAVE_MLS_PROPOSALS: {
        // Binary (op 27): MLS proposals from server
        console.log('[Discord Voice] DAVE Op 27 proposals:', d instanceof Uint8Array ? d.length + ' bytes' : JSON.stringify(d)?.substring(0, 200));
        if (d instanceof Uint8Array && this.daveSession) {
          this.daveSession.handleProposals(d);
        }
        break;
      }

      case VoiceOp.DAVE_MLS_ANNOUNCE_COMMIT_TRANSITION: {
        // Binary (op 29): commit broadcast + transition_id from server
        console.log('[Discord Voice] DAVE Op 29 announce commit transition:', d instanceof Uint8Array ? d.length + ' bytes' : JSON.stringify(d));
        if (d instanceof Uint8Array) {
          this._handleDaveAnnounceCommitTransition(d);
        }
        break;
      }

      case VoiceOp.DAVE_MLS_WELCOME: {
        // Binary (op 30): Welcome message for us (new joiner)
        console.log('[Discord Voice] DAVE Op 30 welcome:', d instanceof Uint8Array ? d.length + ' bytes' : JSON.stringify(d));
        if (d instanceof Uint8Array) {
          this._handleDaveWelcome(d);
        }
        break;
      }

      case VoiceOp.DAVE_MLS_INVALID_COMMIT_WELCOME:
        console.warn('[Discord Voice] DAVE invalid commit/welcome:', d);
        break;

      default:
        console.log(`[Discord Voice] Unhandled voice opcode: ${op}`, d);
    }
  },

  // ─── DAVE Handlers ──────────────────────────────────────────────

  async _handleDaveExternalSender(d: Uint8Array) {
    console.log('[Discord Voice] DAVE external sender received, daveSession:', !!this.daveSession, 'data length:', d?.length);
    if (!this.daveSession) return;

    try {
      // d is the ExternalSender struct (after seq+opcode were stripped by parser)
      const keyPackageMsg = await this.daveSession.handleExternalSender(d);
      console.log('[Discord Voice] DAVE key package MLSMessage created, length:', keyPackageMsg.length);

      // Send our key package as binary Op 26: [opcode(26), MLSMessage]
      this._sendDaveBinary(VoiceOp.DAVE_MLS_KEY_PACKAGE, keyPackageMsg);
      console.log('[Discord Voice] DAVE key package sent (Op 26)');
    } catch (err) {
      console.error('[Discord Voice] DAVE external sender handling failed:', err);
    }
  },

  /** Handle Op 29: announce_commit_transition — commit broadcast from another member */
  async _handleDaveAnnounceCommitTransition(d: Uint8Array) {
    if (!this.daveSession) return;

    try {
      // Binary format: [transition_id(2 bytes), MLSMessage commit...]
      if (d.length < 2) return;
      const transitionId = (d[0] << 8) | d[1];
      const commitData = d.subarray(2);
      console.log('[Discord Voice] DAVE announce commit transition: transitionId=', transitionId, 'commitSize=', commitData.length);

      await this.daveSession.handleCommit(commitData);
      console.log('[Discord Voice] DAVE commit processed, state:', this.daveSession.state);

      // Tell server we're ready for this transition
      this._sendVoice(VoiceOp.DAVE_PROTOCOL_READY_FOR_TRANSITION, {
        transition_id: transitionId,
      });
      console.log('[Discord Voice] Sent ready_for_transition, transitionId:', transitionId);
    } catch (err) {
      console.error('[Discord Voice] DAVE announce commit transition failed:', err);
    }
  },

  /** Handle Op 30: welcome — Welcome message for us as a new joiner */
  async _handleDaveWelcome(d: Uint8Array) {
    if (!this.daveSession) return;

    try {
      // Binary format: [transition_id(2 bytes), Welcome message...]
      if (d.length < 2) return;
      const transitionId = (d[0] << 8) | d[1];
      const welcomeData = d.subarray(2);
      console.log('[Discord Voice] DAVE welcome: transitionId=', transitionId, 'welcomeSize=', welcomeData.length);

      await this.daveSession.handleWelcome(welcomeData);
      console.log('[Discord Voice] DAVE welcome processed, state:', this.daveSession.state, 'epoch:', this.daveSession.epoch, 'hasKeys:', !!this.daveSession.sframeKeyMaterial);

      // Tell server we're ready for this transition
      this._sendVoice(VoiceOp.DAVE_PROTOCOL_READY_FOR_TRANSITION, {
        transition_id: transitionId,
      });
      console.log('[Discord Voice] Sent ready_for_transition after welcome, transitionId:', transitionId);
    } catch (err) {
      console.error('[Discord Voice] DAVE welcome handling failed:', err);
    }
  },

  _handleDavePrepareTransition(d: any) {
    console.log('[Discord Voice] DAVE prepare transition, daveSession:', !!this.daveSession, 'd:', JSON.stringify(d));
    if (!this.daveSession) return;

    const transitionId = d?.transition_id ?? 0;

    // transition_id = 0 means immediate execute (re-initialization)
    if (transitionId === 0) {
      console.log('[Discord Voice] DAVE immediate transition (re-init)');
      this.daveSession.handleExecuteTransition(d);
      return;
    }

    this.daveSession.handlePrepareTransition(d);
  },

  /** Handle Op 24: prepare_epoch — server announces upcoming epoch/protocol change */
  _handleDavePrepareEpoch(d: any) {
    console.log('[Discord Voice] DAVE prepare epoch, d:', JSON.stringify(d));
    const epoch = d?.epoch ?? 0;

    if (epoch === 1) {
      // Group is being (re)created — generate and send a new key package
      console.log('[Discord Voice] DAVE group (re)creation, generating new key package');
      if (this.daveSession) {
        this.daveSession.resetGroupState();
        // Re-send key package after external sender is received
      }
    }
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

      // Create peer connection with encoded insertable streams for DAVE E2EE
      this.peerConnection = new RTCPeerConnection({
        bundlePolicy: 'max-bundle',
        // @ts-ignore - encodedInsertableStreams is a Chrome/Electron API
        encodedInsertableStreams: true,
      });

      // Handle remote tracks (incoming audio from other users)
      this.peerConnection.ontrack = (event) => {
        console.log('[Discord Voice] Remote track received:', event.track.kind, 'id:', event.track.id, 'readyState:', event.track.readyState, 'mid:', event.transceiver?.mid, 'streams:', event.streams.length, 'streamIds:', event.streams.map((s) => s.id));
        if (event.track.kind === 'audio') {
          const stream = event.streams[0] || new MediaStream([event.track]);
          const audio = new Audio();
          audio.srcObject = stream;
          audio.autoplay = true;
          audio.muted = store.isDeafened;
          this.remoteAudioElements.set(event.track.id, audio);

          audio.play().then(() => {
            console.log('[Discord Voice] Remote audio playing, trackId:', event.track.id, 'mid:', event.transceiver?.mid);
          }).catch((err) => {
            console.error('[Discord Voice] Remote audio play() rejected:', err);
          });

          // Set up audio level analyser for speaking detection
          this._setupAudioAnalyser(event.track.id, stream, event.transceiver?.mid);

          event.track.onended = () => {
            const el = this.remoteAudioElements.get(event.track.id);
            if (el) { el.pause(); el.srcObject = null; }
            this.remoteAudioElements.delete(event.track.id);
            this._removeAudioAnalyser(event.track.id);
          };
          event.track.onunmute = () => console.log('[Discord Voice] Remote track unmuted:', event.track.id, 'mid:', event.transceiver?.mid);
        }
      };

      // ─── Create transceivers matching Discord's architecture ───
      // mid 0: audio sendonly (our mic audio to server)
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnection.addTransceiver(audioTrack, { direction: 'sendonly' });
      } else {
        this.peerConnection.addTransceiver('audio', { direction: 'sendonly' });
      }

      // mid 1: video recvonly (our video slot)
      this.peerConnection.addTransceiver('video', { direction: 'recvonly' });

      // mids 2..11: 10 audio recvonly transceivers (for remote users)
      for (let i = 0; i < this.numAudioReceivers; i++) {
        this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      }

      // mids 12..21: 10 video recvonly transceivers (for remote users)
      for (let i = 0; i < this.numVideoReceivers; i++) {
        this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }

      console.log('[Discord Voice] Created transceivers:', this.peerConnection.getTransceivers().length);

      // Debug: monitor ICE and connection state
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) console.log('[Discord Voice] ICE candidate:', event.candidate.candidate.substring(0, 80));
      };
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[Discord Voice] ICE connection state:', this.peerConnection?.iceConnectionState);
      };
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[Discord Voice] Connection state:', this.peerConnection?.connectionState);
      };

      // Create offer
      const offer = await this.peerConnection.createOffer();
      let sdp = offer.sdp || '';

      // Replace auto-generated SSRC in the first audio m-section with Discord's assigned SSRC
      sdp = this._modifySdpSsrc(sdp, this.ssrc);

      console.log('[Discord Voice] SDP offer mids:', sdp.match(/a=mid:\d+/g)?.join(', '));
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Extract UNIQUE a= attribute lines for SELECT_PROTOCOL.
      // Discord expects ONE set of ice/extmap/rtpmap lines, not duplicated per m-section.
      const seen = new Set<string>();
      const selectLines: string[] = [];
      for (const line of sdp.split('\r\n')) {
        if (!line.startsWith('a=')) continue;
        // Skip per-transceiver lines (mid, ssrc, msid, direction, rtcp lines)
        if (line.startsWith('a=mid:') || line.startsWith('a=ssrc:') || line.startsWith('a=msid:') ||
            line.startsWith('a=ssrc-group:') || line.startsWith('a=rtcp:') || line.startsWith('a=rtcp-mux') ||
            line.startsWith('a=rtcp-rsize') || line === 'a=sendonly' || line === 'a=recvonly' ||
            line === 'a=sendrecv' || line === 'a=inactive') continue;
        // Deduplicate
        if (!seen.has(line)) {
          seen.add(line);
          selectLines.push(line);
        }
      }
      const selectSdp = selectLines.join('\n');

      // Send Select Protocol with WebRTC SDP
      this._sendVoice(VoiceOp.SELECT_PROTOCOL, {
        protocol: 'webrtc',
        data: selectSdp,
        sdp: selectSdp,
        codecs: [
          { name: 'opus', type: 'audio', priority: 1000, payload_type: 111, rtx_payload_type: null },
          { name: 'H264', type: 'video', priority: 1000, payload_type: 103, rtx_payload_type: 104 },
          { name: 'VP8', type: 'video', priority: 2000, payload_type: 96, rtx_payload_type: 97 },
          { name: 'VP9', type: 'video', priority: 3000, payload_type: 98, rtx_payload_type: 99 },
        ],
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

      // Extract server-provided ICE/DTLS info from Discord's non-standard SDP
      const iceUfrag = rawSdp.match(/a=ice-ufrag:(\S+)/)?.[1] || '';
      const icePwd = rawSdp.match(/a=ice-pwd:(\S+)/)?.[1] || '';
      const fingerprint = rawSdp.match(/a=fingerprint:(\S+ \S+)/)?.[1] || '';
      const candidates = [...rawSdp.matchAll(/a=candidate:(.+)/g)].map((m) => m[1]);
      const connectionLine = rawSdp.match(/c=IN IP4 (\S+)/)?.[0] || 'c=IN IP4 0.0.0.0';
      const port = rawSdp.match(/m=audio (\d+)/)?.[1] || '9';

      // Cache server info for SDP renegotiation
      this.serverSdpInfo = { iceUfrag, icePwd, fingerprint, candidates, connectionLine, port };

      // Build initial multi-mid SDP answer with all sections inactive
      // (matching Discord's architecture — sections activate via renegotiation)
      const sdp = this._buildSdpAnswer();
      console.log('[Discord Voice] Initial SDP answer (first 600 chars):', sdp.substring(0, 600));

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      console.log('[Discord Voice] Remote description set, transceivers:', this.peerConnection.getTransceivers().map((t) => ({ mid: t.mid, dir: t.currentDirection })));

      useDiscordVoiceStore.getState().setConnectionState('connected');

      // Set up DAVE E2EE transforms for sender and receivers
      if (this.daveSession) {
        console.log('[Discord Voice] Setting up DAVE encoded transforms');
        this.daveSession.setupEncodedTransforms(this.peerConnection);
      }

      // Announce that we're speaking (microphone source)
      this._sendVoice(VoiceOp.SPEAKING, { speaking: 1, delay: 0, ssrc: this.ssrc });

      // Start periodic WebRTC stats monitoring for debugging
      this._startStatsMonitor();

      // If we already have SSRC mappings from SPEAKING events, renegotiate now
      if (this.remoteSsrcs.size > 0) {
        console.log('[Discord Voice] Have pending SSRCs, renegotiating...');
        await this._renegotiateSdp();
      }
    } catch (err) {
      console.error('[Discord Voice] Failed to set remote description:', err);
      console.error('[Discord Voice] Raw SDP from server:', data.sdp);
      this._cleanup();
      useDiscordVoiceStore.getState().reset();
    }
  },

  /**
   * Build a multi-mid SDP answer matching Discord's architecture.
   * Each transceiver gets its own m-section. Active speakers get sendonly + SSRC.
   */
  _buildSdpAnswer(): string {
    if (!this.serverSdpInfo || !this.peerConnection) return '';
    const { iceUfrag, icePwd, fingerprint, candidates, connectionLine, port } = this.serverSdpInfo;
    const transceivers = this.peerConnection.getTransceivers();

    // Build BUNDLE group with all mids
    const mids = transceivers.map((_, i) => i).join(' ');

    // Map SSRC → mid assignment: assign each known SSRC to the first available
    // recvonly audio transceiver (mids 2+)
    const ssrcToMid = new Map<number, number>();
    const assignedMids = new Set<number>();
    let nextAudioMid = 2; // mids 2..11 are audio receivers
    for (const [ssrc] of this.remoteSsrcs) {
      while (nextAudioMid < 2 + this.numAudioReceivers && assignedMids.has(nextAudioMid)) {
        nextAudioMid++;
      }
      if (nextAudioMid < 2 + this.numAudioReceivers) {
        ssrcToMid.set(ssrc, nextAudioMid);
        assignedMids.add(nextAudioMid);
        nextAudioMid++;
      }
    }
    if (ssrcToMid.size > 0) {
      console.log('[Discord Voice] SSRC→mid mapping:', Object.fromEntries(ssrcToMid));
    }
    // Update mid→userId mapping for audio level monitoring
    this.midToUserId.clear();
    for (const [ssrc, mid] of ssrcToMid) {
      const userId = this.remoteSsrcs.get(ssrc);
      if (userId) this.midToUserId.set(mid, userId);
    }

    const lines: string[] = [
      'v=0',
      'o=- 1420070400000 0 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      `a=msid-semantic: WMS *`,
      `a=group:BUNDLE ${mids}`,
    ];

    // Common ICE/DTLS block for each m-section
    const iceBlock = [
      `a=ice-ufrag:${iceUfrag}`,
      `a=ice-pwd:${icePwd}`,
      `a=fingerprint:${fingerprint}`,
      ...candidates.map((c) => `a=candidate:${c}`),
    ];

    // Audio extmaps (matching Discord's server answer: only ssrc-audio-level + transport-cc)
    const audioExtmaps = [
      'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
      'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
    ];

    // Video extmaps
    const videoExtmaps = [
      'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
      'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
      'a=extmap:14 urn:ietf:params:rtp-hdrext:toffset',
      'a=extmap:13 urn:3gpp:video-orientation',
      'a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay',
    ];

    for (let i = 0; i < transceivers.length; i++) {
      const t = transceivers[i];
      const kind = t.receiver.track.kind;
      const isAudio = kind === 'audio';

      if (isAudio) {
        // Check if this mid has an assigned SSRC (active speaker)
        let activeSsrc: number | undefined;
        let activeUserId: string | undefined;
        for (const [ssrc, mid] of ssrcToMid) {
          if (mid === i) {
            activeSsrc = ssrc;
            activeUserId = this.remoteSsrcs.get(ssrc);
            break;
          }
        }

        // mid 0 is our sending slot — answer says recvonly (server receives our audio)
        // Other mids: sendonly if active speaker, inactive otherwise
        const direction = i === 0 ? 'recvonly' : activeSsrc ? 'sendonly' : 'inactive';
        lines.push(
          `m=audio ${port} UDP/TLS/RTP/SAVPF 111`,
          connectionLine,
          `a=rtpmap:111 opus/48000/2`,
          `a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1`,
          `a=rtcp:${port}`,
          'a=rtcp-fb:111 transport-cc',
          'a=rtcp-fb:111 nack',
          ...audioExtmaps,
          'a=setup:passive',
          `a=mid:${i}`,
          'a=maxptime:60',
          `a=${direction}`,
          ...iceBlock,
        );
        // Add SSRC for active speakers
        if (activeSsrc && activeUserId) {
          lines.push(
            `a=msid:${activeUserId}-${activeSsrc} a${activeUserId}-${activeSsrc}`,
            `a=ssrc:${activeSsrc} cname:${activeUserId}-${activeSsrc}`,
          );
        }
        lines.push('a=rtcp-mux');
      } else {
        // Video section — always inactive for now
        lines.push(
          `m=video ${port} UDP/TLS/RTP/SAVPF 103 104`,
          connectionLine,
          'a=rtpmap:103 H264/90000',
          'a=rtpmap:104 rtx/90000',
          'a=fmtp:103 x-google-max-bitrate=2500;level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
          'a=fmtp:104 apt=103',
          `a=rtcp:${port}`,
          'a=rtcp-fb:103 ccm fir',
          'a=rtcp-fb:103 nack',
          'a=rtcp-fb:103 nack pli',
          'a=rtcp-fb:103 goog-remb',
          'a=rtcp-fb:103 transport-cc',
          ...videoExtmaps,
          'a=setup:passive',
          `a=mid:${i}`,
          'a=inactive',
          ...iceBlock,
          'a=rtcp-mux',
        );
      }
    }

    lines.push('');
    return lines.join('\r\n');
  },

  /**
   * SDP renegotiation — called when SPEAKING events provide new SSRC→userId mappings.
   * Re-creates the offer and answer to activate specific mids with remote SSRCs.
   */
  async _renegotiateSdp() {
    if (!this.peerConnection || !this.serverSdpInfo) return;
    if (this.peerConnection.signalingState !== 'stable') {
      console.log('[Discord Voice] Skipping renegotiation, signaling state:', this.peerConnection.signalingState);
      return;
    }

    try {
      // Create new offer (transceivers already exist)
      const offer = await this.peerConnection.createOffer();
      let sdp = offer.sdp || '';
      sdp = this._modifySdpSsrc(sdp, this.ssrc);
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Build answer with SSRC mappings
      const answerSdp = this._buildSdpAnswer();
      console.log('[Discord Voice] Renegotiation answer SSRCs:', [...this.remoteSsrcs.entries()].map(([s, u]) => `${s}→${u}`).join(', '));

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
      console.log('[Discord Voice] Renegotiation complete, transceivers:', this.peerConnection.getTransceivers().map((t) => ({ mid: t.mid, dir: t.currentDirection })));
      // Update track→userId mappings now that mid→SSRC assignments are finalized
      this._updateTrackUserMappings();
    } catch (err) {
      console.error('[Discord Voice] SDP renegotiation failed:', err);
    }
  },

  // ─── Audio Level Monitoring for Speaking Indicators ──────────────

  _setupAudioAnalyser(trackId: string, stream: MediaStream, mid: string | null | undefined) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const userId = mid != null ? this.midToUserId.get(parseInt(mid, 10)) || null : null;
      this.audioAnalysers.set(trackId, { analyser, source, userId });

      if (!this.speakingMonitorInterval) {
        this._startSpeakingMonitor();
      }
    } catch (err) {
      console.error('[Discord Voice] Failed to setup audio analyser:', err);
    }
  },

  _removeAudioAnalyser(trackId: string) {
    const entry = this.audioAnalysers.get(trackId);
    if (entry) {
      entry.source.disconnect();
      this.audioAnalysers.delete(trackId);
    }
  },

  _updateTrackUserMappings() {
    if (!this.peerConnection) return;
    const transceivers = this.peerConnection.getTransceivers();
    for (const [trackId, entry] of this.audioAnalysers) {
      if (entry.userId) continue;
      const t = transceivers.find((tr) => tr.receiver.track.id === trackId);
      if (t?.mid != null) {
        const userId = this.midToUserId.get(parseInt(t.mid, 10));
        if (userId) entry.userId = userId;
      }
    }
  },

  _startSpeakingMonitor() {
    const THRESHOLD = 1;
    const dataArray = new Uint8Array(128);

    this.speakingMonitorInterval = setInterval(() => {
      const store = useDiscordVoiceStore.getState();
      const currentSpeaking = new Set<string>();

      for (const [, entry] of this.audioAnalysers) {
        if (!entry.userId) continue;
        entry.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        if (avg > THRESHOLD) {
          currentSpeaking.add(entry.userId);
        }
      }

      const prev = store.speakingUsers;
      const changed = currentSpeaking.size !== prev.size || [...currentSpeaking].some((u) => !prev.has(u));
      if (changed) {
        useDiscordVoiceStore.setState({ speakingUsers: currentSpeaking });
      }
    }, 100);
  },

  _stopSpeakingMonitor() {
    if (this.speakingMonitorInterval) {
      clearInterval(this.speakingMonitorInterval);
      this.speakingMonitorInterval = null;
    }
    for (const [, entry] of this.audioAnalysers) {
      entry.source.disconnect();
    }
    this.audioAnalysers.clear();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  },

  // ─── Voice Gateway Utilities ─────────────────────────────────────

  _sendVoice(op: number, d: any) {
    if (this.voiceWs && this.voiceWs.readyState === WebSocket.OPEN) {
      this.voiceWs.send(JSON.stringify({ op, d }));
    }
  },

  /** Send a DAVE binary frame: uint8 opcode + payload (client→server format per protocol.md) */
  _sendDaveBinary(op: number, payload: Uint8Array) {
    if (!this.voiceWs || this.voiceWs.readyState !== WebSocket.OPEN) return;
    const frame = new Uint8Array(1 + payload.length);
    frame[0] = op; // Absolute opcode (e.g. 26 for key_package)
    frame.set(payload, 1);
    console.log(`[Discord Voice] Sending DAVE binary: op=${op}, payload=${payload.length} bytes, total=${frame.length} bytes`);
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
      // Remove onclose before closing to prevent the old WS's async onclose
      // from corrupting state during a reconnect
      this.voiceWs.onclose = null;
      this.voiceWs.onerror = null;
      this.voiceWs.close(1000, 'Intentional disconnect');
      this.voiceWs = null;
    }
  },

  // ─── Stats Monitor ──────────────────────────────────────────────

  _startStatsMonitor() {
    this._stopStatsMonitor();
    let checkCount = 0;
    this.statsMonitorInterval = setInterval(async () => {
      if (!this.peerConnection) return;
      checkCount++;
      try {
        const stats = await this.peerConnection.getStats();
        // On first check, log ALL report types to see what's available
        if (checkCount === 1) {
          const types: string[] = [];
          stats.forEach((report) => types.push(`${report.type}(${report.kind || ''})`));
          console.log(`[Discord Voice] Stats #${checkCount} all report types:`, types.join(', '));
        }
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp') {
            console.log(`[Discord Voice] Stats #${checkCount} inbound-rtp:`, {
              kind: report.kind,
              ssrc: report.ssrc,
              packetsReceived: report.packetsReceived,
              bytesReceived: report.bytesReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter,
              codecId: report.codecId,
            });
          }
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            console.log(`[Discord Voice] Stats #${checkCount} outbound-rtp:`, {
              packetsSent: report.packetsSent,
              bytesSent: report.bytesSent,
            });
          }
          if (report.type === 'candidate-pair' && (report.state === 'succeeded' || (checkCount === 1 && report.bytesReceived > 0))) {
            console.log(`[Discord Voice] Stats #${checkCount} candidate-pair:`, {
              state: report.state,
              bytesReceived: report.bytesReceived,
              bytesSent: report.bytesSent,
              currentRoundTripTime: report.currentRoundTripTime,
            });
          }
          if (report.type === 'transport') {
            console.log(`[Discord Voice] Stats #${checkCount} transport:`, {
              dtlsState: report.dtlsState,
              dtlsCipher: report.dtlsCipher,
              srtpCipher: report.srtpCipher,
              tlsVersion: report.tlsVersion,
              iceState: report.iceState,
              selectedCandidatePairId: report.selectedCandidatePairId,
              bytesReceived: report.bytesReceived,
              bytesSent: report.bytesSent,
              packetsReceived: report.packetsReceived,
              packetsSent: report.packetsSent,
            });
          }
          if (report.type === 'remote-inbound-rtp') {
            console.log(`[Discord Voice] Stats #${checkCount} remote-inbound-rtp:`, {
              kind: report.kind,
              ssrc: report.ssrc,
              packetsReceived: report.packetsReceived,
              roundTripTime: report.roundTripTime,
              fractionLost: report.fractionLost,
            });
          }
        });
      } catch (err) {
        console.warn('[Discord Voice] Stats error:', err);
      }
      // Stop after 10 checks (30 seconds) to reduce noise
      if (checkCount >= 10) this._stopStatsMonitor();
    }, 3000);
  },

  _stopStatsMonitor() {
    if (this.statsMonitorInterval) {
      clearInterval(this.statsMonitorInterval);
      this.statsMonitorInterval = null;
    }
  },

  // ─── Cleanup ─────────────────────────────────────────────────────

  /** Clean up connection resources (WebRTC, audio, DAVE) but keep store state */
  _cleanupConnection() {
    this._stopStatsMonitor();
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

    // Clean up audio level monitoring
    this._stopSpeakingMonitor();

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

    // Clear SSRC mappings and cached server info
    this.remoteSsrcs.clear();
    this.midToUserId.clear();
    this.serverSdpInfo = null;

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
