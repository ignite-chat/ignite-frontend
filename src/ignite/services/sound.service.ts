import { useSoundStore, type SoundEventType } from '../store/sound.store';

// Default sound imports
import messageNotification from '@/assets/sounds/message_notification.wav';
import voiceMute from '@/assets/sounds/voice_mute.wav';
import voiceUnmute from '@/assets/sounds/voice_unmute.wav';
import voiceDeafen from '@/assets/sounds/voice_deafen.wav';
import voiceUndeafen from '@/assets/sounds/voice_undeafen.wav';
import userJoinChannel from '@/assets/sounds/user_join_channel.wav';
import userLeaveChannel from '@/assets/sounds/user_leave_channel.wav';
import userMovedChannel from '@/assets/sounds/user_moved_channel.wav';
import viewerJoinStream from '@/assets/sounds/viewer_join_stream.wav';
import viewerLeaveStream from '@/assets/sounds/viewer_leave_stream.wav';
import voiceDisconnected from '@/assets/sounds/voice_disconnected.wav';
import incomingCall from '@/assets/sounds/incoming_call.wav';
import cameraOn from '@/assets/sounds/camera_on.wav';
import cameraOff from '@/assets/sounds/camera_off.wav';

const DEFAULT_SOUNDS: Record<SoundEventType, string> = {
  message_notification: messageNotification,
  voice_mute: voiceMute,
  voice_unmute: voiceUnmute,
  voice_deafen: voiceDeafen,
  voice_undeafen: voiceUndeafen,
  user_join_channel: userJoinChannel,
  user_leave_channel: userLeaveChannel,
  user_moved_channel: userMovedChannel,
  viewer_join_stream: viewerJoinStream,
  viewer_leave_stream: viewerLeaveStream,
  voice_disconnected: voiceDisconnected,
  incoming_call: incomingCall,
  camera_on: cameraOn,
  camera_off: cameraOff,
};

// Cross-tab deduplication for message notifications
const notificationChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('ignite:notification-sound')
    : null;
const recentlyPlayed = new Set<string>();

notificationChannel?.addEventListener('message', (event) => {
  if (event.data?.type === 'played') {
    recentlyPlayed.add(event.data.id);
  }
});

// Audio cache keyed by source URL/dataUrl
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(eventType: SoundEventType): HTMLAudioElement {
  const config = useSoundStore.getState().events[eventType];
  const src = config?.customSound ?? DEFAULT_SOUNDS[eventType];

  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audioCache.set(src, audio);
  }
  return audio;
}

export const SoundService = {
  playSound(eventType: SoundEventType, deduplicationId?: string) {
    const { disableAll, events } = useSoundStore.getState();
    if (disableAll || !events[eventType]?.enabled) return;

    if (deduplicationId) {
      if (recentlyPlayed.has(deduplicationId)) return;
      recentlyPlayed.add(deduplicationId);
      notificationChannel?.postMessage({ type: 'played', id: deduplicationId });
      setTimeout(() => recentlyPlayed.delete(deduplicationId), 10000);
    }

    const audio = getAudio(eventType);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  },

  previewSound(eventType: SoundEventType) {
    const audio = getAudio(eventType);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  },

  invalidateCache(eventType: SoundEventType) {
    for (const key of audioCache.keys()) {
      // Remove default and any custom entries — next play will re-create
      if (key === DEFAULT_SOUNDS[eventType] || key.startsWith('data:')) {
        audioCache.delete(key);
      }
    }
  },

  /** Backward-compat wrapper used by NotificationService */
  playNotificationSound(messageId: string) {
    this.playSound('message_notification', messageId);
  },
};
