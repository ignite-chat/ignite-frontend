import { useAuthStore } from '../store/auth.store';
import { FriendsService } from './friends.service';
import { UnreadsService } from './unreads.service';
import { ChannelsService } from './channels.service';
import { GuildsService } from './guilds.service';
import { RolesService } from './roles.service';
import { EmojisService } from './emojis.service';
import { useUsersStore } from '../store/users.store';
import { useChannelsStore } from '../store/channels.store';

export const EchoService = {
  activeGuildSubscriptions: new Set<string>(),
  userChannelSubscription: null as any,

  subscribeToUserChannel(userId: string) {
    if (this.userChannelSubscription) {
      console.log('User channel already subscribed');
      return;
    }

    console.log(`Subscribing to private.user.${userId}`);

    this.userChannelSubscription = window.Echo.private(`user.${userId}`)
      .listen('.friendrequest.created', (event: any) => {
        console.log('Received friend request event:', event);
        FriendsService.loadRequests();
      })
      .listen('.friendrequest.deleted', (event: any) => {
        console.log('Friend request deleted event:', event);
        FriendsService.loadRequests();
      })
      .listen('.friendrequest.accepted', (event: any) => {
        console.log('Friend request accepted event:', event);
        FriendsService.loadFriends();
        FriendsService.loadRequests();
      })
      .listen('.unread.updated', (event: any) => {
        console.log('Unread updated event:', event);
        UnreadsService.updateUnread(event.unread.channel_id, event.unread);
      })
      .listen('.message.created', ChannelsService.handleMessageCreated)
      .listen('.message.updated', ChannelsService.handleMessageUpdated)
      .listen('.message.deleted', ChannelsService.handleMessageDeleted)
      .listen('.channel.created', ChannelsService.handleChannelCreated)
      .listen('.member.typing', ChannelsService.handleMemberTyping)
      .listen('.user.updated', (event: any) => {
        useUsersStore.getState().setUser(event.user.id, event.user);
      });
  },

  unsubscribeFromUserChannel(userId: string) {
    if (this.userChannelSubscription) {
      window.Echo.leave(`private-user.${userId}`);
      this.userChannelSubscription = null;
    }
  },

  subscribeToGuild(guildId: string) {
    if (this.activeGuildSubscriptions.has(guildId)) {
      return;
    }

    const currentUserId = useAuthStore.getState().userId;
    console.log(`Subscribing to guild: ${guildId}`);

    window.Echo.private(`guild.${guildId}`)
      .listen('.guild.updated', GuildsService.handleGuildUpdated)
      .listen('.guild.deleted', GuildsService.handleGuildDeleted)
      .listen('.member.joined', (event: any) => {
        GuildsService.addGuildMemberToStore(guildId, event.member);
      })
      .listen('.member.updated', (event: any) => {
        GuildsService.updateGuildMemberInStore(guildId, event.member.user_id, event.member);
      })
      .listen('.member.left', (event: any) => {
        GuildsService.deleteGuildMemberFromStore(guildId, event.member.user_id);
      })
      .listen('.message.created', ChannelsService.handleMessageCreated)
      .listen('.message.updated', ChannelsService.handleMessageUpdated)
      .listen('.message.deleted', ChannelsService.handleMessageDeleted)
      .listen('.role.created', RolesService.handleRoleCreated)
      .listen('.role.updated', RolesService.handleRoleUpdated)
      .listen('.role.deleted', RolesService.handleRoleDeleted)
      .listen('.emoji.created', EmojisService.handleEmojiCreated)
      .listen('.emoji.deleted', EmojisService.handleEmojiDeleted)
      .listen('.member.typing', ChannelsService.handleMemberTyping)
      .listen('.user.updated', (event: any) => {
        useUsersStore.getState().setUser(event.user.id, event.user);
      })
      .listen('.voice_state.joined', (event: any) => {
        if (event.voice_state.user_id === currentUserId) return;
        useChannelsStore.getState().updateChannelVoiceState(event.channel_id, event);
      })
      .listen('.voice_state.update', (event: any) => {
        if (event.voice_state.user_id === currentUserId) return;
        useChannelsStore.getState().updateChannelVoiceState(event.channel_id, event, false);
      })
      .listen('.voice_state.left', (event: any) => {
        if (event.voice_state.user_id === currentUserId) return;
        useChannelsStore.getState().removeUserVoiceState(event.user_id);
      });

    this.activeGuildSubscriptions.add(guildId);
  },

  subscribeToGuilds(guilds: any[]) {
    guilds.forEach((guild) => {
      this.subscribeToGuild(guild.id);
    });
  },

  unsubscribeFromGuild(guildId: string) {
    if (this.activeGuildSubscriptions.has(guildId)) {
      window.Echo.leave(`private-guild.${guildId}`);
      this.activeGuildSubscriptions.delete(guildId);
    }
  },

  unsubscribeAll() {
    const userId = useAuthStore.getState().userId;
    if (userId) {
      this.unsubscribeFromUserChannel(userId);
    }

    this.activeGuildSubscriptions.forEach((guildId) => {
      this.unsubscribeFromGuild(guildId);
    });
  },
};
