export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  display_name?: string | null;
  avatar: string | null;
  avatar_decoration_data?: {
    sku_id: string;
    expires_at: string | null;
    asset: string;
  } | null;
  bot?: boolean;
  public_flags?: number;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  activities?: any[];
  client_status?: { desktop?: string; mobile?: string; web?: string; embedded?: string };
  [key: string]: any;
};

export type Presence = {
  user_id: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  activities?: any[];
  client_status?: { desktop?: string; mobile?: string; web?: string; embedded?: string };
};

export type ScannedUser = {
  userId: string;
  discriminator: string;
  avatarHash: string;
  username: string;
};

export type RemoteAuthState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'qr_ready'; qrUrl: string; fingerprint: string }
  | { status: 'scanned'; user: ScannedUser }
  | { status: 'authenticated'; token: string }
  | { status: 'cancelled' }
  | { status: 'timeout' }
  | { status: 'error'; message: string };
