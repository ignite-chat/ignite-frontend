import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordRelationshipsStore } from '../store/discord-relationships.store';

// Discord Gateway Opcodes
const GatewayOp = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  PRESENCE_UPDATE: 3,
  VOICE_STATE_UPDATE: 4,
  RESUME: 6,
  RECONNECT: 7,
  REQUEST_GUILD_MEMBERS: 8,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

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

type GatewayEventHandler = (data: any) => void;

export const DiscordGatewayService = {
  ws: null as WebSocket | null,
  heartbeatInterval: null as ReturnType<typeof setInterval> | null,
  heartbeatAcked: true,
  lastSequence: null as number | null,
  resumeGatewayUrl: null as string | null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  intentionalClose: false,

  // External event handler for the orchestration service
  onDispatch: null as GatewayEventHandler | null,

  /**
   * Connect to the Discord gateway.
   */
  connect(token: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('[Discord Gateway] Already connected or connecting');
      return;
    }

    this.intentionalClose = false;
    const url = this.resumeGatewayUrl || GATEWAY_URL;
    console.log(`[Discord Gateway] Connecting to ${url}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[Discord Gateway] WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this._handleMessage(JSON.parse(event.data), token);
    };

    this.ws.onclose = (event) => {
      console.log(`[Discord Gateway] WebSocket closed: ${event.code} ${event.reason}`);
      this._stopHeartbeat();
      useDiscordStore.getState().setConnected(false);

      if (!this.intentionalClose && event.code !== 4004) {
        this._reconnect(token);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[Discord Gateway] WebSocket error:', error);
    };
  },

  /**
   * Disconnect from the gateway.
   */
  disconnect() {
    this.intentionalClose = true;
    this._stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
    this.lastSequence = null;
    this.resumeGatewayUrl = null;
    this.reconnectAttempts = 0;
    useDiscordStore.getState().setConnected(false);
  },

  /**
   * Send a payload to the gateway.
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  /**
   * Handle an incoming gateway message.
   */
  _handleMessage(payload: any, token: string) {
    const { op, d, s, t } = payload;

    // Update sequence number for heartbeats
    if (s !== null && s !== undefined) {
      this.lastSequence = s;
    }

    switch (op) {
      case GatewayOp.HELLO:
        this._handleHello(d, token);
        break;

      case GatewayOp.DISPATCH:
        this._handleDispatch(t, d);
        break;

      case GatewayOp.HEARTBEAT:
        // Server requested an immediate heartbeat
        this._sendHeartbeat();
        break;

      case GatewayOp.RECONNECT:
        console.log('[Discord Gateway] Server requested reconnect');
        this.ws?.close(4000, 'Reconnect requested');
        break;

      case GatewayOp.INVALID_SESSION:
        console.log('[Discord Gateway] Invalid session, resumable:', d);
        if (!d) {
          // Not resumable — full re-identify after delay
          this.lastSequence = null;
          this.resumeGatewayUrl = null;
          useDiscordStore.getState().setSessionId(null);
        }
        setTimeout(() => {
          if (d && useDiscordStore.getState().sessionId) {
            this._sendResume(token);
          } else {
            this._sendIdentify(token);
          }
        }, 1000 + Math.random() * 4000);
        break;

      case GatewayOp.HEARTBEAT_ACK:
        this.heartbeatAcked = true;
        break;

      default:
        console.log(`[Discord Gateway] Unhandled opcode: ${op}`);
    }
  },

  /**
   * Handle HELLO — start heartbeating and identify.
   */
  _handleHello(data: any, token: string) {
    const { heartbeat_interval } = data;
    console.log(`[Discord Gateway] HELLO received, heartbeat interval: ${heartbeat_interval}ms`);

    this._startHeartbeat(heartbeat_interval);

    // If we have a session, attempt resume, otherwise identify
    const sessionId = useDiscordStore.getState().sessionId;
    if (sessionId && this.lastSequence !== null) {
      this._sendResume(token);
    } else {
      this._sendIdentify(token);
    }
  },

  /**
   * Handle DISPATCH events by routing to the appropriate handler.
   */
  _handleDispatch(eventName: string, data: any) {
    console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);

    switch (eventName) {
      case 'READY':
        this._handleReady(data);
        break;
      case 'RESUMED':
        console.log('[Discord Gateway] Successfully resumed');
        break;
      case 'GUILD_CREATE':
        this._handleGuildCreate(data);
        break;
      case 'GUILD_UPDATE':
        this._handleGuildUpdate(data);
        break;
      case 'GUILD_DELETE':
        this._handleGuildDelete(data);
        break;
      case 'CHANNEL_CREATE':
        this._handleChannelCreate(data);
        break;
      case 'CHANNEL_UPDATE':
        this._handleChannelUpdate(data);
        break;
      case 'CHANNEL_DELETE':
        this._handleChannelDelete(data);
        break;
      case 'MESSAGE_CREATE':
        this._handleMessageCreate(data);
        break;
      case 'MESSAGE_UPDATE':
        this._handleMessageUpdate(data);
        break;
      case 'MESSAGE_DELETE':
        this._handleMessageDelete(data);
        break;
      case 'MESSAGE_ACK':
        this._handleMessageAck(data);
        break;
      case 'RELATIONSHIP_ADD':
        if (data.user) {
          useDiscordUsersStore.getState().addUser(data.user);
        }
        useDiscordRelationshipsStore.getState().addRelationship({ id: data.id, type: data.type, nickname: data.nickname, since: data.since });
        break;
      case 'RELATIONSHIP_REMOVE':
        useDiscordRelationshipsStore.getState().removeRelationship(data.id);
        break;
      case 'RELATIONSHIP_UPDATE':
        useDiscordRelationshipsStore.getState().updateRelationship(data.id, { type: data.type, nickname: data.nickname });
        break;
      case 'PRESENCE_UPDATE': {
        const presenceUserId = data.user?.id || data.user_id;
        if (presenceUserId) {
          useDiscordUsersStore.getState().updatePresence({
            user_id: presenceUserId,
            status: data.status,
            activities: data.activities,
            client_status: data.client_status,
          });
        }
        break;
      }
      default:
        // Forward unhandled events to the external handler if set
        break;
    }

    // Always call the external dispatch handler if set
    if (this.onDispatch) {
      this.onDispatch({ event: eventName, data });
    }
  },

  // ─── Dispatch Event Handlers ──────────────────────────────────────

  _handleReady(data: any) {
    const { user, guilds, session_id, resume_gateway_url, private_channels, users, read_state, merged_members, relationships, presences } = data;

    console.log(`[Discord Gateway] READY as ${user.username}#${user.discriminator} (${user.id})`);
    console.log(`[Discord Gateway] ${guilds.length} guilds, ${private_channels?.length || 0} DMs, ${users?.length || 0} users`);

    useDiscordStore.getState().setUser(user);
    useDiscordStore.getState().setSessionId(session_id);
    useDiscordStore.getState().setConnected(true);

    if (resume_gateway_url) {
      this.resumeGatewayUrl = resume_gateway_url;
    }

    useDiscordGuildsStore.getState().setGuilds(guilds);

    // Extract channels and member data from READY guilds
    // merged_members is a top-level array ordered the same as guilds —
    // merged_members[i] contains an array of member objects for guilds[i]
    const allGuildChannels: any[] = [];
    for (let i = 0; i < guilds.length; i++) {
      const guild = guilds[i];
      if (guild.channels?.length > 0) {
        for (const ch of guild.channels) {
          allGuildChannels.push({ ...ch, guild_id: guild.id });
        }
      }
      // Extract current user's member data for permissions
      const memberGroup = merged_members?.[i];
      if (memberGroup?.length > 0) {
        useDiscordGuildsStore.getState().setGuildMembers(guild.id, memberGroup);
      }
    }
    if (allGuildChannels.length > 0) {
      useDiscordChannelsStore.getState().setChannels(allGuildChannels);
    }

    // Store users from READY payload
    if (users && users.length > 0) {
      useDiscordUsersStore.getState().setUsers(users);
    }

    // Store read states
    if (read_state?.entries?.length > 0) {
      useDiscordReadStatesStore.getState().setReadStates(read_state.entries);
    }

    // Store private channels (DMs and group DMs)
    if (private_channels && private_channels.length > 0) {
      const channelsStore = useDiscordChannelsStore.getState();
      for (const channel of private_channels) {
        channelsStore.addChannel(channel);
      }
    }

    // Store relationships (friends, blocked, pending requests)
    // Extract embedded users into the users store, keep relationships lean
    if (relationships && relationships.length > 0) {
      const relationshipUsers = relationships.filter((r: any) => r.user).map((r: any) => r.user);
      if (relationshipUsers.length > 0) {
        useDiscordUsersStore.getState().addUsers(relationshipUsers);
      }
      useDiscordRelationshipsStore.getState().setRelationships(
        relationships.map((r: any) => ({ id: r.id, type: r.type, nickname: r.nickname, since: r.since }))
      );
    }

    // Store presences (online status of friends) on the users store
    // Discord v9 sends friend presences in merged_presences.friends
    const friendPresences = data.merged_presences?.friends || presences || [];
    if (friendPresences.length > 0) {
      useDiscordUsersStore.getState().setPresences(
        friendPresences.map((p: any) => ({
          user_id: p.user?.id || p.user_id,
          status: p.status,
          activities: p.activities,
          client_status: p.client_status,
        }))
      );
    }
  },

  _handleGuildCreate(data: any) {
    useDiscordGuildsStore.getState().addGuild(data);

    // Store current user's member data for permission resolution
    const currentUserId = useDiscordStore.getState().user?.id;
    if (currentUserId) {
      // merged_members is an array of arrays; find the current user's entry
      const mergedMembers = data.merged_members || [];
      const members = data.members || [];
      let currentMember = members.find((m: any) => m.user?.id === currentUserId || m.user_id === currentUserId);
      if (!currentMember) {
        for (const group of mergedMembers) {
          const found = group?.find?.((m: any) => m.user?.id === currentUserId || m.user_id === currentUserId);
          if (found) {
            currentMember = found;
            break;
          }
        }
      }
      if (currentMember) {
        useDiscordGuildsStore.getState().setGuildMembers(data.id, [currentMember]);
      }
    }

    // Store the guild's channels
    if (data.channels && data.channels.length > 0) {
      const channels = data.channels.map((c: any) => ({
        ...c,
        guild_id: data.id,
      }));
      const { channels: existing, setChannels } = useDiscordChannelsStore.getState();
      const otherChannels = existing.filter((c) => c.guild_id !== data.id);
      setChannels([...otherChannels, ...channels]);
    }
  },

  _handleGuildUpdate(data: any) {
    useDiscordGuildsStore.getState().updateGuild(data.id, {
      name: data.name,
      icon: data.icon,
    });
  },

  _handleGuildDelete(data: any) {
    useDiscordGuildsStore.getState().removeGuild(data.id);
    // Also remove channels belonging to this guild
    const { channels, setChannels } = useDiscordChannelsStore.getState();
    setChannels(channels.filter((c) => c.guild_id !== data.id));
  },

  _handleChannelCreate(data: any) {
    useDiscordChannelsStore.getState().addChannel(data);
  },

  _handleChannelUpdate(data: any) {
    useDiscordChannelsStore.getState().updateChannel(data.id, data);
  },

  _handleChannelDelete(data: any) {
    useDiscordChannelsStore.getState().removeChannel(data.id);
  },

  _handleMessageCreate(data: any) {
    useDiscordChannelsStore.getState().appendMessage(data.channel_id, data);

    // Update last_message_id on the channel
    useDiscordChannelsStore.getState().updateChannel(data.channel_id, {
      last_message_id: data.id,
    });
  },

  _handleMessageUpdate(data: any) {
    if (data.id && data.channel_id) {
      useDiscordChannelsStore.getState().updateMessage(data.channel_id, data.id, data);
    }
  },

  _handleMessageDelete(data: any) {
    if (data.id && data.channel_id) {
      useDiscordChannelsStore.getState().removeMessage(data.channel_id, data.id);
    }
  },

  _handleMessageAck(data: any) {
    if (data.channel_id && data.message_id) {
      useDiscordReadStatesStore.getState().ackChannel(data.channel_id, data.message_id);
    }
  },

  // ─── Heartbeat ────────────────────────────────────────────────────

  _startHeartbeat(intervalMs: number) {
    this._stopHeartbeat();
    this.heartbeatAcked = true;

    // Send first heartbeat after a random jitter (as per Discord docs)
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
  },

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },

  _sendHeartbeat() {
    this.heartbeatAcked = false;
    this.send({ op: GatewayOp.HEARTBEAT, d: this.lastSequence });
  },

  // ─── Identify / Resume ───────────────────────────────────────────

  _sendIdentify(token: string) {
    console.log('[Discord Gateway] Sending IDENTIFY');
    this.send({
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
  },

  _sendResume(token: string) {
    const sessionId = useDiscordStore.getState().sessionId;
    console.log(`[Discord Gateway] Sending RESUME (session: ${sessionId})`);
    this.send({
      op: GatewayOp.RESUME,
      d: {
        token,
        session_id: sessionId,
        seq: this.lastSequence,
      },
    });
  },

  // ─── Reconnect ────────────────────────────────────────────────────

  _reconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Discord Gateway] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[Discord Gateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(token);
    }, delay);
  },
};
