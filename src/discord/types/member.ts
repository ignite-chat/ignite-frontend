export type DiscordMember = {
  user?: {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
    [key: string]: any;
  };
  user_id?: string;
  nick?: string | null;
  roles: string[];
  joined_at?: string;
  presence?: {
    status: string;
    activities?: any[];
    client_status?: any;
  };
  [key: string]: any;
};

export type MemberListGroup = {
  id: string; // role id, "online", or "offline"
  count: number;
};

export type MemberListItem =
  | { group: { id: string; count: number } }
  | { member: any };

export type MemberListData = {
  id: string; // list id — unique per channel subscription
  groups: MemberListGroup[];
  items: MemberListItem[];
  member_count: number;
  online_count: number;
};

