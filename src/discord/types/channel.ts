export type DiscordChannel = {
  id: string;
  type: number;
  guild_id?: string;
  name?: string;
  position?: number;
  parent_id?: string | null;
  topic?: string | null;
  last_message_id?: string | null;
  is_message_request?: boolean;
  is_message_request_timestamp?: string | null;
  is_spam?: boolean;
  safety_warnings?: any[];
  recipient_ids?: string[];
  [key: string]: any;
};

export type ReadStateEntry = {
  id: string; // channel or guild ID
  last_message_id?: string;
  mention_count?: number;
  last_viewed?: number;
  last_pin_timestamp?: string;
  flags?: number;
  // Type 2/4 entries (notification/guild read states)
  read_state_type?: number;
  last_acked_id?: string;
  badge_count?: number;
};
