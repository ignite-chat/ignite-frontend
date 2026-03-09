import type { CaptchaChallenge, CaptchaSolution } from '../types';

export type { CaptchaChallenge, CaptchaSolution } from '../types';

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
