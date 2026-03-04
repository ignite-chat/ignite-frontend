import { useEffect } from 'react';
import { onCaptchaRequest } from '../services/discord-captcha-bridge';
import { useModalStore } from '@/store/modal.store';
import DiscordCaptchaModal from './DiscordCaptchaModal';

const DiscordCaptchaProvider = () => {
  useEffect(() => {
    return onCaptchaRequest((challenge, resolve, reject) => {
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
