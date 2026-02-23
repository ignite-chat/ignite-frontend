import { ChannelsService } from '../services/channels.service';
import type { GatewayHandlerContext } from './types';

export function handleMessageCreated(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleMessageCreated(data);
}

export function handleMessageUpdated(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleMessageUpdated(data);
}

export function handleMessageDeleted(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleMessageDeleted(data);
}
