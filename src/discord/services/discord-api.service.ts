import axios from 'axios';
import { toast } from 'sonner';
import type {
  DiscordUser,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
  DiscordMember,
  UserProfile,
  DiscordApplication,
  ForumPostData,
  ForumThreadSearchResult,
  MessageSearchResult,
  AckMessageResponse,
  InteractionPayload,
  AckBulkEntry,
  UserGuildSettingsResponse,
} from '../types';
import { useDiscordStore } from '../store/discord.store';
import { requestCaptchaSolution } from './discord-captcha-bridge';

const discordApi = axios.create({
  baseURL: 'https://discord.com/api/v9',
});

discordApi.interceptors.request.use((config) => {
  const token = useDiscordStore.getState().token;
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

discordApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const data = error.response?.data;
    const config = error.config as any;

    // Detect captcha challenge (avoid infinite retry with _captchaRetried flag)
    const isCaptchaRequired =
      error.response?.status === 400 &&
      Array.isArray(data?.captcha_key) &&
      data.captcha_key.includes('captcha-required') &&
      data.captcha_sitekey &&
      !config?._captchaRetried;

    if (isCaptchaRequired) {
      try {
        const solution = await requestCaptchaSolution({
          captcha_sitekey: data.captcha_sitekey,
          captcha_service: data.captcha_service,
          captcha_rqdata: data.captcha_rqdata,
          captcha_rqtoken: data.captcha_rqtoken,
          captcha_session_id: data.captcha_session_id,
        });

        // Retry the original request with captcha headers
        config._captchaRetried = true;
        config.headers['X-Captcha-Key'] = solution.captcha_key;
        if (solution.captcha_rqtoken) {
          config.headers['X-Captcha-Rqtoken'] = solution.captcha_rqtoken;
        }
        if (solution.captcha_session_id) {
          config.headers['X-Captcha-Session-Id'] = solution.captcha_session_id;
        }

        return discordApi.request(config);
      } catch {
        if (!config?._silent) {
          toast.error('Captcha verification was cancelled.', { duration: 5000 });
        }
        return Promise.reject(error);
      }
    }

    if (!config?._silent) {
      const status = error.response?.status;
      const message = data?.message || error.message || 'Request failed';
      toast.error(`Discord API Error (${status || 'network'}): ${message}`, {
        duration: Infinity,
      });
    }
    return Promise.reject(error);
  }
);

export const DiscordApiService = {
  /**
   * Get the current authenticated Discord user.
   */
  async getUser(): Promise<DiscordUser> {
    const { data } = await discordApi.get<DiscordUser>('/users/@me');
    return data;
  },

  /**
   * Get all guilds the user is a member of.
   */
  async getGuilds(): Promise<DiscordGuild[]> {
    const { data } = await discordApi.get<DiscordGuild[]>('/users/@me/guilds');
    return data;
  },

  /**
   * Get messages in a channel.
   */
  async getChannelMessages(channelId: string, before?: string, limit: number = 50): Promise<DiscordMessage[]> {
    const params: any = { limit };
    if (before) params.before = before;
    const { data } = await discordApi.get<DiscordMessage[]>(`/channels/${channelId}/messages`, { params });
    return data;
  },

  /**
   * Send a message to a channel.
   */
  async sendMessage(channelId: string, content: string, nonce?: string, messageReference?: { message_id: string }): Promise<DiscordMessage> {
    const body: any = { content, nonce };
    if (messageReference) {
      body.message_reference = messageReference;
      body.allowed_mentions = { replied_user: true };
    }
    const { data } = await discordApi.post<DiscordMessage>(`/channels/${channelId}/messages`, body);
    return data;
  },

  /**
   * Send a typing indicator to a channel.
   */
  async sendTyping(channelId: string): Promise<void> {
    await discordApi.post(`/channels/${channelId}/typing`, {}, { _silent: true } as any);
  },

  /**
   * Add a reaction to a message.
   */
  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await discordApi.put(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
      {},
      { _silent: true } as any
    );
  },

  /**
   * Remove own reaction from a message.
   */
  async removeReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await discordApi.delete(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
      { _silent: true } as any
    );
  },

  /**
   * Get members of a guild.
   */
  async getGuildMembers(guildId: string, limit: number = 1000): Promise<DiscordMember[]> {
    const { data } = await discordApi.get<DiscordMember[]>(`/guilds/${guildId}/members`, {
      params: { limit },
    });
    return data;
  },

  /**
   * Get a specific channel by ID.
   */
  async getChannel(channelId: string): Promise<DiscordChannel> {
    const { data } = await discordApi.get<DiscordChannel>(`/channels/${channelId}`);
    return data;
  },

  /**
   * Get a specific guild by ID.
   */
  async getGuild(guildId: string): Promise<DiscordGuild> {
    const { data } = await discordApi.get<DiscordGuild>(`/guilds/${guildId}`);
    return data;
  },

  /**
   * Get a user's profile (banner, bio, etc.)
   */
  async getUserProfile(userId: string, guildId?: string): Promise<UserProfile> {
    const params: any = {
      with_mutual_guilds: true,
      with_mutual_friends_count: true,
      with_mutual_friends: true,
    };
    if (guildId) params.guild_id = guildId;
    const { data } = await discordApi.get<UserProfile>(`/users/${userId}/profile`, { params });
    return data;
  },

  /**
   * Delete a message in a channel.
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await discordApi.delete(`/channels/${channelId}/messages/${messageId}`);
  },

  /**
   * Kick a member from a guild.
   */
  async kickMember(guildId: string, userId: string): Promise<void> {
    await discordApi.delete(`/guilds/${guildId}/members/${userId}`);
  },

  /**
   * Ban a member from a guild.
   */
  async banMember(guildId: string, userId: string, deleteMessageSeconds: number = 0): Promise<void> {
    await discordApi.put(`/guilds/${guildId}/bans/${userId}`, {
      delete_message_seconds: deleteMessageSeconds,
    });
  },

  /**
   * Accept an incoming friend request (or send one by user ID).
   */
  async acceptFriendRequest(userId: string): Promise<void> {
    await discordApi.put(`/users/@me/relationships/${userId}`, {});
  },

  /**
   * Send a friend request by user ID.
   */
  async sendFriendRequest(userId: string): Promise<void> {
    await discordApi.put(`/users/@me/relationships/${userId}`, { type: 1 });
  },

  /**
   * Block a user.
   */
  async blockUser(userId: string): Promise<void> {
    await discordApi.put(`/users/@me/relationships/${userId}`, { type: 2 });
  },

  /**
   * Delete a relationship (decline request, cancel outgoing, or remove friend).
   */
  async deleteRelationship(userId: string): Promise<void> {
    await discordApi.delete(`/users/@me/relationships/${userId}`);
  },

  /**
   * Open or create a DM channel with a user.
   */
  async createDMChannel(recipientId: string): Promise<DiscordChannel> {
    const { data } = await discordApi.post<DiscordChannel>('/users/@me/channels', {
      recipients: [recipientId],
    });
    return data;
  },

  /**
   * Modify a guild member (nickname, timeout, etc.)
   */
  async modifyGuildMember(guildId: string, userId: string, body: Record<string, any>): Promise<DiscordMember> {
    const { data } = await discordApi.patch<DiscordMember>(`/guilds/${guildId}/members/${userId}`, body);
    return data;
  },

  /**
   * Get application info (icon, name, etc.) by application ID.
   */
  async getApplication(applicationId: string): Promise<DiscordApplication> {
    const { data } = await discordApi.get<DiscordApplication>(`/applications/${applicationId}/rpc`, { _silent: true } as any);
    return data;
  },

  /**
   * Get post data for a forum channel (thread metadata + first messages + owners).
   */
  async getForumPostData(channelId: string, threadIds: string[]): Promise<ForumPostData> {
    const { data } = await discordApi.post<ForumPostData>(`/channels/${channelId}/post-data`, {
      thread_ids: threadIds,
    });
    return data;
  },

  /**
   * Search threads in a forum channel with pagination.
   */
  async searchForumThreads(
    channelId: string,
    offset = 0,
    limit = 25,
    sortBy = 'last_message_time',
    sortOrder = 'desc'
  ): Promise<ForumThreadSearchResult> {
    const { data } = await discordApi.get<ForumThreadSearchResult>(`/channels/${channelId}/threads/search`, {
      params: {
        sort_by: sortBy,
        sort_order: sortOrder,
        limit,
        offset,
        tag_setting: 'match_some',
      },
    });
    return data;
  },

  /**
   * Acknowledge (mark as read) up to a specific message in a channel.
   */
  async ackMessage(channelId: string, messageId: string): Promise<AckMessageResponse> {
    const { data } = await discordApi.post<AckMessageResponse>(
      `/channels/${channelId}/messages/${messageId}/ack`,
      { token: null },
      { _silent: true } as any
    );
    return data;
  },

  /**
   * Bulk acknowledge multiple channels at once.
   */
  async ackBulk(readStates: AckBulkEntry[]): Promise<void> {
    await discordApi.post(
      `/read-states/ack-bulk`,
      { read_states: readStates },
      { _silent: true } as any
    );
  },

  /**
   * Update user guild settings (mute, notifications, etc.)
   */
  async updateUserGuildSettings(guildId: string, settings: Record<string, any>): Promise<UserGuildSettingsResponse> {
    const { data } = await discordApi.patch<UserGuildSettingsResponse>(
      `/users/@me/guilds/settings`,
      { guilds: { [guildId]: settings } },
      { _silent: true } as any
    );
    return data;
  },

  /**
   * Search messages in a guild.
   */
  async searchGuildMessages(guildId: string, content: string, offset = 0): Promise<MessageSearchResult> {
    const { data } = await discordApi.get<MessageSearchResult>(`/guilds/${guildId}/messages/search`, {
      params: {
        content,
        sort_by: 'timestamp',
        sort_order: 'desc',
        offset,
      },
    });
    return data;
  },

  /**
   * Send a message component interaction (e.g. button click).
   */
  async sendInteraction(payload: InteractionPayload): Promise<void> {
    await discordApi.post('/interactions', payload, { _silent: true } as any);
  },

  /**
   * Accept a message request (DM from a non-friend).
   */
  async acceptMessageRequest(channelId: string): Promise<void> {
    await discordApi.put(`/channels/${channelId}/recipients/@me`, {
      consent_status: 2,
    });
  },

  /**
   * Decline a message request (DM from a non-friend).
   */
  async declineMessageRequest(channelId: string): Promise<void> {
    await discordApi.delete(`/channels/${channelId}/recipients/@me`);
  },
};
