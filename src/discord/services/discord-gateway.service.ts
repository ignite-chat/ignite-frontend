import { toast } from 'sonner';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordRelationshipsStore } from '../store/discord-relationships.store';
import { useDiscordMemberListStore } from '../store/discord-member-list.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordActivitiesStore } from '../store/discord-activities.store';
import { useDiscordTypingStore } from '../store/discord-typing.store';
import { useDiscordThreadsStore } from '../store/discord-threads.store';
import { useDiscordVoiceStatesStore } from '../store/discord-voice-states.store';
import { useDiscordGuildSettingsStore } from '../store/discord-guild-settings.store';
import { DiscordVoiceService } from './discord-voice.service';

/** Sync activities to the dedicated store from a list of presences */
function syncActivities(presences: { user_id: string; activities?: any[] }[]) {
  const entries = presences
    .filter((p) => p.user_id)
    .map((p) => ({ userId: p.user_id, activities: p.activities || [] }));
  if (entries.length > 0) {
    useDiscordActivitiesStore.getState().setMany(entries);
  }
}

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
  GUILD_SUBSCRIPTIONS: 37,
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

import type { GatewayEventHandler } from '../types';

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

      if (event.code === 4004) {
        toast.error('Discord authentication failed. Your token may be invalid.', { duration: Infinity });
        return;
      }

      if (!this.intentionalClose) {
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
   * Send a full guild subscription for a channel — requests member sidebar,
   * typing indicators, threads, activities, and optionally specific member IDs.
   */
  subscribeGuild(guildId: string, channelId: string, memberIds: string[] = [], range: [number, number] = [0, 99]) {
    // Mark that we're waiting for a fresh SYNC — any INVALIDATE arriving
    // before the SYNC belongs to the old subscription and should be ignored.
    useDiscordMemberListStore.getState().markPendingSync(guildId);
    this.send({
      op: GatewayOp.GUILD_SUBSCRIPTIONS,
      d: {
        subscriptions: {
          [guildId]: {
            typing: true,
            threads: true,
            activities: true,
            members: memberIds,
            member_updates: false,
            channels: {
              [channelId]: [range],
            },
            thread_member_lists: [],
          },
        },
      },
    });
  },

  /**
   * Request full member data for specific user IDs via Opcode 8.
   * Discord responds with GUILD_MEMBERS_CHUNK events.
   */
  requestGuildMembers(guildId: string, userIds: string[]) {
    if (!userIds.length) return;
    // Discord limits to 100 user IDs per request
    for (let i = 0; i < userIds.length; i += 100) {
      this.send({
        op: GatewayOp.REQUEST_GUILD_MEMBERS,
        d: {
          guild_id: guildId,
          user_ids: userIds.slice(i, i + 100),
        },
      });
    }
  },

  /**
   * Update the member list range for a channel (e.g. when scrolling the member sidebar).
   */
  updateMemberListRange(guildId: string, channelId: string, ranges: [number, number][]) {
    this.send({
      op: GatewayOp.GUILD_SUBSCRIPTIONS,
      d: {
        subscriptions: {
          [guildId]: {
            typing: true,
            threads: true,
            activities: true,
            members: [],
            member_updates: false,
            channels: {
              [channelId]: ranges,
            },
            thread_member_lists: [],
          },
        },
      },
    });
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
    //console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);

    switch (eventName) {
      case 'READY':
        this._handleReady(data);
        break;
      case 'READY_SUPPLEMENTAL':
        this._handleReadySupplemental(data);
        break;
      case 'RESUMED':
        useDiscordStore.getState().setConnected(true);
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
      case 'GUILD_MEMBERS_CHUNK':
        this._handleGuildMembersChunk(data);
        break;
      case 'GUILD_MEMBER_UPDATE':
        this._handleGuildMemberUpdate(data);
        break;
      case 'GUILD_MEMBER_LIST_UPDATE':
        this._handleGuildMemberListUpdate(data);
        break;
      case 'MESSAGE_REACTION_ADD_MANY': {
        const { channel_id, message_id, reactions: incomingReactions } = data;
        if (!channel_id || !message_id || !incomingReactions) break;
        const messages = useDiscordChannelsStore.getState().channelMessages[channel_id];
        const msg = messages?.find((m: any) => m.id === message_id);
        const threadFirstMsg = useDiscordThreadsStore.getState().findFirstMessage(channel_id);
        const sourceMsg = msg || threadFirstMsg;
        if (!sourceMsg) break;
        const existing = [...(sourceMsg.reactions || [])];
        for (const r of incomingReactions) {
          const emoji = r.emoji;
          const idx = existing.findIndex((e: any) =>
            emoji.id ? e.emoji.id === emoji.id : e.emoji.name === emoji.name
          );
          if (idx >= 0) {
            existing[idx] = {
              ...existing[idx],
              count: existing[idx].count + r.count,
              count_details: {
                burst: (existing[idx].count_details?.burst || 0) + (r.burst_count || 0),
                normal: (existing[idx].count_details?.normal || 0) + (r.normal_count || r.count),
              },
            };
          } else {
            existing.push({
              emoji,
              count: r.count,
              count_details: {
                burst: r.burst_count || 0,
                normal: r.normal_count || r.count,
              },
              me: false,
              me_burst: false,
            });
          }
        }
        if (msg) useDiscordChannelsStore.getState().updateMessage(channel_id, message_id, { reactions: existing });
        if (threadFirstMsg) useDiscordThreadsStore.getState().updateFirstMessage(channel_id, { reactions: existing });
        break;
      }
      case 'MESSAGE_REACTION_ADD': {
        const { channel_id, message_id, user_id, emoji, burst } = data;
        if (!channel_id || !message_id || !emoji) break;
        const raMessages = useDiscordChannelsStore.getState().channelMessages[channel_id];
        const raMsg = raMessages?.find((m: any) => m.id === message_id);
        const raThreadFirstMsg = useDiscordThreadsStore.getState().findFirstMessage(channel_id);
        const raSourceMsg = raMsg || raThreadFirstMsg;
        if (!raSourceMsg) break;
        const raExisting = [...(raSourceMsg.reactions || [])];
        const raIdx = raExisting.findIndex((e: any) =>
          emoji.id ? e.emoji.id === emoji.id : e.emoji.name === emoji.name
        );
        const currentUserId = useDiscordStore.getState().user?.id;
        const isMe = user_id === currentUserId;
        if (raIdx >= 0) {
          raExisting[raIdx] = {
            ...raExisting[raIdx],
            count: raExisting[raIdx].count + 1,
            count_details: {
              burst: (raExisting[raIdx].count_details?.burst || 0) + (burst ? 1 : 0),
              normal: (raExisting[raIdx].count_details?.normal || 0) + (burst ? 0 : 1),
            },
            me: isMe ? true : raExisting[raIdx].me,
            me_burst: isMe && burst ? true : raExisting[raIdx].me_burst,
          };
        } else {
          raExisting.push({
            emoji,
            count: 1,
            count_details: { burst: burst ? 1 : 0, normal: burst ? 0 : 1 },
            me: isMe,
            me_burst: isMe && !!burst,
          });
        }
        if (raMsg) useDiscordChannelsStore.getState().updateMessage(channel_id, message_id, { reactions: raExisting });
        if (raThreadFirstMsg) useDiscordThreadsStore.getState().updateFirstMessage(channel_id, { reactions: raExisting });
        break;
      }
      case 'MESSAGE_REACTION_REMOVE': {
        const { channel_id, message_id, user_id, emoji, burst } = data;
        if (!channel_id || !message_id || !emoji) break;
        const rrMessages = useDiscordChannelsStore.getState().channelMessages[channel_id];
        const rrMsg = rrMessages?.find((m: any) => m.id === message_id);
        const rrThreadFirstMsg = useDiscordThreadsStore.getState().findFirstMessage(channel_id);
        const rrSourceMsg = rrMsg || rrThreadFirstMsg;
        if (!rrSourceMsg) break;
        let rrExisting = [...(rrSourceMsg.reactions || [])];
        const rrIdx = rrExisting.findIndex((e: any) =>
          emoji.id ? e.emoji.id === emoji.id : e.emoji.name === emoji.name
        );
        if (rrIdx < 0) break;
        const rrCurrentUserId = useDiscordStore.getState().user?.id;
        const rrIsMe = user_id === rrCurrentUserId;
        const updated = {
          ...rrExisting[rrIdx],
          count: rrExisting[rrIdx].count - 1,
          count_details: {
            burst: Math.max(0, (rrExisting[rrIdx].count_details?.burst || 0) - (burst ? 1 : 0)),
            normal: Math.max(0, (rrExisting[rrIdx].count_details?.normal || 0) - (burst ? 0 : 1)),
          },
          me: rrIsMe && !burst ? false : rrExisting[rrIdx].me,
          me_burst: rrIsMe && burst ? false : rrExisting[rrIdx].me_burst,
        };
        if (updated.count <= 0) {
          rrExisting.splice(rrIdx, 1);
        } else {
          rrExisting[rrIdx] = updated;
        }
        if (rrMsg) useDiscordChannelsStore.getState().updateMessage(channel_id, message_id, { reactions: rrExisting });
        if (rrThreadFirstMsg) useDiscordThreadsStore.getState().updateFirstMessage(channel_id, { reactions: rrExisting });
        break;
      }
      case 'VOICE_STATE_UPDATE':
        if (data.guild_id) {
          useDiscordVoiceStatesStore.getState().updateVoiceState(data);
        }
        // Forward our own voice state to the voice service for connection handshake
        DiscordVoiceService.handleVoiceStateUpdate(data);
        break;
      case 'VOICE_STATE_UPDATE_BATCH':
        if (data.voice_states?.length > 0) {
          useDiscordVoiceStatesStore.getState().updateVoiceStateBatch(data.voice_states);
        }
        break;
      case 'VOICE_SERVER_UPDATE':
        DiscordVoiceService.handleVoiceServerUpdate(data);
        break;
      case 'TYPING_START': {
        const typingUserId = data.user_id;
        const currentUserId = useDiscordStore.getState().user?.id;
        if (typingUserId && typingUserId !== currentUserId) {
          const username = data.member?.user?.global_name || data.member?.user?.username || data.member?.nick || 'Someone';
          const avatar = data.member?.user?.avatar || null;
          useDiscordTypingStore.getState().addTypingUser(data.channel_id, { user_id: typingUserId, username, avatar });
        }
        break;
      }
      case 'PRESENCE_UPDATE': {
        const presenceUserId = data.user?.id || data.user_id;
        if (presenceUserId) {
          const presence = {
            user_id: presenceUserId,
            status: data.status,
            activities: data.activities,
            client_status: data.client_status,
          };
          useDiscordUsersStore.getState().updatePresence(presence);
          syncActivities([presence]);
        }
        break;
      }
      case 'SESSIONS_REPLACE': {
        // data is an array of sessions — derive the current user's active status
        // Pick the most "active" session status: online > idle > dnd > offline
        const currentUserId = useDiscordStore.getState().user?.id;
        if (currentUserId && Array.isArray(data) && data.length > 0) {
          const statusPriority: Record<string, number> = { online: 3, dnd: 2, idle: 1, offline: 0 };
          let bestStatus = 'offline';
          let bestActivities: any[] = [];
          let bestClientStatus: any = {};
          for (const session of data) {
            const s = session.status || 'offline';
            if ((statusPriority[s] ?? 0) > (statusPriority[bestStatus] ?? 0)) {
              bestStatus = s;
              bestActivities = session.activities || [];
              bestClientStatus = session.client_status || {};
            }
          }
          useDiscordUsersStore.getState().updatePresence({
            user_id: currentUserId,
            status: bestStatus as any,
            activities: bestActivities,
            client_status: bestClientStatus,
          });
          syncActivities([{ user_id: currentUserId, activities: bestActivities }]);
        }
        break;
      }
      case 'PASSIVE_UPDATE_V2':
        this._handlePassiveUpdateV2(data);
        break;
      case 'USER_GUILD_SETTINGS_UPDATE':
        this._handleUserGuildSettingsUpdate(data);
        break;
      default:
        console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);
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

    console.log('[Discord Gateway] READY received', data);

    useDiscordStore.getState().setUser(user);
    useDiscordStore.getState().setSessionId(session_id);
    useDiscordStore.getState().setConnected(true);

    // Store the current user in the users store so presence can be tracked
    useDiscordUsersStore.getState().addUser({ ...user, status: 'online' });

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
      // merged_members entries often lack user/user_id — tag them with the current user's ID
      const memberGroup = merged_members?.[i];
      if (memberGroup?.length > 0) {
        const tagged = memberGroup.map((m: any) => {
          if (!m.user_id && !m.user?.id) return { ...m, user_id: user.id };
          return m;
        });
        useDiscordGuildsStore.getState().setGuildMembers(guild.id, tagged);
        useDiscordMembersStore.getState().addMembers(guild.id, tagged);
      }
    }
    if (allGuildChannels.length > 0) {
      useDiscordChannelsStore.getState().setChannels(allGuildChannels);
    }

    // Store initial voice states from each guild
    for (const guild of guilds) {
      if (guild.voice_states?.length > 0) {
        useDiscordVoiceStatesStore.getState().setGuildVoiceStates(
          guild.id,
          guild.voice_states.map((vs: any) => ({ ...vs, guild_id: guild.id }))
        );
      }
    }

    // Store users from READY payload
    if (users && users.length > 0) {
      useDiscordUsersStore.getState().setUsers(users);
    }

    // Store read states
    if (read_state?.entries?.length > 0) {
      useDiscordReadStatesStore.getState().setReadStates(read_state.entries);
    }

    // Store user guild settings (mute, notification preferences, etc.)
    // READY sends { entries: [...] } or a flat array depending on gateway version
    const guildSettingsEntries = data.user_guild_settings?.entries ?? data.user_guild_settings;
    if (Array.isArray(guildSettingsEntries) && guildSettingsEntries.length > 0) {
      useDiscordGuildSettingsStore.getState().setAllSettings(guildSettingsEntries);
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
      const mapped = friendPresences.map((p: any) => ({
        user_id: p.user?.id || p.user_id,
        status: p.status,
        activities: p.activities,
        client_status: p.client_status,
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handleReadySupplemental(data: any) {
    console.log('[Discord Gateway] READY_SUPPLEMENTAL received', data);

    const { guilds, merged_members, merged_presences } = data;

    // merged_members[i] corresponds to guilds[i] — store member data
    // Tag entries missing user_id with the current user's ID and merge (don't replace)
    const currentUserId = useDiscordStore.getState().user?.id;
    if (guilds && merged_members) {
      for (let i = 0; i < guilds.length; i++) {
        const guildId = guilds[i].id;
        const members = merged_members[i];
        if (members?.length > 0) {
          const tagged = members.map((m: any) => {
            if (!m.user_id && !m.user?.id && currentUserId) return { ...m, user_id: currentUserId };
            return m;
          });
          useDiscordGuildsStore.getState().addGuildMembers(guildId, tagged);
          useDiscordMembersStore.getState().addMembers(guildId, tagged);
        }
      }
    }

    // Upsert voice states from each guild
    if (guilds) {
      for (const guild of guilds) {
        if (guild.voice_states?.length > 0) {
          useDiscordVoiceStatesStore.getState().setGuildVoiceStates(
            guild.id,
            guild.voice_states.map((vs: any) => ({ ...vs, guild_id: guild.id }))
          );
        }
      }
    }

    // Guild presences from merged_presences.guilds[i] correspond to guilds[i]
    if (merged_presences?.guilds && guilds) {
      for (let i = 0; i < guilds.length; i++) {
        const guildPresences = merged_presences.guilds[i];
        if (guildPresences?.length > 0) {
          const mapped = guildPresences.map((p: any) => ({
            user_id: p.user_id,
            status: p.status,
            activities: p.activities,
            client_status: p.client_status,
          }));
          useDiscordUsersStore.getState().setPresences(mapped);
          syncActivities(mapped);
        }
      }
    }

    // Friend presences
    if (merged_presences?.friends?.length > 0) {
      const mapped = merged_presences.friends.map((p: any) => ({
        user_id: p.user_id,
        status: p.status,
        activities: p.activities,
        client_status: p.client_status,
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handlePassiveUpdateV2(data: any) {
    const { guild_id, updated_voice_states, removed_voice_states, updated_channels, updated_members } = data;
    if (!guild_id) return;

    // Upsert updated voice states
    if (updated_voice_states?.length > 0) {
      useDiscordVoiceStatesStore.getState().updateVoiceStateBatch(
        updated_voice_states.map((vs: any) => ({ ...vs, guild_id }))
      );
    }

    // Remove voice states for users who left
    if (removed_voice_states?.length > 0) {
      useDiscordVoiceStatesStore.getState().updateVoiceStateBatch(
        removed_voice_states.map((userId: string) => ({ user_id: userId, channel_id: null, guild_id } as any))
      );
    }

    // Update channel metadata (e.g. last_message_id, last_pin_timestamp)
    if (updated_channels?.length > 0) {
      for (const ch of updated_channels) {
        if (ch.id) {
          useDiscordChannelsStore.getState().updateChannel(ch.id, ch);
        }
      }
    }

    // Upsert members and their user objects
    if (updated_members?.length > 0) {
      useDiscordGuildsStore.getState().addGuildMembers(guild_id, updated_members);
      useDiscordMembersStore.getState().addMembers(guild_id, updated_members);

      const users = updated_members.map((m: any) => m.user).filter(Boolean);
      if (users.length > 0) {
        useDiscordUsersStore.getState().addUsers(users);
      }
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
        useDiscordMembersStore.getState().addMember(data.id, currentMember);
      }
    }

    // Store voice states for the guild
    if (data.voice_states?.length > 0) {
      useDiscordVoiceStatesStore.getState().setGuildVoiceStates(
        data.id,
        data.voice_states.map((vs: any) => ({ ...vs, guild_id: data.id }))
      );
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
    useDiscordMembersStore.getState().removeGuild(data.id);
    useDiscordVoiceStatesStore.getState().removeGuild(data.id);
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
    // Remove matching pending message by nonce
    if (data.nonce) {
      useDiscordChannelsStore.getState().removePendingByNonce(data.channel_id, data.nonce);
    }

    useDiscordChannelsStore.getState().appendMessage(data.channel_id, data);

    // Store the author's and mentioned users' objects in the users store
    if (data.author) {
      useDiscordUsersStore.getState().addUser(data.author);
    }
    if (data.mentions?.length > 0) {
      useDiscordUsersStore.getState().addUsers(data.mentions);
    }

    // Store member data (roles, nick, etc.) in the members store
    if (data.member && data.guild_id && data.author?.id) {
      useDiscordMembersStore.getState().addMember(data.guild_id, {
        ...data.member,
        user: data.author,
      });
    }

    // Update last_message_id on the channel and ack if it's our own message
    const currentUser = useDiscordStore.getState().user;
    const isOwnMessage = currentUser && data.author?.id === currentUser.id;

    useDiscordChannelsStore.getState().updateChannel(data.channel_id, {
      last_message_id: data.id,
    });

    if (isOwnMessage) {
      useDiscordReadStatesStore.getState().ackChannel(data.channel_id, data.id);
      return;
    }

    if (!currentUser) return;

    const guildId = data.guild_id;
    const channelId = data.channel_id;

    if (guildId) {
      const guildSettings = useDiscordGuildSettingsStore.getState().getGuildSettings(guildId);
      const channelOverride = guildSettings?.channel_overrides?.find(
        (o: any) => o.channel_id === channelId,
      );

      // Check if channel or guild is muted
      const channelMuted = channelOverride?.muted;
      const guildMuted = guildSettings?.muted;
      if (channelMuted || guildMuted) return;

      // Determine effective notification level (channel override takes priority)
      // 0 = All Messages, 1 = Only @mentions, 2 = Nothing, 3 = use guild default
      let notifLevel = channelOverride?.message_notifications ?? 3;
      if (notifLevel === 3) notifLevel = guildSettings?.message_notifications ?? 1;
      if (notifLevel === 2) return;

      // Check if the current user is mentioned
      const isDirectMention = data.mentions?.some((m: any) => m.id === currentUser.id);
      const isEveryoneMention =
        data.mention_everyone && !guildSettings?.suppress_everyone;
      const isRoleMention =
        !guildSettings?.suppress_roles &&
        data.mention_roles?.length > 0 &&
        (() => {
          const memberData = useDiscordMembersStore.getState().members[guildId]?.[currentUser.id];
          const roles: string[] = memberData?.roles || [];
          return data.mention_roles.some((r: string) => roles.includes(r));
        })();

      const isMentioned = isDirectMention || isEveryoneMention || isRoleMention;

      // For "All Messages" (0), always count. For "Only @mentions" (1), only count if mentioned.
      if (!isMentioned) return;

      const readStates = useDiscordReadStatesStore.getState();
      const current = readStates.readStates[channelId]?.mention_count ?? 0;
      readStates.updateReadState(channelId, { mention_count: current + 1 });
    }
  },

  _handleMessageUpdate(data: any) {
    if (data.id && data.channel_id) {
      useDiscordChannelsStore.getState().updateMessage(data.channel_id, data.id, data);
    }
  },

  _handleMessageDelete(data: any) {
    if (data.id && data.channel_id) {
      const store = useDiscordChannelsStore.getState();
      const channel = store.channels.find((c) => c.id === data.channel_id);

      store.removeMessage(data.channel_id, data.id);

      // If the deleted message was the channel's last_message_id, roll back to the previous message
      if (channel && channel.last_message_id === data.id) {
        const messages = useDiscordChannelsStore.getState().channelMessages[data.channel_id] || [];
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        store.updateChannel(data.channel_id, {
          last_message_id: lastMsg?.id || null,
        });
      }
    }
  },

  _handleMessageAck(data: any) {
    if (data.channel_id && data.message_id) {
      useDiscordReadStatesStore.getState().ackChannel(data.channel_id, data.message_id);
    }
  },

  _handleUserGuildSettingsUpdate(data: any) {
    // The event can send a single settings object or { entries: [...] }
    if (data.entries && Array.isArray(data.entries)) {
      useDiscordGuildSettingsStore.getState().setAllSettings(data.entries);
    } else if (data.guild_id) {
      useDiscordGuildSettingsStore.getState().updateGuildSettings(data.guild_id, data);
    }
  },

  _handleGuildMembersChunk(data: any) {
    const { guild_id, members, presences } = data;
    if (guild_id && members?.length > 0) {
      useDiscordGuildsStore.getState().addGuildMembers(guild_id, members);
      useDiscordMembersStore.getState().addMembers(guild_id, members);

      // Also store user objects and presences
      const users = members.map((m: any) => m.user).filter(Boolean);
      if (users.length > 0) {
        useDiscordUsersStore.getState().addUsers(users);
      }
    }
    if (presences?.length > 0) {
      const mapped = presences.map((p: any) => ({
        user_id: p.user?.id || p.user_id,
        status: p.status,
        activities: p.activities,
        client_status: p.client_status,
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handleGuildMemberUpdate(data: any) {
    const { guild_id, user, roles, nick } = data;
    if (!guild_id || !user?.id) return;

    const existing = useDiscordGuildsStore.getState().guildMembers[guild_id] || [];
    const idx = existing.findIndex((m) => (m.user?.id || (m as any).user_id) === user.id);

    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = { ...updated[idx], ...data, user };
      useDiscordGuildsStore.getState().setGuildMembers(guild_id, updated);
    } else {
      useDiscordGuildsStore.getState().addGuildMembers(guild_id, [{ ...data, user }]);
    }

    // Update member in dedicated members store
    useDiscordMembersStore.getState().addMember(guild_id, { ...data, user });

    // Update user object in users store
    useDiscordUsersStore.getState().addUser(user);
  },

  _handleGuildMemberListUpdate(data: any) {
    const { guild_id, ops } = data;
    if (!guild_id || !ops) return;

    // Update the member list store (groups + items for the sidebar)
    useDiscordMemberListStore.getState().handleListUpdate(guild_id, data);

    // Also extract members/users/presences into existing stores
    for (const op of ops) {
      if (op.op === 'SYNC' || op.op === 'INSERT' || op.op === 'UPDATE') {
        const items = op.items || (op.item ? [op.item] : []);
        const members = items
          .filter((item: any) => item.member)
          .map((item: any) => item.member);

        if (members.length > 0) {
          useDiscordGuildsStore.getState().addGuildMembers(guild_id, members);
          useDiscordMembersStore.getState().addMembers(guild_id, members);

          const users = members.map((m: any) => m.user).filter(Boolean);
          if (users.length > 0) {
            useDiscordUsersStore.getState().addUsers(users);
          }

          // Extract presences from member items
          const presences = members
            .filter((m: any) => m.presence)
            .map((m: any) => ({
              user_id: m.user?.id,
              status: m.presence.status,
              activities: m.presence.activities,
              client_status: m.presence.client_status,
            }))
            .filter((p: any) => p.user_id);
          if (presences.length > 0) {
            useDiscordUsersStore.getState().setPresences(presences);
            syncActivities(presences);
          }
        }
      }
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
      toast.error('Discord gateway connection lost. Max reconnect attempts reached.', { duration: Infinity });
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
