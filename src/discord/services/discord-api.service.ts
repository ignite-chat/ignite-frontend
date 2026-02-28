import axios from 'axios';
import { useDiscordStore } from '../store/discord.store';

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
  async sendMessage(channelId: string, content: string) {
    const { data } = await discordApi.post(`/channels/${channelId}/messages`, { content });
    return data;
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
   * Acknowledge (mark as read) up to a specific message in a channel.
   */
  async ackMessage(channelId: string, messageId: string) {
    const { data } = await discordApi.post(
      `/channels/${channelId}/messages/${messageId}/ack`,
      { token: null }
    );
    return data;
  },
};
