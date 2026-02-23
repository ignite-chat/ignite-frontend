import { toast } from 'sonner';
import { useGuildsStore } from '../store/guilds.store';
import { useUsersStore } from '../store/users.store';
import api from '../api.js';
import axios from 'axios';
import { ChannelsService } from './channels.service';
import type { Guild, GuildMember } from '../store/guilds.store';
import type { GuildEvent } from '../handlers/types';

export type CreateGuildPayload = {
  name: string;
};

export const GuildsService = {
  async loadGuilds() {
    const { setGuilds } = useGuildsStore.getState();
    try {
      const { data } = await api.get<Guild[]>('/guilds');
      setGuilds(data);
    } catch {
      toast.error('Unable to load guilds.');
    }
  },

  async loadGuildMembers(guildId: string) {
    const { setGuildMembers } = useGuildsStore.getState();
    const { setUsers } = useUsersStore.getState();
    try {
      const { data } = await api.get<GuildMember[]>(`/guilds/${guildId}/members`);
      setGuildMembers(guildId, data);

      // Extract and store users from members
      const users = data.map((member) => member.user).filter((user) => user);
      setUsers(users);
    } catch {
      toast.error('Unable to load guild members.');
    }
  },

  async createGuild(guildData: CreateGuildPayload) {
    const { addGuild } = useGuildsStore.getState();
    try {
      const { data } = await api.post<Guild>('/guilds', guildData);
      addGuild(data);
      ChannelsService.initializeGuildChannels(data.id);
      toast.success('Server created successfully.');
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'An error occurred.');
      } else {
        toast.error('An error occurred.');
      }
    }
  },

  async deleteGuildChannel(guildId: string, channelId: string) {
    const { editGuild, guilds } = useGuildsStore.getState();
    try {
      await api.delete(`/guilds/${guildId}/channels/${channelId}`);
      const guild = guilds.find((g) => g.id === guildId);
      if (guild) {
        editGuild(guildId, { channels: guild.channels.filter((c) => c.channel_id !== channelId) });
      }
      toast.success('Channel deleted successfully.');
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'An error occurred.');
      } else {
        toast.error('An error occurred.');
      }
    }
  },

  /**
   * Add a guild member to the local store
   */
  async addGuildMemberToStore(guildId: string, member: GuildMember) {
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
   */
  async updateGuildMemberInStore(guildId: string, memberId: string, updates: Partial<GuildMember>) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const { setUser } = useUsersStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    const exists = members.some((member) => member.user_id === memberId);
    if (exists) {
      const updatedMembers = members.map((member) =>
        member.user_id === memberId ? { ...member, ...updates } : member
      );
      setGuildMembers(guildId, updatedMembers);
    } else {
      setGuildMembers(guildId, [...members, { user_id: memberId, ...updates } as GuildMember]);
    }

    if (updates.user) {
      setUser(updates.user.id, updates.user);
    }
  },

  handleGuildUpdated(event: GuildEvent) {
    const { editGuild } = useGuildsStore.getState();
    editGuild(event.guild.id, event.guild);
  },

  handleGuildDeleted(event: { guild: Pick<Guild, 'id'> }) {
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

  async discoverGuilds(search?: string): Promise<Guild[]> {
    const params = search ? { search } : {};
    const { data } = await api.get<Guild[]>('/guilds/discovery', { params });
    return data;
  },

  async joinGuild(guildId: string) {
    try {
      await api.post(`/guilds/${guildId}/join`);
      toast.success('Joined server successfully.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Unable to join server.');
      } else {
        toast.error('Unable to join server.');
      }
      throw error;
    }
  },

  async leaveGuild(guildId: string) {
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
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to kick member.');
      } else {
        toast.error('Failed to kick member.');
      }
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
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to ban member.');
      } else {
        toast.error('Failed to ban member.');
      }
      throw error;
    }
  },

  async unbanMember(guildId: string, memberId: string) {
    try {
      await api.delete(`/guilds/${guildId}/bans/${memberId}`);
      toast.success('Member unbanned successfully.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to unban member.');
      } else {
        toast.error('Failed to unban member.');
      }
      throw error;
    }
  },

  async getGuildBans(guildId: string) {
    const { data } = await api.get(`/guilds/${guildId}/bans`);
    return data;
  },
};
