import { ChannelsService } from '../services/channels.service';
import type { GatewayHandlerContext } from './types';

export function handleChannelCreated(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleChannelCreated(data);
}

export function handleChannelUpdated(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleChannelUpdated(data);
}

export function handleChannelDeleted(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleChannelDeleted(data);
}

export function handleChannelPermissionUpdated(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleChannelPermissionUpdated(data);
}

export function handleChannelPermissionDeleted(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleChannelPermissionDeleted(data);
}
