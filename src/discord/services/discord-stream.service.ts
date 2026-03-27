import { useDiscordStore } from '../store/discord.store';
import { useDiscordVoiceStore } from '../store/discord-voice.store';
import { DiscordGatewayService } from './discord-gateway.service';
import { GatewayOp, VoiceOp } from '../constants/gateway-opcodes';

/**
 * Service for watching Discord Go Live streams.
 *
 * Flow:
 * 1. Send Op 19 (STREAM_CREATE) with the stream_key
 * 2. Gateway responds with STREAM_SERVER_UPDATE dispatch (token + endpoint)
 * 3. Connect a voice WebSocket to the stream voice server
 * 4. Set up WebRTC to receive the video track
 * 5. Send Op 20 (STREAM_DELETE) to stop watching
 */
export const DiscordStreamService = {
  _worker: null as Worker | null,
  _peerConnection: null as RTCPeerConnection | null,
  _serverSdpInfo: null as any,
  _ssrc: 0,
  _remoteSsrcs: new Map<number, string>(),
  _pendingServer: null as { token: string; endpoint: string; stream_key: string } | null,
  _pendingSessionId: null as string | null,
  _rtcServerId: null as string | null,
  _rtcChannelId: null as string | null,
  _daveReady: false,
  _pendingSessionDesc: null as any,

  /**
   * Start watching a user's stream.
   * stream_key format: "guild:{guildId}:{channelId}:{userId}"
   */
  watchStream(guildId: string, channelId: string, userId: string) {
    const streamKey = `guild:${guildId}:${channelId}:${userId}`;
    const store = useDiscordVoiceStore.getState();

    // Already watching this stream
    if (store.watchingStreamKey === streamKey && store.streamConnectionState !== 'disconnected') {
      return;
    }

    // Stop any existing stream first
    if (store.watchingStreamKey) {
      this.stopWatching();
    }

    store.setWatchingStream(streamKey);
    store.setStreamConnectionState('connecting');

    this._pendingServer = null;

    // Send Op 20 STREAM_WATCH
    DiscordGatewayService.send({
      op: GatewayOp.STREAM_WATCH,
      d: { stream_key: streamKey },
    });
  },

  /**
   * Stop watching the current stream.
   */
  stopWatching() {
    const store = useDiscordVoiceStore.getState();
    const streamKey = store.watchingStreamKey;

    if (streamKey) {
      // Send Op 19 STREAM_DELETE
      DiscordGatewayService.send({
        op: GatewayOp.STREAM_DELETE,
        d: { stream_key: streamKey },
      });
    }

    this._cleanup();
    store.setWatchingStream(null);
    store.setStreamConnectionState('disconnected');
    store.setWatchingStreamMedia(null);
  },

  /**
   * Handle STREAM_CREATE dispatch from gateway.
   * Contains: { stream_key, viewer_ids, rtc_server_id, rtc_channel_id, region, paused }
   */
  handleStreamCreate(data: any) {
    console.log('[Discord Stream] STREAM_CREATE:', data.stream_key, 'rtc_server_id:', data.rtc_server_id, 'rtc_channel_id:', data.rtc_channel_id);
    this._rtcServerId = data.rtc_server_id || null;
    this._rtcChannelId = data.rtc_channel_id || null;
  },

  /**
   * Handle STREAM_SERVER_UPDATE dispatch from gateway.
   * Contains: { token, guild_id, endpoint, stream_key }
   */
  handleStreamServerUpdate(data: any) {
    const store = useDiscordVoiceStore.getState();
    if (store.streamConnectionState !== 'connecting') return;
    if (data.stream_key !== store.watchingStreamKey) return;

    console.log('[Discord Stream] STREAM_SERVER_UPDATE:', data.stream_key, data.endpoint);

    this._pendingServer = {
      token: data.token,
      endpoint: data.endpoint,
      stream_key: data.stream_key,
    };

    this._connectStreamWorker(data);
  },

  /**
   * Connect a voice worker to the stream voice server.
   */
  _connectStreamWorker(data: any) {
    this._disconnectWorker();

    const user = useDiscordStore.getState().user;
    if (!user) return;

    this._worker = new Worker(
      new URL('../workers/discord-voice.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this._worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'ready':
          console.log('[Discord Stream] Worker READY, ssrc:', msg.ssrc);
          this._ssrc = msg.ssrc;
          this._setupStreamWebRTC(msg.data);
          break;

        case 'sessionDescription':
          console.log('[Discord Stream] Got sessionDescription from worker');
          // If DAVE is ready, apply immediately. Otherwise, queue it.
          if (this._daveReady) {
            this._setupEncodedTransforms();
            this._handleSessionDescription(msg.data);
          } else {
            console.log('[Discord Stream] Queuing sessionDescription until DAVE is ready');
            this._pendingSessionDesc = msg.data;
          }
          break;

        case 'video': {
          console.log('[Discord Stream] Got VIDEO opcode:', msg.data);
          const videoSsrc = msg.data?.video_ssrc;
          const audioSsrc = msg.data?.audio_ssrc;
          const streamUserId = msg.data?.user_id;
          if (this._worker) {
            // Register SSRC → userId mappings for DAVE decryption
            if (videoSsrc && streamUserId) {
              this._worker.postMessage({ type: 'registerSsrc', ssrc: videoSsrc, userId: streamUserId });
              console.log('[Discord Stream] Registered video SSRC', videoSsrc, '→', streamUserId);
            }
            if (audioSsrc && streamUserId) {
              this._worker.postMessage({ type: 'registerSsrc', ssrc: audioSsrc, userId: streamUserId });
              console.log('[Discord Stream] Registered audio SSRC', audioSsrc, '→', streamUserId);
            }
            // Also register RTX SSRC if present
            if (msg.data?.streams) {
              for (const s of msg.data.streams) {
                if (s.rtx_ssrc && streamUserId) {
                  this._worker.postMessage({ type: 'registerSsrc', ssrc: s.rtx_ssrc, userId: streamUserId });
                }
              }
            }
            // Send MEDIA_SINK_WANTS with the video SSRC to request the stream
            if (videoSsrc) {
              const sinkData: any = { pixelCounts: {} };
              sinkData[String(videoSsrc)] = 100;
              sinkData.pixelCounts[String(videoSsrc)] = 0;
              console.log('[Discord Stream] Sending MEDIA_SINK_WANTS:', sinkData);
              this._worker.postMessage({
                type: 'send',
                op: VoiceOp.MEDIA_SINK_WANTS,
                data: sinkData,
              });
            }
          }
          break;
        }

        case 'daveReady':
          console.log('[Discord Stream] DAVE ready');
          this._daveReady = true;
          // If sessionDescription was already received, apply it now
          if (this._pendingSessionDesc) {
            console.log('[Discord Stream] Applying queued sessionDescription');
            this._setupEncodedTransforms();
            this._handleSessionDescription(this._pendingSessionDesc);
            this._pendingSessionDesc = null;
          }
          break;

        case 'speaking':
          if (msg.data?.ssrc && msg.data?.user_id) {
            this._remoteSsrcs.set(msg.data.ssrc, msg.data.user_id);
          }
          break;

        case 'connectionState':
          if (msg.state === 'disconnected') {
            const store = useDiscordVoiceStore.getState();
            if (store.streamConnectionState !== 'disconnected') {
              this._cleanup();
              store.setWatchingStream(null);
              store.setStreamConnectionState('disconnected');
              store.setWatchingStreamMedia(null);
            }
          }
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
      console.error('[Discord Stream] Worker error:', err);
    };

    const gatewaySessionId = useDiscordStore.getState().sessionId || '';
    const serverId = this._rtcServerId || '';
    const channelId = this._rtcChannelId || '';
    console.log('[Discord Stream] Connecting with session_id:', gatewaySessionId, 'rtc_server_id:', serverId, 'rtc_channel_id:', channelId);
    this._worker.postMessage({
      type: 'connect',
      endpoint: data.endpoint,
      serverId,
      channelId,
      userId: user.id,
      sessionId: gatewaySessionId,
      token: data.token,
      maxDaveVersion: 1,
    });
  },

  /**
   * Set up WebRTC for receiving the stream video.
   * Streams are receive-only — no mic needed.
   */
  async _setupStreamWebRTC(_readyData: any) {
    try {
      this._peerConnection = new RTCPeerConnection({
        bundlePolicy: 'max-bundle',
        // @ts-ignore - encodedInsertableStreams is a Chrome/Electron API for DAVE E2EE
        encodedInsertableStreams: true,
      });

      this._peerConnection.oniceconnectionstatechange = () => {
        console.log('[Discord Stream] ICE connection state:', this._peerConnection?.iceConnectionState);
      };
      this._peerConnection.onconnectionstatechange = () => {
        console.log('[Discord Stream] Connection state:', this._peerConnection?.connectionState);
      };
      this._peerConnection.onicegatheringstatechange = () => {
        console.log('[Discord Stream] ICE gathering state:', this._peerConnection?.iceGatheringState);
      };
      this._peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[Discord Stream] Local ICE candidate:', event.candidate.candidate);
        }
      };

      this._peerConnection.ontrack = (event) => {
        console.log('[Discord Stream] Track received:', event.track.kind, 'mid:', event.transceiver?.mid);

        if (event.track.kind === 'video') {
          const stream = event.streams[0] || new MediaStream([event.track]);
          useDiscordVoiceStore.getState().setWatchingStreamMedia(stream);
          useDiscordVoiceStore.getState().setStreamConnectionState('connected');

          event.track.onended = () => {
            useDiscordVoiceStore.getState().setWatchingStreamMedia(null);
          };
          event.track.onmute = () => {
            useDiscordVoiceStore.getState().setWatchingStreamMedia(null);
          };
          event.track.onunmute = () => {
            useDiscordVoiceStore.getState().setWatchingStreamMedia(stream);
          };
        } else if (event.track.kind === 'audio') {
          const stream = event.streams[0] || new MediaStream([event.track]);
          const audio = new Audio();
          audio.srcObject = stream;
          audio.autoplay = true;
          audio.play().catch(() => {});
        }
      };

      // Match Discord's transceiver layout: 1 sendonly audio + 1 recvonly video + 10 recvonly audio + 10 recvonly video
      this._peerConnection.addTransceiver('audio', { direction: 'sendonly' });
      this._peerConnection.addTransceiver('video', { direction: 'recvonly' });
      for (let i = 0; i < 10; i++) {
        this._peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      }
      for (let i = 0; i < 10; i++) {
        this._peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }

      const offer = await this._peerConnection.createOffer();
      await this._peerConnection.setLocalDescription(offer);

      const offerSdp = offer.sdp || '';

      // Extract ICE credentials from the offer
      const iceUfrag = offerSdp.match(/a=ice-ufrag:(\S+)/)?.[1] || '';
      const icePwd = offerSdp.match(/a=ice-pwd:(\S+)/)?.[1] || '';
      const fp = offerSdp.match(/a=fingerprint:(\S+ \S+)/)?.[1] || '';

      // Build SDP exactly like Discord's client
      const selectSdp = [
        'a=extmap-allow-mixed',
        `a=ice-ufrag:${iceUfrag}`,
        `a=ice-pwd:${icePwd}`,
        'a=ice-options:trickle',
        `a=fingerprint:${fp}`,
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
        'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
        'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
        'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid',
        'a=rtpmap:111 opus/48000/2',
        'a=extmap:14 urn:ietf:params:rtp-hdrext:toffset',
        'a=extmap:13 urn:3gpp:video-orientation',
        'a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay',
        'a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type',
        'a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing',
        'a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space',
        'a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
        'a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id',
        'a=rtpmap:96 VP8/90000',
        'a=rtpmap:97 rtx/90000',
      ].join('\n');

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
          rtc_connection_id: crypto.randomUUID(),
        },
      });

      // MEDIA_SINK_WANTS is sent after we receive the VIDEO opcode with the SSRC
    } catch (err) {
      console.error('[Discord Stream] WebRTC setup failed:', err);
      this.stopWatching();
    }
  },

  async _handleSessionDescription(data: any) {
    if (!this._peerConnection) return;

    try {
      console.log('[Discord Stream] SESSION_DESCRIPTION received:', JSON.stringify(data).substring(0, 300));

      const rawSdp: string = data.sdp || '';
      const iceUfrag = rawSdp.match(/a=ice-ufrag:(\S+)/)?.[1] || '';
      const icePwd = rawSdp.match(/a=ice-pwd:(\S+)/)?.[1] || '';
      const fingerprint = rawSdp.match(/a=fingerprint:(\S+ \S+)/)?.[1] || '';
      const candidates = [...rawSdp.matchAll(/a=candidate:(.+)/g)].map((m) => m[1]);
      const connectionLine = rawSdp.match(/c=IN IP4 (\S+)/)?.[0] || 'c=IN IP4 0.0.0.0';
      const port = rawSdp.match(/m=audio (\d+)/)?.[1] || '9';

      // Build SDP answer manually (same approach as main voice service)
      const transceivers = this._peerConnection.getTransceivers();
      const mids = transceivers.map((_, i) => i).join(' ');

      const iceBlock = [
        `a=ice-ufrag:${iceUfrag}`,
        `a=ice-pwd:${icePwd}`,
        `a=fingerprint:${fingerprint}`,
        ...candidates.map((c: string) => `a=candidate:${c}`),
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

      const lines: string[] = [
        'v=0',
        'o=- 1420070400000 0 IN IP4 127.0.0.1',
        's=-',
        't=0 0',
        'a=msid-semantic: WMS *',
        `a=group:BUNDLE ${mids}`,
      ];

      for (let i = 0; i < transceivers.length; i++) {
        const kind = transceivers[i].receiver.track.kind;
        const isAudio = kind === 'audio';

        if (isAudio) {
          // mid 0 = our sendonly audio (answer: recvonly), rest = inactive
          const direction = i === 0 ? 'recvonly' : 'inactive';
          lines.push(
            `m=audio ${port} UDP/TLS/RTP/SAVPF 111`,
            connectionLine,
            'a=rtpmap:111 opus/48000/2',
            'a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1',
            `a=rtcp:${port}`,
            'a=rtcp-fb:111 transport-cc',
            ...audioExtmaps,
            'a=setup:passive',
            `a=mid:${i}`,
            'a=maxptime:60',
            `a=${direction}`,
            ...iceBlock,
            'a=rtcp-mux',
          );
        } else {
          // mid 1 = video recvonly (answer: sendonly with stream SSRC), rest = inactive
          const isStreamVideo = i === 1;
          const direction = isStreamVideo ? 'sendonly' : 'inactive';
          lines.push(
            `m=video ${port} UDP/TLS/RTP/SAVPF 103 104`,
            connectionLine,
            'a=rtpmap:103 H264/90000',
            'a=fmtp:103 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
            'a=rtcp-fb:103 transport-cc',
            'a=rtcp-fb:103 ccm fir',
            'a=rtcp-fb:103 nack',
            'a=rtcp-fb:103 nack pli',
            'a=rtpmap:104 rtx/90000',
            'a=fmtp:104 apt=103',
            ...videoExtmaps,
            'a=setup:passive',
            `a=mid:${i}`,
            `a=${direction}`,
            ...iceBlock,
            'a=rtcp-mux',
          );
        }
      }

      const answerSdp = lines.join('\r\n') + '\r\n';
      console.log('[Discord Stream] Answer SDP (first 500):', answerSdp.substring(0, 500));

      await this._peerConnection.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
      );
      console.log('[Discord Stream] Remote description set successfully');

      useDiscordVoiceStore.getState().setStreamConnectionState('connected');
    } catch (err) {
      console.error('[Discord Stream] Failed to set remote description:', err);
    }
  },

  _setupEncodedTransforms() {
    if (!this._peerConnection || !this._worker) return;

    const receivers = this._peerConnection.getReceivers();
    console.log('[Discord Stream] Setting up encoded transforms, receivers:', receivers.length);

    // Check if createEncodedStreams is available
    if (receivers.length > 0) {
      // @ts-ignore
      const hasApi = typeof receivers[0].createEncodedStreams === 'function';
      console.log('[Discord Stream] createEncodedStreams available:', hasApi);
      if (!hasApi) {
        console.error('[Discord Stream] createEncodedStreams NOT available! encodedInsertableStreams may not be enabled.');
        return;
      }
    }

    // Receiver transforms for all incoming tracks (audio + video)
    for (const receiver of receivers) {
      // @ts-ignore
      if (receiver._daveTransformSetUp) continue;
      this._transferReceiverTransform(receiver);
    }

    // Handle future tracks
    this._peerConnection.addEventListener('track', (event) => {
      if (event.receiver) {
        // @ts-ignore
        if (!event.receiver._daveTransformSetUp) {
          console.log('[Discord Stream] Late track, setting up transform for:', event.track.kind);
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
      // @ts-ignore - createEncodedStreams is a Chrome/Electron API
      const streams = receiver.createEncodedStreams?.();
      if (!streams) {
        console.warn('[Discord Stream] createEncodedStreams() returned null for', receiver.track?.kind);
        return;
      }
      const { readable, writable } = streams;
      console.log('[Discord Stream] createEncodedStreams() succeeded for', receiver.track?.kind, 'readable:', !!readable, 'writable:', !!writable);
      this._worker.postMessage(
        { type: 'setupReceiverTransform', readable, writable },
        // @ts-ignore - transferable streams
        [readable, writable],
      );
      console.log('[Discord Stream] Receiver transform transferred to worker, kind:', receiver.track?.kind);
    } catch (err) {
      console.warn('[Discord Stream] Failed to transfer receiver transform:', err);
    }
  },

  _disconnectWorker() {
    if (this._worker) {
      this._worker.postMessage({ type: 'disconnect' });
      this._worker.terminate();
      this._worker = null;
    }
  },

  _cleanup() {
    this._disconnectWorker();

    if (this._peerConnection) {
      this._peerConnection.close();
      this._peerConnection = null;
    }

    this._serverSdpInfo = null;
    this._ssrc = 0;
    this._remoteSsrcs.clear();
    this._pendingServer = null;
    this._pendingSessionId = null;
    this._rtcServerId = null;
    this._rtcChannelId = null;
    this._daveReady = false;
    this._pendingSessionDesc = null;
  },

  /**
   * Handle STREAM_DELETE dispatch — the streamer stopped or we were kicked.
   */
  handleStreamDelete(data: any) {
    const store = useDiscordVoiceStore.getState();
    if (data.stream_key === store.watchingStreamKey) {
      this._cleanup();
      store.setWatchingStream(null);
      store.setStreamConnectionState('disconnected');
      store.setWatchingStreamMedia(null);
    }
  },

  /**
   * Called by DiscordVoiceService when the user leaves voice entirely.
   */
  disconnectAll() {
    const store = useDiscordVoiceStore.getState();
    if (store.watchingStreamKey) {
      this.stopWatching();
    }
  },
};
