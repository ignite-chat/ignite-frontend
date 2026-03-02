import { useUsersStore } from '../store/users.store';
import type { GatewayHandlerContext } from './types';

export function handleUserUpdated(data: any, _context: GatewayHandlerContext): void {
  useUsersStore.getState().setUser(data.user.id, data.user);
}
