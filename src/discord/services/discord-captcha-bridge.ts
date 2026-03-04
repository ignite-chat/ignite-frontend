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

type CaptchaRequestListener = (
  challenge: CaptchaChallenge,
  resolve: (solution: CaptchaSolution) => void,
  reject: (reason?: any) => void
) => void;

let listener: CaptchaRequestListener | null = null;

/**
 * Called by the CaptchaProvider on mount to register itself as the handler.
 * Returns an unsubscribe function.
 */
export function onCaptchaRequest(fn: CaptchaRequestListener): () => void {
  listener = fn;
  return () => {
    listener = null;
  };
}

/**
 * Called by the axios interceptor when a captcha response is detected.
 * Returns a Promise that resolves with the solution or rejects if dismissed.
 */
export function requestCaptchaSolution(challenge: CaptchaChallenge): Promise<CaptchaSolution> {
  return new Promise((resolve, reject) => {
    if (!listener) {
      reject(new Error('No captcha handler registered'));
      return;
    }
    listener(challenge, resolve, reject);
  });
}
