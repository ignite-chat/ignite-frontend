import { useRef, useState, useCallback } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useModalStore } from '@/store/modal.store';

const DiscordCaptchaModal = ({ modalId, challenge, onSolve, onDismiss }) => {
  const captchaRef = useRef(null);
  const resolved = useRef(false);
  const [error, setError] = useState(null);

  const handleVerify = useCallback(
    (token) => {
      if (resolved.current) return;
      resolved.current = true;
      onSolve({
        captcha_key: token,
        captcha_rqtoken: challenge.captcha_rqtoken,
        captcha_session_id: challenge.captcha_session_id,
      });
      useModalStore.getState().close(modalId);
    },
    [challenge, modalId, onSolve]
  );

  const handleDismiss = useCallback(() => {
    if (resolved.current) return;
    resolved.current = true;
    onDismiss();
    useModalStore.getState().close(modalId);
  }, [modalId, onDismiss]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-md border-white/10 bg-[#2b2d31]">
        <DialogTitle className="text-center text-white">Verification Required</DialogTitle>
        <DialogDescription className="text-center text-gray-400">
          Discord requires you to complete a captcha to continue.
        </DialogDescription>
        <div className="flex justify-center py-4">
          <HCaptcha
            ref={captchaRef}
            sitekey={challenge.captcha_sitekey}
            rqdata={challenge.captcha_rqdata}
            theme="dark"
            onVerify={handleVerify}
            onExpire={() => {
              setError('Captcha expired. Please try again.');
              captchaRef.current?.resetCaptcha();
            }}
            onError={() => setError('Captcha failed to load. Please try again.')}
          />
        </div>
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </DialogContent>
    </Dialog>
  );
};

export default DiscordCaptchaModal;
