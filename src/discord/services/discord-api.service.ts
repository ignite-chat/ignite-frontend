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
   * Get all channels in a guild.
   */
  async getGuildChannels(guildId: string) {
    const { data } = await discordApi.get(`/guilds/${guildId}/channels`);
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
   * Get all private channels (DMs and group DMs) for the current user.
   */
  async getDMChannels() {
    const { data } = await discordApi.get('/users/@me/channels');
    return data;
  },
};
