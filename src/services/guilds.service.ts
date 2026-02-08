import { toast } from 'sonner'
import { useGuildsStore } from '../store/guilds.store';
import api from '../api.js';
import useStore from '../hooks/useStore';
import axios from 'axios';
import { ChannelsService } from './channels.service';

export const GuildsService = {
  async loadGuilds() {
    const { setGuilds } = useGuildsStore.getState();
    try {
      const { data } = await api.get('/guilds');
      setGuilds(data);
    } catch {
      toast.error('Unable to load guilds.');
    }
  },

  async loadGuildMembers(guildId) {
    const { setGuildMembers } = useGuildsStore.getState();
    try {
      const { data } = await api.get(`/guilds/${guildId}/members`);
      setGuildMembers(guildId, data);
    } catch {
      toast.error('Unable to load guild members.');
    }
  },

  async loadGuildChannels(guildId) {
    const { editGuild } = useGuildsStore.getState();
    try {
      const { data } = await api.get(`/guilds/${guildId}/channels`);
      editGuild(guildId, { channels: data });
    } catch {
      toast.error('Unable to load guild channels.');
    }
  },

  async createGuild(guildData) {
    const { addGuild } = useGuildsStore.getState();
    try {
      const { data } = await api.post('/guilds', guildData);
      addGuild(data);
      ChannelsService.initializeGuildChannels(data.id);
      toast.success('Server created successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  },

  async createGuildChannel(guildId, channelData) {
    const { editGuild, guilds } = useGuildsStore.getState();
    try {
      const response = await api.post(`/guilds/${guildId}/channels`, channelData);
      const guild = guilds.find((g) => g.id === guildId);
      editGuild(guildId, { channels: [...guild.channels, response.data] });
      toast.success('Channel created successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  },

  async deleteGuildChannel(guildId, channelId) {
    const { editGuild, guilds } = useGuildsStore.getState();
    try {
      await api.delete(`/guilds/${guildId}/channels/${channelId}`);
      const guild = guilds.find((g) => g.id === guildId);
      editGuild(guildId, { channels: guild.channels.filter((c) => c.channel_id !== channelId) });
      toast.success('Channel deleted successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  },

  /**
   * Add a guild member to the local store
   * 
   * @param guildId The ID of the guild where the member will be added.
   * @param member The member to be added.
   */
  async addGuildMemberToStore(guildId: string, member: any) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    setGuildMembers(guildId, [...members, member]);
  },

  /**
   * Update a guild member in the local store
   * 
   * @param guildId The ID of the guild where the member exists.
   * @param memberId The ID of the member to be updated.
   * @param updates The updates to be applied to the member.
   */
  async updateGuildMemberInStore(guildId: string, memberId: string, updates: any) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    const updatedMembers = members.map(member =>
      member.user_id === memberId ? { ...member, ...updates } : member
    );
    setGuildMembers(guildId, updatedMembers);
  },

  /**
   * Delete a guild member from the local store
   * 
   * @param guildId The ID of the guild where the member exists.
   * @param memberId The ID of the member to be deleted.
   */
  async deleteGuildMemberFromStore(guildId: string, memberId: string) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    const updatedMembers = members.filter(member => member.user_id !== memberId);
    setGuildMembers(guildId, updatedMembers);
  },

  async kickMember(guildId: string, memberId: string) {
    try {
      await api.delete(`/guilds/${guildId}/members/${memberId}`);
      toast.success('Member kicked successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to kick member.');
    }
  },

  async updateMemberNickname(guildId: string, memberId: string, nickname: string) {
    try {
      await api.patch(`/guilds/${guildId}/members/${memberId}`, { nickname });
      toast.success('Nickname updated successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update nickname.');
    }
  },

  async createInvite(guildId: string, channelId: string, options: { max_uses?: number, expires_at?: string } = {}) {
    try {
      const { data } = await api.post(`/guilds/${guildId}/invites`, {
        channel_id: channelId,
        max_uses: options.max_uses,
        expires_at: options.expires_at
      });
      toast.success('Invite link created.');
      return data;
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create invite.');
    }
  },

  async pauseInvites(guildId: string, paused: boolean) {
    try {
      await api.patch(`/guilds/${guildId}/invites/settings`, { paused });
      toast.success(paused ? 'Invites paused.' : 'Invites resumed.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update invite settings.');
    }
  },

  async updateGuildProfile(guildId: string, profileData: any) {
    const { guilds, setGuilds } = useGuildsStore.getState();

    try {
      // Backend expects profile updates as query params, not body
      // We also need to strip banner_color if it exists as it causes issues
      const { banner_color, ...paramsToSend } = profileData;

      const { data } = await api.patch(`/guilds/${guildId}/profile`, null, {
        params: paramsToSend
      });

      // Update local store
      const updatedGuilds = guilds.map((g) => {
        if (g.id === guildId) {
          return { ...g, ...data };
        }
        return g;
      });

      setGuilds(updatedGuilds);

      toast.success('Server profile updated successfully');
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.message || 'Failed to update server profile';
        toast.error(errorMessage);
        throw error; // Re-throw to handle in component
      } else {
        toast.error('Failed to update server profile');
        throw error;
      }
    }
  },
};
