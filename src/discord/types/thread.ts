export type ForumThread = {
  id: string;
  [key: string]: any;
};

export type FirstMessage = {
  channel_id: string;
  [key: string]: any;
};

export type ChannelThreadData = {
  threads: ForumThread[];
  /** Maps threadId → messageId (the actual message lives in discord-channels.store) */
  firstMessageIds: { [threadId: string]: string };
  hasMore: boolean;
  offset: number;
};
