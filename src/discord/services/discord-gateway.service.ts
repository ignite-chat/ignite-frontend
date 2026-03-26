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
import { useDiscordVoiceStatesStore } from '../store/discord-voice-states.store';
import { useDiscordGuildSettingsStore } from '../store/discord-guild-settings.store';
import { useDiscordGuildFoldersStore } from '../store/discord-guild-folders.store';
import { useDiscordInteractionsStore } from '../store/discord-interactions.store';
import { decodeGuildFolders, decodeUserSettings } from '../utils/proto-decode';
import { DiscordVoiceService } from './discord-voice.service';
import { GatewayOp } from '../constants/gateway-opcodes';
import { DiscordMessageLogService } from './discord-message-log.service';

// GatewayEventHandler type kept for reference but onDispatch signature is inline now

/** Sync activities to the dedicated store from a list of presences */
function syncActivities(presences: { user_id: string; activities?: any[] }[]) {
  const entries = presences
    .filter((p) => p.user_id)
    .map((p) => ({ userId: p.user_id, activities: p.activities || [] }));
  if (entries.length > 0) {
    useDiscordActivitiesStore.getState().setMany(entries);
  }
}

/**
 * Get the user ID for a specific account token.
 */
function getAccountUserId(accountToken: string): string | undefined {
  return useDiscordStore.getState().getAccountByToken(accountToken)?.user?.id;
}

/**
 * Handle MESSAGE_REACTION_ADD — a single reaction was added to a message.
 */
function handleReactionAdd(data: any, accountToken: string) {
  const { channel_id, message_id, user_id, emoji, burst } = data;
  if (!channel_id || !message_id || !emoji) return;

  const messages = useDiscordChannelsStore.getState().channelMessages[channel_id];
  const msg = messages?.find((m: any) => m.id === message_id);
  if (!msg) return;

  const existing = [...(msg.reactions || [])];
  const idx = existing.findIndex((e: any) =>
    emoji.id ? e.emoji.id === emoji.id : e.emoji.name === emoji.name
  );
  const currentUserId = getAccountUserId(accountToken);
  const isMe = user_id === currentUserId;

  if (idx >= 0) {
    existing[idx] = {
      ...existing[idx],
      count: existing[idx].count + 1,
      count_details: {
        burst: (existing[idx].count_details?.burst || 0) + (burst ? 1 : 0),
        normal: (existing[idx].count_details?.normal || 0) + (burst ? 0 : 1),
      },
      me: isMe ? true : existing[idx].me,
      me_burst: isMe && burst ? true : existing[idx].me_burst,
    };
  } else {
    existing.push({
      emoji,
      count: 1,
      count_details: { burst: burst ? 1 : 0, normal: burst ? 0 : 1 },
      me: isMe,
      me_burst: isMe && !!burst,
    });
  }

  useDiscordChannelsStore.getState().updateMessage(channel_id, message_id, { reactions: existing });
}

/**
 * Handle MESSAGE_REACTION_ADD_MANY — authoritative batch of reactions for a message.
 * This replaces existing reaction counts (not a delta).
 */
function handleReactionAddMany(data: any, accountToken: string) {
  const { channel_id, message_id, reactions: incomingReactions } = data;
  if (!channel_id || !message_id || !incomingReactions) return;

  const messages = useDiscordChannelsStore.getState().channelMessages[channel_id];
  const msg = messages?.find((m: any) => m.id === message_id);
  if (!msg) return;

  const currentUserId = getAccountUserId(accountToken);
  const existingReactions = [...(msg.reactions || [])];

  for (const r of incomingReactions) {
    const users: string[] = r.users || [];
    const idx = existingReactions.findIndex((e: any) =>
      r.emoji.id ? e.emoji.id === r.emoji.id : e.emoji.name === r.emoji.name
    );
    if (idx >= 0) {
      existingReactions[idx] = {
        ...existingReactions[idx],
        count: users.length,
        count_details: {
          burst: existingReactions[idx].count_details?.burst || 0,
          normal: users.length,
        },
        me: users.includes(currentUserId!),
      };
    } else {
      existingReactions.push({
        emoji: r.emoji,
        count: users.length,
        count_details: { burst: 0, normal: users.length },
        me: users.includes(currentUserId!),
        me_burst: false,
      });
    }
  }

  useDiscordChannelsStore.getState().updateMessage(channel_id, message_id, { reactions: existingReactions });
}

/**
 * Handle MESSAGE_REACTION_REMOVE — a single reaction was removed from a message.
 */
function handleReactionRemove(data: any, accountToken: string) {
  const { channel_id, message_id, user_id, emoji, burst } = data;
  if (!channel_id || !message_id || !emoji) return;

  const messages = useDiscordChannelsStore.getState().channelMessages[channel_id];
  const msg = messages?.find((m: any) => m.id === message_id);
  if (!msg) return;

  const existing = [...(msg.reactions || [])];
  const idx = existing.findIndex((e: any) =>
    emoji.id ? e.emoji.id === emoji.id : e.emoji.name === emoji.name
  );
  if (idx < 0) return;

  const currentUserId = getAccountUserId(accountToken);
  const isMe = user_id === currentUserId;
  const newCount = existing[idx].count - 1;

  if (newCount <= 0) {
    existing.splice(idx, 1);
  } else {
    existing[idx] = {
      ...existing[idx],
      count: newCount,
      count_details: {
        burst: Math.max(0, (existing[idx].count_details?.burst || 0) - (burst ? 1 : 0)),
        normal: Math.max(0, (existing[idx].count_details?.normal || 0) - (burst ? 0 : 1)),
      },
      me: isMe ? false : existing[idx].me,
      me_burst: isMe && burst ? false : existing[idx].me_burst,
    };
  }

  useDiscordChannelsStore.getState().updateMessage(channel_id, message_id, { reactions: existing });
}

export const DiscordGatewayService = {
  // Web workers keyed by account token
  _workers: {} as Record<string, Worker>,

  // Fast-connect WebSocket (only used for the first account)
  _fastWs: null as WebSocket | null,
  _fastWsToken: null as string | null,

  // External event handler for the orchestration service
  onDispatch: null as ((accountToken: string, payload: { event: string; data: any }) => void) | null,

  /**
   * Connect to the Discord gateway via a Web Worker for a specific account.
   */
  connect(token: string) {
    if (this._workers[token]) return;
    this._doConnect(token);
  },

  _doConnect(token: string) {
    const worker = new Worker(
      new URL('../workers/discord-gateway.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this._workers[token] = worker;

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'dispatch':
          this._handleDispatch(token, msg.eventName, msg.data);
          break;

        case 'connectionState':
          useDiscordStore.getState().updateAccount(token, { isConnected: msg.connected });
          break;

        case 'sessionInfo':
          break;

        case 'invalidSession':
          if (!msg.resumable) {
            useDiscordStore.getState().updateAccount(token, { sessionId: null });
          }
          break;

        case 'authFailed':
          toast.error('Discord authentication failed. Your token may be invalid.', {
            duration: Infinity,
          });
          break;

        case 'maxReconnect':
          toast.error('Discord gateway connection lost. Max reconnect attempts reached.', {
            duration: Infinity,
          });
          break;

        case 'wsSend':
          if (this._fastWsToken === token && this._fastWs && this._fastWs.readyState === WebSocket.OPEN) {
            this._fastWs.send(msg.data);
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

    worker.onerror = (err) => {
      console.error('[Discord Gateway] Worker error:', err);
    };

    // Check for fast-connect WebSocket and adopt it (only for first connection)
    let bufferedMessages: ArrayBuffer[] | undefined;
    const fastWs = (window as any)._ws;
    if (fastWs && fastWs.ws.readyState === WebSocket.OPEN && Object.keys(this._workers).length === 1) {
      console.log(`[Discord Gateway] Fast-connect: ${fastWs.state.messages.length} buffered messages`);
      bufferedMessages = fastWs.state.messages;

      this._fastWs = fastWs.ws;
      this._fastWsToken = token;
      fastWs.ws.onmessage = (event: MessageEvent) => {
        worker.postMessage({ type: 'wsMessage', data: event.data }, [event.data]);
      };
      fastWs.ws.onclose = () => {
        console.log('[Discord Gateway] Fast-connect WS closed');
        this._fastWs = null;
        this._fastWsToken = null;
      };
      fastWs.ws.onerror = null;
      (window as any)._ws = null;
    }

    const transfer = bufferedMessages ? [...bufferedMessages] : [];
    worker.postMessage({ type: 'connect', token, bufferedMessages }, transfer);
  },

  /**
   * Disconnect a specific account's gateway connection.
   */
  disconnect(token?: string) {
    if (token) {
      this._disconnectOne(token);
    } else {
      this.disconnectAll();
    }
  },

  _disconnectOne(token: string) {
    if (this._fastWsToken === token && this._fastWs) {
      try { this._fastWs.close(); } catch {}
      this._fastWs = null;
      this._fastWsToken = null;
    }
    const worker = this._workers[token];
    if (worker) {
      worker.postMessage({ type: 'disconnect' });
      worker.terminate();
      delete this._workers[token];
    }
    useDiscordStore.getState().updateAccount(token, { isConnected: false });
  },

  /**
   * Disconnect all gateway connections.
   */
  disconnectAll() {
    if (this._fastWs) {
      try { this._fastWs.close(); } catch {}
      this._fastWs = null;
      this._fastWsToken = null;
    }
    for (const key of Object.keys(this._workers)) {
      this._workers[key].postMessage({ type: 'disconnect' });
      this._workers[key].terminate();
    }
    this._workers = {};
    // Mark all accounts disconnected
    for (const account of useDiscordStore.getState().accounts) {
      useDiscordStore.getState().updateAccount(account.token, { isConnected: false });
    }
  },

  /**
   * Send a payload to a specific account's gateway worker.
   * If no token provided, sends to the active account's worker.
   */
  send(data: any, token?: string) {
    const resolvedToken = token ?? useDiscordStore.getState().token;
    if (resolvedToken && this._workers[resolvedToken]) {
      this._workers[resolvedToken].postMessage({ type: 'send', data });
    }
  },

  /**
   * Get the worker token for a guild (by looking up the guild's _accountId).
   */
  _getTokenForGuild(guildId: string): string | undefined {
    const guild = useDiscordGuildsStore.getState().guilds.find((g) => g.id === guildId);
    const accountId = guild?._accountId;
    if (accountId) {
      const account = useDiscordStore.getState().getAccountByUserId(accountId);
      return account?.token;
    }
    return useDiscordStore.getState().token ?? undefined;
  },

  /**
   * Send a full guild subscription for a channel.
   */
  subscribeGuild(guildId: string, channelId: string, memberIds: string[] = [], range: [number, number] = [0, 99]) {
    useDiscordMemberListStore.getState().markPendingSync(guildId);
    const token = this._getTokenForGuild(guildId);
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
    }, token);
  },

  /**
   * Request full member data for specific user IDs via Opcode 8.
   */
  requestGuildMembers(guildId: string, userIds: string[]) {
    if (!userIds.length) return;
    const token = this._getTokenForGuild(guildId);
    for (let i = 0; i < userIds.length; i += 100) {
      this.send({
        op: GatewayOp.REQUEST_GUILD_MEMBERS,
        d: {
          guild_id: guildId,
          user_ids: userIds.slice(i, i + 100),
        },
      }, token);
    }
  },

  /**
   * Update the member list range for a channel.
   */
  updateMemberListRange(guildId: string, channelId: string, ranges: [number, number][]) {
    const token = this._getTokenForGuild(guildId);
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
    }, token);
  },

  // ─── Dispatch Event Handling (runs on main thread) ───────────

  /**
   * Handle DISPATCH events received from a worker.
   * accountToken identifies which account the event belongs to.
   */
  _handleDispatch(accountToken: string, eventName: string, data: any) {
    switch (eventName) {
      case 'READY':
        this._handleReady(accountToken, data);
        break;
      case 'READY_SUPPLEMENTAL':
        this._handleReadySupplemental(accountToken, data);
        break;
      case 'RESUMED':
        useDiscordStore.getState().updateAccount(accountToken, { isConnected: true });
        console.log('[Discord Gateway] Successfully resumed');
        break;
      case 'GUILD_CREATE':
        this._handleGuildCreate(accountToken, data);
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
        this._handleMessageCreate(accountToken, data);
        break;
      case 'MESSAGE_UPDATE':
        this._handleMessageUpdate(data);
        break;
      case 'MESSAGE_DELETE':
        this._handleMessageDelete(data);
        break;
      case 'MESSAGE_DELETE_BULK':
        this._handleMessageDeleteBulk(data);
        break;
      case 'MESSAGE_ACK':
        this._handleMessageAck(data);
        break;
      case 'RELATIONSHIP_ADD':
        if (data.user) {
          useDiscordUsersStore.getState().addUser(data.user);
        }
        useDiscordRelationshipsStore.getState().addRelationship({ id: data.id, user_id: data.id, type: data.type, nickname: data.nickname, since: data.since });
        break;
      case 'RELATIONSHIP_REMOVE':
        useDiscordRelationshipsStore.getState().removeRelationship(data.id);
        break;
      case 'RELATIONSHIP_UPDATE':
        useDiscordRelationshipsStore.getState().updateRelationship(data.id, { type: data.type, nickname: data.nickname });
        break;
      case 'GUILD_MEMBERS_CHUNK':
        console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);
        this._handleGuildMembersChunk(data);
        break;
      case 'GUILD_MEMBER_UPDATE':
        console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);
        this._handleGuildMemberUpdate(data);
        break;
      case 'GUILD_MEMBER_LIST_UPDATE':
        this._handleGuildMemberListUpdate(data);
        break;
      case 'MESSAGE_REACTION_ADD_MANY':
        handleReactionAddMany(data, accountToken);
        break;
      case 'MESSAGE_REACTION_ADD':
        handleReactionAdd(data, accountToken);
        break;
      case 'MESSAGE_REACTION_REMOVE':
        handleReactionRemove(data, accountToken);
        break;
      case 'VOICE_STATE_UPDATE':
        if (data.guild_id) {
          useDiscordVoiceStatesStore.getState().updateVoiceState(data);
        }
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
        const currentUserId = getAccountUserId(accountToken);
        if (typingUserId && typingUserId !== currentUserId) {
          const storeUser = useDiscordUsersStore.getState().users[typingUserId];
          const username = data.member?.user?.global_name || data.member?.user?.username || data.member?.nick || storeUser?.global_name || storeUser?.username || 'Someone';
          const avatar = data.member?.user?.avatar || storeUser?.avatar || null;
          useDiscordTypingStore.getState().addTypingUser(data.channel_id, { user_id: typingUserId, username, avatar });
        }
        break;
      }
      case 'PRESENCE_UPDATE': {
        console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);

        const presenceUserId = data.user?.id || data.user_id;
        if (presenceUserId) {
          const presence = {
            user_id: presenceUserId,
            status: data.status,
            activities: data.activities,
            client_status: data.client_status,
            processed_at_timestamp: data.processed_at_timestamp,
          };
          useDiscordUsersStore.getState().updatePresence(presence);
          syncActivities([presence]);
        }
        break;
      }
      case 'SESSIONS_REPLACE': {
        const currentUserId = getAccountUserId(accountToken);
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
        console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);

        this._handlePassiveUpdateV2(data);
        break;
      case 'USER_GUILD_SETTINGS_UPDATE':
        this._handleUserGuildSettingsUpdate(data);
        break;
      case 'USER_SETTINGS_PROTO_UPDATE': {
        if (data.settings?.proto) {
          const accountUserId = getAccountUserId(accountToken);
          const folders = decodeGuildFolders(data.settings.proto);
          if (folders.length > 0) {
            useDiscordGuildFoldersStore.getState().setFolders(folders, accountUserId);
          }
        }
        break;
      }
      case 'VOICE_CHANNEL_STATUS_UPDATE':
        if (data.id) {
          useDiscordChannelsStore.getState().updateChannel(data.id, { status: data.status ?? null });
        }
        break;
      case 'VOICE_CHANNEL_START_TIME_UPDATE':
        if (data.id) {
          useDiscordChannelsStore.getState().updateChannel(data.id, {
            voice_start_time: data.voice_start_time ?? null,
          });
        }
        break;
      case 'INTERACTION_CREATE': {
        const icNonce = data.nonce || data.id;
        if (icNonce) {
          useDiscordInteractionsStore.getState().setThinking(icNonce);
        }
        break;
      }
      case 'INTERACTION_SUCCESS': {
        const isNonce = data.nonce || data.id;
        if (isNonce) {
          useDiscordInteractionsStore.getState().remove(isNonce);
        }
        break;
      }
      default:
        console.log(`[Discord Gateway] DISPATCH: ${eventName}`, data);
        break;
    }

    // Always call the external dispatch handler if set
    if (this.onDispatch) {
      this.onDispatch(accountToken, { event: eventName, data });
    }
  },

  // ─── Dispatch Event Handlers ──────────────────────────────────────

  _handleReady(accountToken: string, data: any) {
    const { user, guilds, session_id, resume_gateway_url, private_channels, users, read_state, merged_members, relationships, presences } = data;

    const accountUserId = user.id;
    console.log(`[Discord Gateway] READY as ${user.username}#${user.discriminator} (${user.id})`, data);
    console.log(`[Discord Gateway] ${guilds.length} guilds, ${private_channels?.length || 0} DMs, ${users?.length || 0} users`);

    // Update this account in the store
    useDiscordStore.getState().updateAccount(accountToken, {
      user,
      sessionId: session_id,
      isConnected: true,
    });

    useDiscordUsersStore.getState().addUser({ ...user, status: 'online' });

    // Tag guilds with this account's user ID and set them
    useDiscordGuildsStore.getState().setGuilds(guilds, accountUserId);

    const allGuildChannels: any[] = [];
    for (let i = 0; i < guilds.length; i++) {
      const guild = guilds[i];
      if (guild.channels?.length > 0) {
        for (const ch of guild.channels) {
          allGuildChannels.push({ ...ch, guild_id: guild.id });
        }
      }
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

    for (const guild of guilds) {
      if (guild.voice_states?.length > 0) {
        useDiscordVoiceStatesStore.getState().setGuildVoiceStates(
          guild.id,
          guild.voice_states.map((vs: any) => ({ ...vs, guild_id: guild.id }))
        );
      }
    }

    if (users && users.length > 0) {
      useDiscordUsersStore.getState().setUsers(users);
    }

    if (read_state?.entries?.length > 0) {
      useDiscordReadStatesStore.getState().setReadStates(read_state.entries);
    }

    const guildSettingsEntries = data.user_guild_settings?.entries ?? data.user_guild_settings;
    if (Array.isArray(guildSettingsEntries) && guildSettingsEntries.length > 0) {
      useDiscordGuildSettingsStore.getState().setAllSettings(guildSettingsEntries);
    }

    // Decode guild folders from protobuf user settings
    if (data.user_settings_proto) {
      const decoded = decodeUserSettings(data.user_settings_proto);
      console.log('[Discord Gateway] Decoded user_settings_proto:', decoded);

      const folders = decodeGuildFolders(data.user_settings_proto);
      console.log(`[Discord Gateway] Decoded ${folders.length} guild folders:`, folders);
      if (folders.length > 0) {
        useDiscordGuildFoldersStore.getState().setFolders(folders, accountUserId);
      }
    } else {
      console.log('[Discord Gateway] No user_settings_proto in READY payload');
    }

    if (private_channels && private_channels.length > 0) {
      const channelsStore = useDiscordChannelsStore.getState();
      for (const channel of private_channels) {
        channelsStore.addChannel(channel);
      }
    }

    if (relationships && relationships.length > 0) {
      const relationshipUsers = relationships.filter((r: any) => r.user).map((r: any) => r.user);
      if (relationshipUsers.length > 0) {
        useDiscordUsersStore.getState().addUsers(relationshipUsers);
      }
      useDiscordRelationshipsStore.getState().setRelationships(
        relationships.map((r: any) => ({ id: r.id, type: r.type, nickname: r.nickname, since: r.since }))
      );
    }

    const friendPresences = data.merged_presences?.friends || presences || [];
    if (friendPresences.length > 0) {
      const mapped = friendPresences.map((p: any) => ({
        user_id: p.user?.id || p.user_id,
        status: p.status,
        activities: p.activities,
        client_status: p.client_status,
        processed_at_timestamp: p.processed_at_timestamp,
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handleReadySupplemental(accountToken: string, data: any) {
    console.log('[Discord Gateway] READY_SUPPLEMENTAL received', data);

    const { guilds, merged_members, merged_presences } = data;

    const currentUserId = getAccountUserId(accountToken);
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

    if (merged_presences?.guilds && guilds) {
      for (let i = 0; i < guilds.length; i++) {
        const guildPresences = merged_presences.guilds[i];
        if (guildPresences?.length > 0) {
          const mapped = guildPresences.map((p: any) => ({
            user_id: p.user_id,
            status: p.status,
            activities: p.activities,
            client_status: p.client_status,
            processed_at_timestamp: p.processed_at_timestamp,
          }));
          useDiscordUsersStore.getState().setPresences(mapped);
          syncActivities(mapped);
        }
      }
    }

    if (merged_presences?.friends?.length > 0) {
      const mapped = merged_presences.friends.map((p: any) => ({
        user_id: p.user_id,
        status: p.status,
        activities: p.activities,
        client_status: p.client_status,
        processed_at_timestamp: p.processed_at_timestamp,
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handlePassiveUpdateV2(data: any) {
    const { guild_id, updated_voice_states, removed_voice_states, updated_channels, updated_members } = data;
    if (!guild_id) return;

    if (updated_voice_states?.length > 0) {
      useDiscordVoiceStatesStore.getState().updateVoiceStateBatch(
        updated_voice_states.map((vs: any) => ({ ...vs, guild_id }))
      );
    }

    if (removed_voice_states?.length > 0) {
      useDiscordVoiceStatesStore.getState().updateVoiceStateBatch(
        removed_voice_states.map((userId: string) => ({ user_id: userId, channel_id: null, guild_id } as any))
      );
    }

    if (updated_channels?.length > 0) {
      for (const ch of updated_channels) {
        if (ch.id) {
          useDiscordChannelsStore.getState().updateChannel(ch.id, ch);
        }
      }
    }

    if (updated_members?.length > 0) {
      useDiscordGuildsStore.getState().addGuildMembers(guild_id, updated_members);
      useDiscordMembersStore.getState().addMembers(guild_id, updated_members);

      const users = updated_members.map((m: any) => m.user).filter(Boolean);
      if (users.length > 0) {
        useDiscordUsersStore.getState().addUsers(users);
      }
    }
  },

  _handleGuildCreate(accountToken: string, data: any) {
    // Tag the guild with the account's user ID
    const accountUserId = getAccountUserId(accountToken);
    if (accountUserId) {
      data._accountId = accountUserId;
    }
    useDiscordGuildsStore.getState().addGuild(data);

    const currentUserId = accountUserId;
    if (currentUserId) {
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

    if (data.voice_states?.length > 0) {
      useDiscordVoiceStatesStore.getState().setGuildVoiceStates(
        data.id,
        data.voice_states.map((vs: any) => ({ ...vs, guild_id: data.id }))
      );
    }

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

  _handleMessageCreate(accountToken: string, data: any) {
    if (data.nonce) {
      useDiscordChannelsStore.getState().removePendingByNonce(data.channel_id, data.nonce);
    }

    useDiscordChannelsStore.getState().appendMessage(data.channel_id, data);

    if (data.author) {
      useDiscordUsersStore.getState().addUser(data.author);
    }
    if (data.mentions?.length > 0) {
      useDiscordUsersStore.getState().addUsers(data.mentions);
    }

    if (data.member && data.guild_id && data.author?.id) {
      useDiscordMembersStore.getState().addMember(data.guild_id, {
        ...data.member,
        user: data.author,
      });
    }

    const currentUserId = getAccountUserId(accountToken);
    const isOwnMessage = currentUserId && data.author?.id === currentUserId;

    useDiscordChannelsStore.getState().updateChannel(data.channel_id, {
      last_message_id: data.id,
    });

    if (isOwnMessage) {
      useDiscordReadStatesStore.getState().ackChannel(data.channel_id, data.id);
      return;
    }

    if (!currentUserId) return;

    const guildId = data.guild_id;
    const channelId = data.channel_id;

    if (guildId) {
      const guildSettings = useDiscordGuildSettingsStore.getState().getGuildSettings(guildId);
      const channelOverride = guildSettings?.channel_overrides?.find(
        (o: any) => o.channel_id === channelId,
      );

      const channelMuted = channelOverride?.muted;
      const guildMuted = guildSettings?.muted;
      if (channelMuted || guildMuted) return;

      let notifLevel = channelOverride?.message_notifications ?? 3;
      if (notifLevel === 3) notifLevel = guildSettings?.message_notifications ?? 1;
      if (notifLevel === 2) return;

      const isDirectMention = data.mentions?.some((m: any) => m.id === currentUserId);
      const isEveryoneMention =
        data.mention_everyone && !guildSettings?.suppress_everyone;
      const isRoleMention =
        !guildSettings?.suppress_roles &&
        data.mention_roles?.length > 0 &&
        (() => {
          const memberData = useDiscordMembersStore.getState().members[guildId]?.[currentUserId];
          const roles: string[] = memberData?.roles || [];
          return data.mention_roles.some((r: string) => roles.includes(r));
        })();

      const isMentioned = isDirectMention || isEveryoneMention || isRoleMention;

      if (!isMentioned) return;

      const readStates = useDiscordReadStatesStore.getState();
      const current = readStates.readStates[channelId]?.mention_count ?? 0;
      readStates.updateReadState(channelId, { mention_count: current + 1 });
    }
  },

  _handleMessageUpdate(data: any) {
    if (data.id && data.channel_id) {
      // Capture old version before overwriting
      const guildId = data.guild_id || useDiscordChannelsStore.getState().channels.find(
        (c) => c.id === data.channel_id,
      )?.guild_id || null;
      DiscordMessageLogService.onMessageUpdate(data.channel_id, data.id, data, guildId);

      useDiscordChannelsStore.getState().updateMessage(data.channel_id, data.id, data);
    }
  },

  _handleMessageDelete(data: any) {
    if (data.id && data.channel_id) {
      const store = useDiscordChannelsStore.getState();
      const channel = store.channels.find((c) => c.id === data.channel_id);

      // Capture message before removal
      DiscordMessageLogService.onMessageDelete(data.channel_id, data.id, data.guild_id || channel?.guild_id || null);

      store.removeMessage(data.channel_id, data.id);

      if (channel && channel.last_message_id === data.id) {
        const messages = useDiscordChannelsStore.getState().channelMessages[data.channel_id] || [];
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        store.updateChannel(data.channel_id, {
          last_message_id: lastMsg?.id || null,
        });
      }
    }
  },

  _handleMessageDeleteBulk(data: any) {
    const { ids, channel_id } = data;
    if (!channel_id || !ids?.length) return;

    const store = useDiscordChannelsStore.getState();

    // Capture messages before bulk removal
    const channel = store.channels.find((c) => c.id === channel_id);
    DiscordMessageLogService.onMessageDeleteBulk(channel_id, ids, channel?.guild_id || null);

    store.removeMessages(channel_id, ids);

    // Update last_message_id if it was among the deleted messages
    if (channel && ids.includes(channel.last_message_id)) {
      const messages = useDiscordChannelsStore.getState().channelMessages[channel_id] || [];
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
      store.updateChannel(channel_id, {
        last_message_id: lastMsg?.id || null,
      });
    }
  },

  _handleMessageAck(data: any) {
    if (data.channel_id && data.message_id) {
      useDiscordReadStatesStore.getState().ackChannel(data.channel_id, data.message_id);
    }
  },

  _handleUserGuildSettingsUpdate(data: any) {
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
        processed_at_timestamp: p.processed_at_timestamp,
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handleGuildMemberUpdate(data: any) {
    const { guild_id, user } = data;
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

    useDiscordMembersStore.getState().addMember(guild_id, { ...data, user });
    useDiscordUsersStore.getState().addUser(user);
  },

  _handleGuildMemberListUpdate(data: any) {
    const { guild_id, ops } = data;
    if (!guild_id || !ops) return;

    useDiscordMemberListStore.getState().handleListUpdate(guild_id, data);

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

          const presences = members
            .filter((m: any) => m.presence)
            .map((m: any) => ({
              user_id: m.user?.id,
              status: m.presence.status,
              activities: m.presence.activities,
              client_status: m.presence.client_status,
              processed_at_timestamp: m.presence.processed_at_timestamp,
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
};
