import { toast } from 'sonner';

/**
 * Download an image by fetching it as a blob and triggering a save dialog.
 * Works for cross-origin URLs where `<a download>` would be ignored.
 */
export async function downloadImage(url, fallbackName) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'png';
    const filename = fallbackName || url.split('/').pop()?.split('?')[0] || `image.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    toast.error('Failed to save image.');
  }
}

/**
 * Copy an image to the clipboard as PNG.
 * Converts non-PNG images via canvas.
 */
export async function copyImageToClipboard(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const pngBlob =
      blob.type === 'image/png'
        ? blob
        : await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              canvas.toBlob(resolve, 'image/png');
            };
            img.src = url;
          });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    toast.success('Image copied to clipboard.');
  } catch {
    toast.error('Failed to copy image.');
  }
}
