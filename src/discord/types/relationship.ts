export type DiscordRelationship = {
  id: string;
  user_id: string;
  type: number;
  nickname: string | null;
  since?: string | null;
  is_spam_request?: boolean;
  user_ignored?: boolean;
};
