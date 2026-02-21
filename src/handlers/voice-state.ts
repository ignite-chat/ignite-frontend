import { useVoiceStore } from '../store/voice.store';
import { SoundService } from '../services/sound.service';
import type { GatewayHandlerContext } from './types';

export function handleVoiceStateJoined(data: any, context: GatewayHandlerContext): void {
  useVoiceStore.getState().upsertVoiceState(data.channel_id, data);

  // Play join sound if someone joined our current channel (not ourselves)
  const { channelId } = useVoiceStore.getState();
  if (channelId && data.channel_id === channelId && data.user_id !== context.currentUserId) {
    SoundService.playSound('user_join_channel');
  }
}

export function handleVoiceStateUpdate(data: any, context: GatewayHandlerContext): void {
  useVoiceStore.getState().upsertVoiceState(data.channel_id, data);
}

export function handleVoiceStateLeft(data: any, context: GatewayHandlerContext): void {
  // Play leave sound if someone left our current channel (not ourselves)
  const { channelId } = useVoiceStore.getState();
  if (channelId && data.channel_id === channelId && data.user_id !== context.currentUserId) {
    SoundService.playSound('user_leave_channel');
  }

  useVoiceStore.getState().removeVoiceState(data.user_id);
}
