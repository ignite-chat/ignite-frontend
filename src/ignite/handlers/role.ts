import { RolesService } from '../services/roles.service';
import type { GatewayHandlerContext } from './types';

export function handleRoleCreated(data: any, _context: GatewayHandlerContext): void {
  RolesService.handleRoleCreated(data);
}

export function handleRoleUpdated(data: any, _context: GatewayHandlerContext): void {
  RolesService.handleRoleUpdated(data);
}

export function handleRoleDeleted(data: any, _context: GatewayHandlerContext): void {
  RolesService.handleRoleDeleted(data);
}
