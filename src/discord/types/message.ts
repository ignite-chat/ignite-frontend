export type DiscordMessage = {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
  };
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  attachments: any[];
  embeds: any[];
  mentions: any[];
  referenced_message?: any;
  [key: string]: any;
};

export type PendingMessage = {
  nonce: string;
  channel_id: string;
  content: string;
  author: DiscordMessage['author'];
  timestamp: string;
  type: number;
};
