import { ChannelsService } from '../services/channels.service';
import type { GatewayHandlerContext } from './types';

/**
 * WebSocket handler for when a reaction is added to a message.
 *
 * TODO: BACKEND — Requires the server to broadcast '.message.reaction.added'
 * events on the guild channel when a user adds a reaction via:
 * PUT /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me
 *
 * Expected event payload: { channel_id, message_id, emoji, user_id }
 */
export function handleReactionAdded(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleReactionAdded(data);
}

/**
 * WebSocket handler for when a reaction is removed from a message.
 *
 * TODO: BACKEND — Requires the server to broadcast '.message.reaction.removed'
 * events on the guild channel when a user removes a reaction via:
 * DELETE /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me
 *
 * Expected event payload: { channel_id, message_id, emoji, user_id }
 */
export function handleReactionRemoved(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleReactionRemoved(data);
}

/**
 * WebSocket handler for bulk-setting reactions on a message (initial load).
 *
 * TODO: BACKEND — Requires the server to broadcast '.message.reactions.set'
 * when a channel is opened, or provide a REST endpoint:
 * GET /channels/{channelId}/messages/{messageId}/reactions
 *
 * Expected event payload: { channel_id, message_id, reactions: Reaction[] }
 * Where Reaction = { emoji, count, users: string[], me: boolean }
 */
export function handleReactionsSet(data: any, _context: GatewayHandlerContext): void {
  ChannelsService.handleReactionsSet(data);
}
