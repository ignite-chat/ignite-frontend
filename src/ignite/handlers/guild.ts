import { GuildsService } from '../services/guilds.service';
import { ChannelsService } from '../services/channels.service';
import { EmojisService } from '../services/emojis.service';
import { EchoService } from '../services/echo.service';
import { StickersService } from '../services/stickers.service';
import { useGuildsStore } from '../store/guilds.store';
import { useRolesStore } from '../store/roles.store';
import type { GatewayHandlerContext } from './types';

export function handleGuildJoined(data: any): void {
  const guild = data.guild;
  const { addGuild } = useGuildsStore.getState();

  addGuild(guild);

  // Initialize channels from the guild payload
  ChannelsService.initializeGuildChannels(guild.id);

  // Initialize roles from the guild payload
  if (guild.roles) {
    const { setGuildRoles } = useRolesStore.getState();
    setGuildRoles(guild.id, guild.roles);
  }

  // Load emojis and stickers from the API
  EmojisService.loadGuildEmojis(guild.id);
  StickersService.loadGuildStickers(guild.id);

  EchoService.subscribeToGuild(guild.id);
}

export function handleGuildUpdated(data: any, _context: GatewayHandlerContext): void {
  GuildsService.handleGuildUpdated(data);
}

export function handleGuildDeleted(data: any, _context: GatewayHandlerContext): void {
  GuildsService.handleGuildDeleted(data);
  EchoService.unsubscribeFromGuild(data.guild.id);
}
