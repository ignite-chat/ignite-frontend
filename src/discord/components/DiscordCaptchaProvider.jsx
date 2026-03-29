import { useEffect } from 'react';
import { onCaptchaRequest } from '../services/discord-captcha-bridge';
import { useModalStore } from '@/store/modal.store';
import DiscordCaptchaModal from './DiscordCaptchaModal';

const DiscordCaptchaProvider = () => {
  useEffect(() => {
    return onCaptchaRequest(async (challenge, resolve, reject) => {
      // Use native Electron captcha window (spoofs discord.com origin)
      if (window.IgniteNative?.solveDiscordCaptcha) {
        try {
          const token = await window.IgniteNative.solveDiscordCaptcha({
            sitekey: challenge.captcha_sitekey,
            rqdata: challenge.captcha_rqdata,
          });
          resolve({
            captcha_key: token,
            captcha_rqtoken: challenge.captcha_rqtoken,
            captcha_session_id: challenge.captcha_session_id,
          });
        } catch {
          reject(new Error('Captcha dismissed by user'));
        }
        return;
      }
      // Fallback: render HCaptcha inline
      useModalStore.getState().push(DiscordCaptchaModal, {
        challenge,
        onSolve: resolve,
        onDismiss: () => reject(new Error('Captcha dismissed by user')),
      });
    });
  }, []);

  return null;
};

export default DiscordCaptchaProvider;
