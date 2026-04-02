import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConnectDiscordDialog from '@/discord/components/ConnectDiscordDialog';
import ConnectTelegramDialog from '@/telegram/components/ConnectTelegramDialog';
import ConnectIgniteDialog from '@/components/ConnectIgniteDialog';
import { Check } from '@phosphor-icons/react';
import { useAuthStore } from '@/ignite/store/auth.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useTelegramStore } from '@/telegram/store/telegram.store';

export default function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [subDialog, setSubDialog] = useState<'ignite' | 'discord' | 'telegram' | null>(null);

  const { userId } = useAuthStore();
  const discordAccounts = useDiscordStore((s) => s.accounts);
  const telegramSession = useTelegramStore((s) => s.session);
  const hasAnyAccount = !!(userId || discordAccounts.length > 0 || telegramSession);

  const hasIgnite = !!userId;
  const hasTelegram = !!telegramSession;

  const closeSubDialog = useCallback(() => setSubDialog(null), []);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      // Prevent closing if no accounts are connected
      if (!o && !hasAnyAccount) return;
      onOpenChange(o);
    },
    [hasAnyAccount, onOpenChange],
  );

  return (
    <>
      <Dialog open={open && !subDialog} onOpenChange={handleOpenChange}>
        <DialogContent
          className="!max-w-sm"
          showCloseButton={hasAnyAccount}
          onPointerDownOutside={hasAnyAccount ? undefined : (e) => e.preventDefault()}
          onEscapeKeyDown={hasAnyAccount ? undefined : (e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{hasAnyAccount ? 'Add Account' : 'Welcome to Ignite'}</DialogTitle>
            <DialogDescription>
              {hasAnyAccount ? 'Connect another account.' : 'Connect an account to get started.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => !hasIgnite && setSubDialog('ignite')}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                hasIgnite
                  ? 'cursor-default border-green-500/30 bg-green-500/5'
                  : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/20">
                <svg className="size-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Ignite</p>
                <p className="text-xs text-gray-400">{hasIgnite ? 'Connected' : 'Login or create an account'}</p>
              </div>
              {hasIgnite && <Check size={20} weight="bold" className="shrink-0 text-green-500" />}
            </button>

            <button
              onClick={() => setSubDialog('discord')}
              className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-left transition-colors hover:bg-white/5"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-[#5865f2]/20">
                <svg className="size-5 text-[#5865f2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Discord</p>
                <p className="text-xs text-gray-400">Connect your Discord account</p>
              </div>
            </button>

            {!!window.IgniteNative && (
              <button
                onClick={() => !hasTelegram && setSubDialog('telegram')}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  hasTelegram
                    ? 'cursor-default border-green-500/30 bg-green-500/5'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-[#2AABEE]/20">
                  <svg className="size-5 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">Telegram</p>
                  <p className="text-xs text-gray-400">{hasTelegram ? 'Connected' : 'Connect your Telegram account'}</p>
                </div>
                {hasTelegram && <Check size={20} weight="bold" className="shrink-0 text-green-500" />}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConnectIgniteDialog open={subDialog === 'ignite'} onOpenChange={(o) => !o && closeSubDialog()} />
      <ConnectDiscordDialog open={subDialog === 'discord'} onOpenChange={(o) => !o && closeSubDialog()} />
      <ConnectTelegramDialog open={subDialog === 'telegram'} onOpenChange={(o) => !o && closeSubDialog()} />
    </>
  );
}
