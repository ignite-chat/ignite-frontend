import api from '../api.js';

export const UsersService = {
  async getUserProfile(userId: string, guildId?: string) {
    const params: Record<string, string | boolean> = {
      with_mutual_guilds: true,
      with_mutual_friends: true,
    };
    if (guildId) params.guild_id = guildId;

    const { data } = await api.get(`/users/${userId}/profile`, { params });
    return data;
  },
};
