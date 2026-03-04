import axios from 'axios';
import { toast } from 'sonner';
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
  async getUser() {
    const { data } = await discordApi.get('/users/@me');
    return data;
  },

  /**
   * Get all guilds the user is a member of.
   */
  async getGuilds() {
    const { data } = await discordApi.get('/users/@me/guilds');
    return data;
  },

  /**
   * Get messages in a channel.
   */
  async getChannelMessages(channelId: string, before?: string, limit: number = 50) {
    const params: any = { limit };
    if (before) params.before = before;
    const { data } = await discordApi.get(`/channels/${channelId}/messages`, { params });
    return data;
  },

  /**
   * Send a message to a channel.
   */
  async sendMessage(channelId: string, content: string, nonce?: string, messageReference?: { message_id: string }) {
    const body: any = { content, nonce };
    if (messageReference) {
      body.message_reference = messageReference;
      body.allowed_mentions = { replied_user: true };
    }
    const { data } = await discordApi.post(`/channels/${channelId}/messages`, body);
    return data;
  },

  /**
   * Send a typing indicator to a channel.
   */
  async sendTyping(channelId: string) {
    await discordApi.post(`/channels/${channelId}/typing`, {}, { _silent: true } as any);
  },

  /**
   * Add a reaction to a message.
   */
  async addReaction(channelId: string, messageId: string, emoji: string) {
    await discordApi.put(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
      {},
      { _silent: true } as any
    );
  },

  /**
   * Remove own reaction from a message.
   */
  async removeReaction(channelId: string, messageId: string, emoji: string) {
    await discordApi.delete(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
      { _silent: true } as any
    );
  },

  /**
   * Get members of a guild.
   */
  async getGuildMembers(guildId: string, limit: number = 1000) {
    const { data } = await discordApi.get(`/guilds/${guildId}/members`, {
      params: { limit },
    });
    return data;
  },

  /**
   * Get a specific channel by ID.
   */
  async getChannel(channelId: string) {
    const { data } = await discordApi.get(`/channels/${channelId}`);
    return data;
  },

  /**
   * Get a specific guild by ID.
   */
  async getGuild(guildId: string) {
    const { data } = await discordApi.get(`/guilds/${guildId}`);
    return data;
  },

  /**
   * Get a user's profile (banner, bio, etc.)
   */
  async getUserProfile(userId: string, guildId?: string) {
    const params: any = {
      with_mutual_guilds: false,
      with_mutual_friends_count: false,
    };
    if (guildId) params.guild_id = guildId;
    const { data } = await discordApi.get(`/users/${userId}/profile`, { params });
    return data;
  },

  /**
   * Delete a message in a channel.
   */
  async deleteMessage(channelId: string, messageId: string) {
    await discordApi.delete(`/channels/${channelId}/messages/${messageId}`);
  },

  /**
   * Kick a member from a guild.
   */
  async kickMember(guildId: string, userId: string) {
    await discordApi.delete(`/guilds/${guildId}/members/${userId}`);
  },

  /**
   * Ban a member from a guild.
   */
  async banMember(guildId: string, userId: string, deleteMessageSeconds: number = 0) {
    await discordApi.put(`/guilds/${guildId}/bans/${userId}`, {
      delete_message_seconds: deleteMessageSeconds,
    });
  },

  /**
   * Accept an incoming friend request (or send one by user ID).
   */
  async acceptFriendRequest(userId: string) {
    await discordApi.put(`/users/@me/relationships/${userId}`, {});
  },

  /**
   * Delete a relationship (decline request, cancel outgoing, or remove friend).
   */
  async deleteRelationship(userId: string) {
    await discordApi.delete(`/users/@me/relationships/${userId}`);
  },

  /**
   * Get application info (icon, name, etc.) by application ID.
   */
  async getApplication(applicationId: string) {
    const { data } = await discordApi.get(`/applications/${applicationId}/rpc`, { _silent: true } as any);
    return data;
  },

  /**
   * Get post data for a forum channel (thread metadata + first messages + owners).
   */
  async getForumPostData(channelId: string, threadIds: string[]) {
    const { data } = await discordApi.post(`/channels/${channelId}/post-data`, {
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
  ) {
    const { data } = await discordApi.get(`/channels/${channelId}/threads/search`, {
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
  async ackMessage(channelId: string, messageId: string) {
    const { data } = await discordApi.post(
      `/channels/${channelId}/messages/${messageId}/ack`,
      { token: null },
      { _silent: true } as any
    );
    return data;
  },
};
