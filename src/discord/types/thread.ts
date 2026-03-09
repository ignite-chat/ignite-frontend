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
  firstMessages: { [threadId: string]: FirstMessage };
  hasMore: boolean;
  offset: number;
};
