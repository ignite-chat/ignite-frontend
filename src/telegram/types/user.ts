export type TelegramUser = {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  photo?: string | null;
  bot?: boolean;
  deleted?: boolean;
  status?: 'online' | 'offline' | 'recently' | 'lastWeek' | 'lastMonth' | 'longAgo';
  lastOnline?: number;
};
