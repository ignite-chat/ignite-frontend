import { EmojisService } from '../services/emojis.service';
import type { GatewayHandlerContext } from './types';

export function handleEmojiCreated(data: any, _context: GatewayHandlerContext): void {
  EmojisService.handleEmojiCreated(data);
}

export function handleEmojiDeleted(data: any, _context: GatewayHandlerContext): void {
  EmojisService.handleEmojiDeleted(data);
}
