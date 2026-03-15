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
import { GatewayOp } from '../constants/gateway-opcodes';

import type { GatewayEventHandler } from '../types';

/** Sync activities to the dedicated store from a list of presences */
function syncActivities(presences: { user_id: string; activities?: any[] }[]) {
  const entries = presences
    .filter((p) => p.user_id)
    .map((p) => ({ userId: p.user_id, activities: p.activities || [] }));
  if (entries.length > 0) {
    useDiscordActivitiesStore.getState().setMany(entries);
  }
}

export const DiscordGatewayService = {
  // The web worker that manages the WebSocket + heartbeat
  _worker: null as Worker | null,

  // External event handler for the orchestration service
  onDispatch: null as GatewayEventHandler | null,

  /**
   * Connect to the Discord gateway via a Web Worker.
   * The worker handles the WebSocket, heartbeat, identify/resume, and reconnection
   * on a separate thread so main-thread lag cannot cause missed heartbeats.
   */
  connect(token: string) {
    if (this._worker) {
      console.log('[Discord Gateway] Already connected, disconnecting first');
      this.disconnect();
    }

    this._worker = new Worker(
      new URL('../workers/discord-gateway.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this._worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'dispatch':
          this._handleDispatch(msg.eventName, msg.data);
          break;

        case 'connectionState':
          useDiscordStore.getState().setConnected(msg.connected);
          break;

        case 'sessionInfo':
          // Worker extracted session info from READY — no action needed,
          // the READY dispatch event handles store updates
          break;

        case 'invalidSession':
          if (!msg.resumable) {
            useDiscordStore.getState().setSessionId(null);
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
      console.error('[Discord Gateway] Worker error:', err);
    };

    this._worker.postMessage({ type: 'connect', token });
  },

  /**
   * Disconnect from the gateway.
   */
  disconnect() {
    if (this._worker) {
      this._worker.postMessage({ type: 'disconnect' });
      this._worker.terminate();
      this._worker = null;
    }
    useDiscordStore.getState().setConnected(false);
  },

  /**
   * Send a payload to the gateway via the worker.
   */
  send(data: any) {
    if (this._worker) {
      this._worker.postMessage({ type: 'send', data });
    }
  },

  /**
   * Send a full guild subscription for a channel — requests member sidebar,
   * typing indicators, threads, activities, and optionally specific member IDs.
   */
  subscribeGuild(guildId: string, channelId: string, memberIds: string[] = [], range: [number, number] = [0, 99]) {
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
   */
  requestGuildMembers(guildId: string, userIds: string[]) {
    if (!userIds.length) return;
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
   * Update the member list range for a channel.
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

  // ─── Dispatch Event Handling (runs on main thread) ───────────

  /**
   * Handle DISPATCH events received from the worker.
   * All store updates happen here on the main thread.
   */
  _handleDispatch(eventName: string, data: any) {
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
        useDiscordRelationshipsStore.getState().addRelationship({ id: data.id, user_id: data.id, type: data.type, nickname: data.nickname, since: data.since });
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

    useDiscordUsersStore.getState().addUser({ ...user, status: 'online' });

    useDiscordGuildsStore.getState().setGuilds(guilds);

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
      }));
      useDiscordUsersStore.getState().setPresences(mapped);
      syncActivities(mapped);
    }
  },

  _handleReadySupplemental(data: any) {
    console.log('[Discord Gateway] READY_SUPPLEMENTAL received');

    const { guilds, merged_members, merged_presences } = data;

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

  _handleGuildCreate(data: any) {
    useDiscordGuildsStore.getState().addGuild(data);

    const currentUserId = useDiscordStore.getState().user?.id;
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

  _handleMessageCreate(data: any) {
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

      const channelMuted = channelOverride?.muted;
      const guildMuted = guildSettings?.muted;
      if (channelMuted || guildMuted) return;

      let notifLevel = channelOverride?.message_notifications ?? 3;
      if (notifLevel === 3) notifLevel = guildSettings?.message_notifications ?? 1;
      if (notifLevel === 2) return;

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
