import { toast } from 'sonner';
import { useGuildsStore } from '../store/guilds.store';
import { useUsersStore } from '../store/users.store';
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
    const { setUsers } = useUsersStore.getState();
    try {
      const { data } = await api.get(`/guilds/${guildId}/members`);
      setGuildMembers(guildId, data);

      // Extract and store users from members
      const users = data.map((member: any) => member.user).filter((user: any) => user);
      setUsers(users);
    } catch {
      toast.error('Unable to load guild members.');
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
    const { setUser } = useUsersStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    setGuildMembers(guildId, [...members, member]);

    // Add user to users store if exists
    if (member.user) {
      setUser(member.user.id, member.user);
    }
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

    const updatedMembers = members.map((member) =>
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
  handleGuildUpdated(event: any) {
    const { editGuild } = useGuildsStore.getState();
    editGuild(event.guild.id, event.guild);
  },

  handleGuildDeleted(event: any) {
    const { guilds, setGuilds } = useGuildsStore.getState();
    setGuilds(guilds.filter((g) => g.id !== event.guild.id));
  },

  async deleteGuildMemberFromStore(guildId: string, memberId: string) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    const updatedMembers = members.filter((member) => member.user_id !== memberId);
    setGuildMembers(guildId, updatedMembers);
  },

  async discoverGuilds(search?: string) {
    const params = search ? { search } : {};
    const { data } = await api.get('/guilds/discovery', { params });
    return data;
  },

  async joinGuild(guildId: string) {
    try {
      await api.post(`/guilds/${guildId}/join`);
      toast.success('Joined server successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to join server.');
      throw error;
    }
  },

  async leaveGuild(guildId: string) {
    const { removeGuild } = useGuildsStore.getState();
    try {
      await api.delete(`/users/@me/guilds/${guildId}`);
      toast.success('Left server successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Unable to leave server.');
    }
  },

  async kickMember(guildId: string, memberId: string) {
    try {
      await api.delete(`/guilds/${guildId}/members/${memberId}`);
      await GuildsService.deleteGuildMemberFromStore(guildId, memberId);
      toast.success('Member kicked successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to kick member.');
      throw error;
    }
  },

  async banMember(guildId: string, memberId: string, reason?: string, deleteMessageSeconds?: number) {
    try {
      await api.put(`/guilds/${guildId}/bans/${memberId}`, {
        reason,
        delete_message_seconds: deleteMessageSeconds,
      });
      await GuildsService.deleteGuildMemberFromStore(guildId, memberId);
      toast.success('Member banned successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to ban member.');
      throw error;
    }
  },

  async unbanMember(guildId: string, memberId: string) {
    try {
      await api.delete(`/guilds/${guildId}/bans/${memberId}`);
      toast.success('Member unbanned successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unban member.');
      throw error;
    }
  },

  async getGuildBans(guildId: string) {
    const { data } = await api.get(`/guilds/${guildId}/bans`);
    return data;
  },
};
