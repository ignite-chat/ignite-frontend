import { GuildSettingsService } from '../services/guild-settings.service';

export function handleGuildSettingsUpdated(data: any): void {
  GuildSettingsService.handleGuildSettingsUpdated(data);
}
