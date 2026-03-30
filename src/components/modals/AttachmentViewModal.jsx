import { useCallback, useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowSquareOut, ArrowClockwise, DownloadSimple, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useModalStore } from '@/store/modal.store';
import { downloadImage, copyImageToClipboard } from '@/ignite/utils/image.utils';
import { useContextMenuStore } from '@/store/context-menu.store';
import AttachmentContextMenu from './AttachmentContextMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const AttachmentViewModal = ({ modalId, url, blobUrl: initialBlobUrl, width, height }) => {
  const [blobUrl, setBlobUrl] = useState(initialBlobUrl || null);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const closeModal = () => {
    useModalStore.getState().close(modalId);
    if (blobUrl && !initialBlobUrl) URL.revokeObjectURL(blobUrl);
  };

  const filename = url.split('/').pop()?.split('?')[0] || 'attachment';
  const isVideo = /\.(mp4|webm|mov|gifv)(\?|$)/i.test(url);

  // Fetch as blob to avoid a second network request (images only)
  useEffect(() => {
    if (blobUrl || isVideo) return;
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
  }, [url, isVideo]);

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

          <div className="relative flex max-h-[90vh] max-w-[90vw] select-none flex-col items-center gap-2">
            {isVideo ? (
              <video
                src={url}
                autoPlay
                loop
                muted
                playsInline
                className={`max-h-[85vh] max-w-[90vw] rounded object-contain transition-all duration-200 ${loaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                style={{
                  ...(rotation ? { transform: `rotate(${rotation}deg)` } : undefined),
                  ...(width && height ? { width: Math.min(width, window.innerWidth * 0.9), aspectRatio: `${width}/${height}` } : undefined),
                }}
                onLoadedData={() => setLoaded(true)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={blobUrl || url}
                alt={filename}
                className={`max-h-[85vh] max-w-[90vw] rounded object-contain transition-all duration-200 ${loaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                style={{
                  ...(rotation ? { transform: `rotate(${rotation}deg)` } : undefined),
                  ...(width && height ? { width: Math.min(width, window.innerWidth * 0.9), aspectRatio: `${width}/${height}` } : undefined),
                }}
                onLoad={() => setLoaded(true)}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  useContextMenuStore.getState().open(AttachmentContextMenu, {
                    url,
                    onCopyImage: () => copyImageToClipboard(url),
                    onDownload: handleDownload,
                    onCopyUrl: handleCopyImageUrl,
                    onOpenOriginal: handleOpenOriginal,
                  }, e);
                }}
              />
            )}

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => r + 90)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded border border-white/10 bg-[#111214] text-gray-300 transition hover:bg-[#1a1b1e] hover:text-white"
                  >
                    <ArrowClockwise className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Rotate</TooltipContent>
              </Tooltip>
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

export const openAttachmentViewModal = (url, blobUrl, width, height) => {
  useModalStore.getState().push(AttachmentViewModal, { url, blobUrl, width, height });
};
