import { useCallback, useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowSquareOut, CopySimple, DownloadSimple, Image, Link, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useModalStore } from '@/store/modal.store';
import { downloadImage, copyImageToClipboard } from '@/ignite/utils/image.utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const AttachmentViewModal = ({ modalId, url, blobUrl: initialBlobUrl }) => {
  const [blobUrl, setBlobUrl] = useState(initialBlobUrl || null);
  const closeModal = () => {
    useModalStore.getState().close(modalId);
    if (blobUrl && !initialBlobUrl) URL.revokeObjectURL(blobUrl);
  };

  const filename = url.split('/').pop()?.split('?')[0] || 'attachment';

  // Fetch as blob to avoid a second network request
  useEffect(() => {
    if (blobUrl) return;
    let revoked = false;
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        if (!revoked) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      revoked = true;
    };
  }, [url]);

  const handleDownload = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      downloadImage(url, filename);
    },
    [url, filename],
  );

  const handleCopyImageUrl = useCallback(() => {
    navigator.clipboard.writeText(url);
    toast.success('Image URL copied to clipboard.');
  }, [url]);

  const handleOpenOriginal = useCallback(() => {
    if (window.IgniteNative?.isElectron) {
      window.IgniteNative.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

  return (
    <DialogPrimitive.Root open onOpenChange={(v) => !v && closeModal()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={closeModal}
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
          onClick={closeModal}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {filename}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Full size preview of {filename}
          </DialogPrimitive.Description>

          <div className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-2">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <img
                  src={blobUrl || url}
                  alt={filename}
                  className="max-h-[85vh] max-w-[90vw] rounded object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => copyImageToClipboard(url)}>
                  <CopySimple className="mr-2 size-4" />
                  Copy Image
                </ContextMenuItem>
                <ContextMenuItem onClick={handleDownload}>
                  <DownloadSimple className="mr-2 size-4" />
                  Save Image
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCopyImageUrl}>
                  <Link className="mr-2 size-4" />
                  Copy Image URL
                </ContextMenuItem>
                <ContextMenuItem onClick={handleOpenOriginal}>
                  <ArrowSquareOut className="mr-2 size-4" />
                  Open in Browser
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleOpenOriginal}
                    className="flex size-9 cursor-pointer items-center justify-center rounded border border-white/10 bg-[#111214] text-gray-300 transition hover:bg-[#1a1b1e] hover:text-white"
                  >
                    <ArrowSquareOut className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Open in Browser</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex size-9 cursor-pointer items-center justify-center rounded border border-white/10 bg-[#111214] text-gray-300 transition hover:bg-[#1a1b1e] hover:text-white"
                  >
                    <DownloadSimple className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save Image</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="absolute right-4 top-4 cursor-pointer rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:text-white"
          >
            <X className="size-5" />
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AttachmentViewModal;

export const openAttachmentViewModal = (url, blobUrl) => {
  useModalStore.getState().push(AttachmentViewModal, { url, blobUrl });
};
