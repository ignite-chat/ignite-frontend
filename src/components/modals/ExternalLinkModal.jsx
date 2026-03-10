import { useState } from 'react';
import { ArrowSquareOut, ShieldWarning, Copy, Check } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useModalStore } from '@/store/modal.store';
import { toast } from 'sonner';

const openUrl = (url) => {
  if (window.IgniteNative?.isElectron) {
    window.IgniteNative.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const ExternalLinkModal = ({ modalId, url }) => {
  const [copied, setCopied] = useState(false);
  const closeModal = () => useModalStore.getState().close(modalId);

  let domain;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url;
  }

  const handleConfirm = () => {
    openUrl(url);
    closeModal();
  };

  const handleCopyUrl = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="!max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldWarning className="size-5 text-yellow-500" weight="fill" />
            Hold on — you're leaving Ignite
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p className="text-sm text-gray-400">
                This link will take you to an external website. Make sure you trust the destination
                before continuing.
              </p>

              <div className="rounded-md bg-gray-800/80 ring-1 ring-gray-700/60">
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <ArrowSquareOut className="mt-0.5 size-4 shrink-0 text-gray-500" />
                  <span className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent max-h-[4.5rem] min-w-0 flex-1 overflow-y-auto break-all font-mono text-sm text-gray-200">
                    {url}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-green-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Destination: <span className="font-medium text-gray-400">{domain}</span>
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
          >
            Visit Site
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalLinkModal;

export const openExternalLinkModal = (url) => {
  useModalStore.getState().push(ExternalLinkModal, { url });
};
