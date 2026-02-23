import { useCallback, useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DownloadSimple, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { downloadImage, copyImageToClipboard } from '@/utils/image.utils';
import Avatar from '@/components/Avatar';

const formatLightboxTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })} ${time}`;
};

const ImageLightbox = ({ src, alt, open, onOpenChange, author, timestamp }) => {
  const [ctxMenu, setCtxMenu] = useState(null);

  const handleDownload = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      downloadImage(src, alt);
    },
    [src, alt]
  );

  const handleCopyImageUrl = useCallback(() => {
    navigator.clipboard.writeText(src);
    toast.success('Image URL copied to clipboard.');
  }, [src]);

  const handleOpenImageUrl = useCallback(() => {
    window.open(src, '_blank', 'noopener,noreferrer');
  }, [src]);

  // Close custom context menu on click anywhere or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  // Close context menu when dialog closes
  useEffect(() => {
    if (!open) setCtxMenu(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !ctxMenu) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, ctxMenu]);

  const handleImageContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems = [
    { label: 'Copy Image', action: () => copyImageToClipboard(src) },
    { label: 'Save Image', action: () => downloadImage(src, alt) },
    { label: 'Copy Image URL', action: handleCopyImageUrl },
    { label: 'Open Image URL', action: handleOpenImageUrl },
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={() => onOpenChange(false)}
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
          onClick={() => { if (!ctxMenu) onOpenChange(false); }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt || 'Image preview'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Full size preview of {alt || 'image'}
          </DialogPrimitive.Description>

          {author && (
            <div
              className="absolute left-4 top-4 flex items-center gap-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar user={author} className="size-8" />
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold leading-tight text-[#f2f3f5]">
                  {author.name || author.username}
                </span>
                {timestamp && (
                  <span className="text-xs text-[#949ba4]">
                    {formatLightboxTime(timestamp)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-2">
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-[90vw] rounded object-contain"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={handleImageContextMenu}
            />
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00a8fc] hover:underline"
              >
                Open original
              </a>
              <button
                type="button"
                onClick={handleDownload}
                className="cursor-pointer text-[#b5bac1] transition-colors hover:text-white"
              >
                <DownloadSimple className="size-5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 cursor-pointer rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:text-white"
          >
            <X className="size-5" />
          </button>

          {ctxMenu && (
            <div
              className="fixed z-[100] min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    item.action();
                    setCtxMenu(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ImageLightbox;
