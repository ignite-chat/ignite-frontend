export type VoiceState = {
  user_id: string;
  channel_id: string | null;
  guild_id: string;
  session_id: string;
  self_mute: boolean;
  self_deaf: boolean;
  mute: boolean;
  deaf: boolean;
  self_video: boolean;
  self_stream?: boolean;
  suppress: boolean;
  member?: any;
};
