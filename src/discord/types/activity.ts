export type DiscordActivity = {
  name: string;
  type: number;
  state?: string;
  details?: string;
  url?: string;
  timestamps?: { start?: number; end?: number };
  application_id?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  party?: { id?: string; size?: [number, number] };
  emoji?: { name: string; id?: string; animated?: boolean };
  created_at?: number;
  [key: string]: any;
};
