import { useDiscordStore } from '../store/discord.store';
import { useDiscordVoiceStore } from '../store/discord-voice.store';
import { DiscordGatewayService } from './discord-gateway.service';
import { GatewayOp, VoiceOp } from '../constants/gateway-opcodes';

export const DiscordVoiceService = {
  // Voice worker that manages WebSocket + heartbeat + DAVE crypto
  _worker: null as Worker | null,

  // WebRTC peer connection (must stay on main thread)
  peerConnection: null as RTCPeerConnection | null,

  // Local microphone stream
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

    if (store.channelId === channelId && store.connectionState === 'connected') {
      return;
    }

    if (store.connectionState !== 'disconnected') {
      await this.leaveVoiceChannel();
    }

    store.setConnectionState('connecting');
    store.setChannel(guildId, channelId, channelName, guildName);

    this.pendingVoiceState = null;
    this.pendingVoiceServer = null;
    this.rtcConnectionId = crypto.randomUUID();

    DiscordGatewayService.send({
      op: GatewayOp.VOICE_STATE_UPDATE,
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

    if (guildId && connectionState !== 'force_disconnected') {
      DiscordGatewayService.send({
        op: GatewayOp.VOICE_STATE_UPDATE,
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

    if (!newMuted && store.isDeafened) {
      store.setDeafened(false);
    }

    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: GatewayOp.VOICE_STATE_UPDATE,
        d: {
          guild_id: store.guildId,
          channel_id: store.channelId,
          self_mute: newMuted,
          self_deaf: !newMuted ? false : store.isDeafened,
        },
      });
    }

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

    if (newDeafened) {
      store.setMuted(true);
    }

    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: GatewayOp.VOICE_STATE_UPDATE,
        d: {
          guild_id: store.guildId,
          channel_id: store.channelId,
          self_mute: newDeafened ? true : store.isMuted,
          self_deaf: newDeafened,
        },
      });
    }
  },

  /**
   * Toggle fake mute — tells Discord you're muted but keeps mic active locally.
   */
  toggleFakeMute() {
    const store = useDiscordVoiceStore.getState();
    const newFakeMuted = !store.isFakeMuted;
    store.setFakeMuted(newFakeMuted);

    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: GatewayOp.VOICE_STATE_UPDATE,
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

    if (store.guildId && store.channelId) {
      DiscordGatewayService.send({
        op: GatewayOp.VOICE_STATE_UPDATE,
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

  handleVoiceStateUpdate(data: any) {
    const currentUser = useDiscordStore.getState().user;
    if (!currentUser || data.user_id !== currentUser.id) return;

    const store = useDiscordVoiceStore.getState();
    if (store.connectionState !== 'connecting') return;

    this.pendingVoiceState = { session_id: data.session_id };
    this._tryConnect();
  },

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

  // ─── Voice Worker Connection ────────────────────────────────────

  _tryConnect() {
    if (!this.pendingVoiceState || !this.pendingVoiceServer) return;

    const { session_id } = this.pendingVoiceState;
    const { token, guild_id, endpoint } = this.pendingVoiceServer;
    const user = useDiscordStore.getState().user;
    const channelId = useDiscordVoiceStore.getState().channelId;

    if (!user || !channelId) return;

    this._connectVoiceWorker(endpoint, guild_id, channelId, user.id, session_id, token);
  },

  /**
   * Start the voice worker and connect to the Discord voice gateway.
   */
  _connectVoiceWorker(
    endpoint: string,
    serverId: string,
    channelId: string,
    userId: string,
    sessionId: string,
    token: string,
  ) {
    this._disconnectVoiceWorker();

    this._worker = new Worker(
      new URL('../workers/discord-voice.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this._worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'ready':
          console.log('[Discord Voice] Worker READY, ssrc:', msg.ssrc);
          this.ssrc = msg.ssrc;
          this._setupWebRTC(msg.data);
          break;

        case 'sessionDescription':
          this._handleSessionDescription(msg.data);
          break;

        case 'speaking':
          if (msg.data?.ssrc && msg.data?.user_id) {
            const isNew = !this.remoteSsrcs.has(msg.data.ssrc);
            this.remoteSsrcs.set(msg.data.ssrc, msg.data.user_id);
            // Also register in worker's DAVE session
            this._worker?.postMessage({
              type: 'registerSsrc',
              ssrc: msg.data.ssrc,
              userId: msg.data.user_id,
            });
            if (isNew && this.serverSdpInfo) {
              this._renegotiateSdp();
            }
            this._updateTrackUserMappings();
          }
          break;

        case 'clientsConnect':
          console.log('[Discord Voice] Worker CLIENTS_CONNECT:', msg.data?.user_ids);
          break;

        case 'clientDisconnect':
          console.log('[Discord Voice] Worker CLIENT_DISCONNECT:', msg.data?.user_id);
          break;

        case 'connectionState':
          if (msg.state === 'disconnected') {
            const store = useDiscordVoiceStore.getState();
            if (store.connectionState === 'connected' || store.connectionState === 'connecting') {
              this._cleanupConnection();
              store.reset();
            }
          }
          break;

        case 'daveReady':
          console.log('[Discord Voice] Worker DAVE ready — setting up encoded transforms');
          this._setupEncodedTransforms();
          break;

        case 'log':
          if (msg.level === 'warn') {
            console.warn(...msg.args);
          } else {
            console.log(...msg.args);
          }
          break;
      }
    };

    this._worker.onerror = (err) => {
      console.error('[Discord Voice] Worker error:', err);
    };

    this._worker.postMessage({
      type: 'connect',
      endpoint,
      serverId,
      channelId,
      userId,
      sessionId,
      token,
    });
  },

  _disconnectVoiceWorker() {
    if (this._worker) {
      this._worker.postMessage({ type: 'disconnect' });
      this._worker.terminate();
      this._worker = null;
    }
  },

  // ─── WebRTC (stays on main thread) ──────────────────────────────

  async _setupWebRTC(_readyData: any) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const store = useDiscordVoiceStore.getState();

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
        console.log('[Discord Voice] Remote track received:', event.track.kind, 'mid:', event.transceiver?.mid);
        if (event.track.kind === 'audio') {
          const stream = event.streams[0] || new MediaStream([event.track]);
          const audio = new Audio();
          audio.srcObject = stream;
          audio.autoplay = true;
          audio.muted = store.isDeafened;
          this.remoteAudioElements.set(event.track.id, audio);

          audio.play().then(() => {
            console.log('[Discord Voice] Remote audio playing, trackId:', event.track.id);
          }).catch((err) => {
            console.error('[Discord Voice] Remote audio play() rejected:', err);
          });

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

      this.peerConnection.onicecandidate = (event) => {
        // if (event.candidate) console.log('[Discord Voice] ICE candidate:', event.candidate.candidate.substring(0, 80));
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

      sdp = this._modifySdpSsrc(sdp, this.ssrc);

      console.log('[Discord Voice] SDP offer mids:', sdp.match(/a=mid:\d+/g)?.join(', '));
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Extract UNIQUE a= attribute lines for SELECT_PROTOCOL
      const seen = new Set<string>();
      const selectLines: string[] = [];
      for (const line of sdp.split('\r\n')) {
        if (!line.startsWith('a=')) continue;
        if (line.startsWith('a=mid:') || line.startsWith('a=ssrc:') || line.startsWith('a=msid:') ||
            line.startsWith('a=ssrc-group:') || line.startsWith('a=rtcp:') || line.startsWith('a=rtcp-mux') ||
            line.startsWith('a=rtcp-rsize') || line === 'a=sendonly' || line === 'a=recvonly' ||
            line === 'a=sendrecv' || line === 'a=inactive') continue;
        if (!seen.has(line)) {
          seen.add(line);
          selectLines.push(line);
        }
      }
      const selectSdp = selectLines.join('\n');

      // Send Select Protocol via voice worker
      this._worker?.postMessage({
        type: 'send',
        op: VoiceOp.SELECT_PROTOCOL,
        data: {
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
        },
      });
    } catch (err) {
      console.error('[Discord Voice] WebRTC setup failed:', err);
      this._cleanup();
      useDiscordVoiceStore.getState().reset();
    }
  },

  _modifySdpSsrc(sdp: string, ssrc: number): string {
    const lines = sdp.split('\r\n');
    const result: string[] = [];

    for (const line of lines) {
      if (line.startsWith('a=ssrc:')) {
        const oldSsrc = line.split(':')[1].split(' ')[0];
        result.push(line.replace(`a=ssrc:${oldSsrc}`, `a=ssrc:${ssrc}`));
      } else if (line.startsWith('a=ssrc-group:')) {
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

  async _handleSessionDescription(data: any) {
    if (!this.peerConnection) return;

    try {
      const rawSdp: string = data.sdp || '';

      const iceUfrag = rawSdp.match(/a=ice-ufrag:(\S+)/)?.[1] || '';
      const icePwd = rawSdp.match(/a=ice-pwd:(\S+)/)?.[1] || '';
      const fingerprint = rawSdp.match(/a=fingerprint:(\S+ \S+)/)?.[1] || '';
      const candidates = [...rawSdp.matchAll(/a=candidate:(.+)/g)].map((m) => m[1]);
      const connectionLine = rawSdp.match(/c=IN IP4 (\S+)/)?.[0] || 'c=IN IP4 0.0.0.0';
      const port = rawSdp.match(/m=audio (\d+)/)?.[1] || '9';

      this.serverSdpInfo = { iceUfrag, icePwd, fingerprint, candidates, connectionLine, port };

      const sdp = this._buildSdpAnswer();
      console.log('[Discord Voice] Initial SDP answer (first 600 chars):', sdp.substring(0, 600));

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      console.log('[Discord Voice] Remote description set');

      useDiscordVoiceStore.getState().setConnectionState('connected');

      // Set up DAVE encoded transforms by transferring streams to the worker
      this._setupEncodedTransforms();

      // Announce speaking
      this._worker?.postMessage({
        type: 'send',
        op: VoiceOp.SPEAKING,
        data: { speaking: 1, delay: 0, ssrc: this.ssrc },
      });

      //this._startStatsMonitor();

      if (this.remoteSsrcs.size > 0) {
        console.log('[Discord Voice] Have pending SSRCs, renegotiating...');
        await this._renegotiateSdp();
      }
    } catch (err) {
      console.error('[Discord Voice] Failed to set remote description:', err);
      this._cleanup();
      useDiscordVoiceStore.getState().reset();
    }
  },

  /**
   * Transfer encoded audio streams to the voice worker for DAVE E2EE.
   * The worker runs encrypt/decrypt transforms on its own thread.
   */
  _setupEncodedTransforms() {
    if (!this.peerConnection || !this._worker) return;

    // Sender transforms (our outgoing audio) — only set up once
    for (const sender of this.peerConnection.getSenders()) {
      if (sender.track?.kind === 'audio') {
        // @ts-ignore - custom flag to prevent double createEncodedStreams()
        if (sender._daveTransformSetUp) continue;
        try {
          // @ts-ignore - custom flag
          sender._daveTransformSetUp = true;
          // @ts-ignore - createEncodedStreams is a Chrome/Electron API
          const streams = sender.createEncodedStreams?.();
          if (!streams) continue;
          const { readable, writable } = streams;
          this._worker!.postMessage(
            { type: 'setupSenderTransform', readable, writable },
            // @ts-ignore - transferable streams
            [readable, writable],
          );
          console.log('[Discord Voice] Sender transform transferred to worker');
        } catch (err) {
          console.warn('[Discord Voice] Failed to transfer sender transform:', err);
        }
      }
    }

    // Receiver transforms (incoming audio from other users)
    for (const receiver of this.peerConnection.getReceivers()) {
      if (receiver.track?.kind === 'audio') {
        // @ts-ignore - custom flag to prevent double createEncodedStreams()
        if (receiver._daveTransformSetUp) continue;
        this._transferReceiverTransform(receiver);
      }
    }

    // Handle future tracks (renegotiation adds new receivers)
    this.peerConnection.addEventListener('track', (event) => {
      if (event.track.kind === 'audio' && event.receiver) {
        // @ts-ignore
        if (!event.receiver._daveTransformSetUp) {
          this._transferReceiverTransform(event.receiver);
        }
      }
    });
  },

  _transferReceiverTransform(receiver: RTCRtpReceiver) {
    if (!this._worker) return;
    try {
      // @ts-ignore
      receiver._daveTransformSetUp = true;
      // @ts-ignore
      const streams = receiver.createEncodedStreams?.();
      if (!streams) return;
      const { readable, writable } = streams;
      this._worker.postMessage(
        { type: 'setupReceiverTransform', readable, writable },
        // @ts-ignore - transferable streams
        [readable, writable],
      );
      console.log('[Discord Voice] Receiver transform transferred to worker');
    } catch (err) {
      console.warn('[Discord Voice] Failed to transfer receiver transform:', err);
    }
  },

  _buildSdpAnswer(): string {
    if (!this.serverSdpInfo || !this.peerConnection) return '';
    const { iceUfrag, icePwd, fingerprint, candidates, connectionLine, port } = this.serverSdpInfo;
    const transceivers = this.peerConnection.getTransceivers();

    const mids = transceivers.map((_, i) => i).join(' ');

    const ssrcToMid = new Map<number, number>();
    const assignedMids = new Set<number>();
    let nextAudioMid = 2;
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

    const iceBlock = [
      `a=ice-ufrag:${iceUfrag}`,
      `a=ice-pwd:${icePwd}`,
      `a=fingerprint:${fingerprint}`,
      ...candidates.map((c) => `a=candidate:${c}`),
    ];

    const audioExtmaps = [
      'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
      'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
    ];

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
        let activeSsrc: number | undefined;
        let activeUserId: string | undefined;
        for (const [ssrc, mid] of ssrcToMid) {
          if (mid === i) {
            activeSsrc = ssrc;
            activeUserId = this.remoteSsrcs.get(ssrc);
            break;
          }
        }

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
        if (activeSsrc && activeUserId) {
          lines.push(
            `a=msid:${activeUserId}-${activeSsrc} a${activeUserId}-${activeSsrc}`,
            `a=ssrc:${activeSsrc} cname:${activeUserId}-${activeSsrc}`,
          );
        }
        lines.push('a=rtcp-mux');
      } else {
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

  async _renegotiateSdp() {
    if (!this.peerConnection || !this.serverSdpInfo) return;
    if (this.peerConnection.signalingState !== 'stable') {
      console.log('[Discord Voice] Skipping renegotiation, signaling state:', this.peerConnection.signalingState);
      return;
    }

    try {
      const offer = await this.peerConnection.createOffer();
      let sdp = offer.sdp || '';
      sdp = this._modifySdpSsrc(sdp, this.ssrc);
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      const answerSdp = this._buildSdpAnswer();
      console.log('[Discord Voice] Renegotiation answer SSRCs:', [...this.remoteSsrcs.entries()].map(([s, u]) => `${s}→${u}`).join(', '));

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
      console.log('[Discord Voice] Renegotiation complete');
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

  // ─── Stats Monitor ──────────────────────────────────────────────

  _startStatsMonitor() {
    this._stopStatsMonitor();
    let checkCount = 0;
    this.statsMonitorInterval = setInterval(async () => {
      if (!this.peerConnection) return;
      checkCount++;
      try {
        const stats = await this.peerConnection.getStats();
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

  _cleanupConnection() {
    this._stopStatsMonitor();

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this._stopSpeakingMonitor();

    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
    });
    this.remoteAudioElements.clear();

    this.pendingVoiceState = null;
    this.pendingVoiceServer = null;
    this.ssrc = 0;

    this.remoteSsrcs.clear();
    this.midToUserId.clear();
    this.serverSdpInfo = null;
  },

  _cleanup() {
    this._disconnectVoiceWorker();
    this._cleanupConnection();
  },
};
