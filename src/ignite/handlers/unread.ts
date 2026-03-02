import { UnreadsService } from '../services/unreads.service';

export function handleUnreadUpdated(data: any): void {
  UnreadsService.updateUnread(data.unread.channel_id, data.unread);
}
