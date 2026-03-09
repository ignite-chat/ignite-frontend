export type DiscordTypingUser = {
  user_id: string;
  username: string;
  avatar: string | null;
  expiresAt: number;
};

export type CaptchaChallenge = {
  captcha_sitekey: string;
  captcha_service: string;
  captcha_rqdata?: string;
  captcha_rqtoken?: string;
  captcha_session_id?: string;
};

export type CaptchaSolution = {
  captcha_key: string;
  captcha_rqtoken?: string;
  captcha_session_id?: string;
};

export type GatewayEventHandler = (data: any) => void;

export type PermissionOverwrite = {
  id: string;
  type: number; // 0 = role, 1 = member
  allow: string;
  deny: string;
};

export type Role = {
  id: string;
  permissions: string;
  [key: string]: any;
};
