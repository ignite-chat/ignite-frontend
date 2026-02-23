import { useState, useMemo } from 'react';
import { ArrowSquareOut, ShieldWarning, Copy, Check } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { toast } from 'sonner';

/**
 * Detect if running inside Electron.
 * The preload script exposes `window.IgniteNative`.
 */
const isElectron = () => typeof window !== 'undefined' && window.IgniteNative?.isElectron === true;

/**
 * Open a URL externally.
 * In Electron, uses shell.openExternal (opens system browser).
 * In web, uses window.open with noopener/noreferrer.
 */
const openUrl = (url) => {
  if (isElectron()) {
    window.IgniteNative.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const ExternalLink = ({ href, children }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsedUrl = useMemo(() => {
    try {
      return new URL(href);
    } catch {
      return null;
    }
  }, [href]);

  const domain = parsedUrl?.hostname || href;

  const handleConfirm = () => {
    openUrl(href);
    setOpen(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleCopyUrl = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className="inline-flex cursor-pointer items-center gap-1 text-blue-400 underline underline-offset-2 hover:text-blue-300"
      >
        {children}
        <ArrowSquareOut className="inline h-3 w-3 opacity-60" />
      </a>

      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setCopied(false);
        }}
      >
        <AlertDialogContent className="!max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <ShieldWarning className="size-5 text-yellow-500" weight="fill" />
              Hold on — you're leaving Ignite
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-sm text-gray-400">
                  This link will take you to an external website. Make sure you trust the
                  destination before continuing.
                </p>

                <div className="rounded-md bg-gray-800/80 ring-1 ring-gray-700/60">
                  <div className="flex items-start gap-2 px-3 py-2.5">
                    <ArrowSquareOut className="mt-0.5 size-4 shrink-0 text-gray-500" />
                    <span className="min-w-0 flex-1 overflow-y-auto max-h-[4.5rem] break-all font-mono text-sm text-gray-200 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                      {href}
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Visit Site</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExternalLink;
