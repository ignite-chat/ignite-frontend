import { StickersService } from '../services/stickers.service';
import type { GatewayHandlerContext } from './types';

export function handleStickerCreated(data: any, _context: GatewayHandlerContext): void {
  StickersService.handleStickerCreated(data);
}

export function handleStickerDeleted(data: any, _context: GatewayHandlerContext): void {
  StickersService.handleStickerDeleted(data);
}
