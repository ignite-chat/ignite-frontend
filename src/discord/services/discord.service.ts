import { toast } from 'sonner';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordRelationshipsStore } from '../store/discord-relationships.store';
import { DiscordGatewayService } from './discord-gateway.service';
import { DiscordApiService } from './discord-api.service';

export const DiscordService = {
  /**
   * Connect to Discord using the stored token.
   * Opens the gateway WebSocket and fetches initial data.
   */
  async connect() {
    const token = useDiscordStore.getState().token;
    if (!token) {
      toast.error('No Discord token configured.');
      return false;
    }

    try {
      // Set up the dispatch handler for gateway events
      DiscordGatewayService.onDispatch = (payload) => {
        this._handleGatewayDispatch(payload.event, payload.data);
      };

      // Connect to the gateway
      DiscordGatewayService.connect(token);
      return true;
    } catch (error) {
      console.error('[Discord] Failed to connect:', error);
      toast.error('Failed to connect to Discord.');
      return false;
    }
  },

  /**
   * Disconnect from Discord and clear all stores.
   */
  disconnect() {
    DiscordGatewayService.disconnect();
    DiscordGatewayService.onDispatch = null;
    useDiscordStore.getState().setConnected(false);
    useDiscordStore.getState().setUser(null);
    useDiscordStore.getState().setSessionId(null);
    useDiscordGuildsStore.getState().clear();
    useDiscordChannelsStore.getState().clear();
    useDiscordUsersStore.getState().clear();
    useDiscordReadStatesStore.getState().clear();
    useDiscordRelationshipsStore.getState().clear();
    console.log('[Discord] Disconnected and stores cleared');
  },

  /**
   * Fully disconnect and remove the stored token.
   */
  logout() {
    this.disconnect();
    useDiscordStore.getState().disconnect();
    toast.success('Disconnected from Discord.');
  },

  /**
   * Load messages for a specific channel via REST API.
   * Messages are returned newest-first from Discord, we reverse for chronological order.
   */
  async loadChannelMessages(channelId: string, before?: string) {
    try {
      const messages = await DiscordApiService.getChannelMessages(channelId, before);

      const { channelMessages, setChannelMessages } = useDiscordChannelsStore.getState();
      const existing = channelMessages[channelId] || [];

      // Merge and deduplicate by ID, sort chronologically
      const merged = [...existing, ...messages];
      const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values()).sort((a, b) =>
        a.id.localeCompare(b.id)
      );

      setChannelMessages(channelId, unique);
      return messages;
    } catch (error) {
      console.error(`[Discord] Failed to load messages for channel ${channelId}:`, error);
      toast.error('Failed to load Discord messages.');
      return [];
    }
  },

  /**
   * Send a message to a Discord channel.
   */
  async sendMessage(channelId: string, content: string) {
    try {
      const message = await DiscordApiService.sendMessage(channelId, content);
      // The message will also arrive via the gateway's MESSAGE_CREATE event,
      // but we can optimistically add it here for instant UI feedback
      useDiscordChannelsStore.getState().appendMessage(channelId, message);
      return message;
    } catch (error) {
      console.error(`[Discord] Failed to send message to channel ${channelId}:`, error);
      toast.error('Failed to send Discord message.');
      return null;
    }
  },


  /**
   * Load guild members via REST API.
   */
  async loadGuildMembers(guildId: string) {
    try {
      const members = await DiscordApiService.getGuildMembers(guildId);
      useDiscordGuildsStore.getState().setGuildMembers(guildId, members);
      return members;
    } catch (error) {
      console.error(`[Discord] Failed to load members for guild ${guildId}:`, error);
      toast.error('Failed to load Discord members.');
      return [];
    }
  },

  /**
   * Get the avatar URL for a Discord user.
   */
  getUserAvatarUrl(userId: string, avatarHash: string | null, size: number = 128) {
    if (!avatarHash) {
      // Default avatar based on discriminator or user ID
      const index = Number(BigInt(userId) >> 22n) % 6;
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  },

  /**
   * Get the banner URL for a Discord user.
   */
  getUserBannerUrl(userId: string, bannerHash: string | null, size: number = 600) {
    if (!bannerHash) return null;
    const ext = bannerHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${ext}?size=${size}`;
  },

  /**
   * Get the icon URL for a Discord guild.
   */
  getGuildIconUrl(guildId: string, iconHash: string | null, size: number = 128) {
    if (!iconHash) return null;
    const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
  },

  /**
   * Get the URL for a Discord sticker.
   * format_type: 1=PNG, 2=APNG, 3=Lottie, 4=GIF
   */
  getStickerUrl(stickerId: string, formatType: number, size: number = 160) {
    if (formatType === 3) {
      // Lottie stickers are JSON — can't render as an image
      return null;
    }
    const ext = formatType === 4 ? 'gif' : 'png';
    return `https://media.discordapp.net/stickers/${stickerId}.${ext}?size=${size}`;
  },

  /**
   * Handle gateway dispatch events for additional processing.
   * The gateway service already updates stores directly — this is for
   * any extra logic (notifications, cross-store coordination, etc.)
   */
  _handleGatewayDispatch(eventName: string, data: any) {
    switch (eventName) {
      case 'READY':
        console.log(`[Discord] Connected as ${data.user?.username}`);
        break;

      case 'MESSAGE_CREATE': {
        // Could add notification logic here in the future
        const currentUser = useDiscordStore.getState().user;
        if (data.author?.id !== currentUser?.id) {
          // Message from someone else — potential notification
        }
        break;
      }

      default:
        break;
    }
  },
};
