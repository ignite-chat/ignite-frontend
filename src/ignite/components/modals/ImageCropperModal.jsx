import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/ignite/store/modal.store';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });

const isGif = (src) =>
  src?.startsWith('data:image/gif') || src?.endsWith('.gif');

const getCroppedImg = async (src, pixelCrop, outputWidth, outputHeight) => {
  const image = await createImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL('image/png');
};

const getCroppedGif = async (src, pixelCrop, outputWidth, outputHeight) => {
  const response = await fetch(src);
  const buffer = await response.arrayBuffer();

  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);

  if (frames.length === 0) throw new Error('No frames found in GIF');

  const gifWidth = gif.lsd.width;
  const gifHeight = gif.lsd.height;

  // Canvas for compositing full frames
  const compCanvas = document.createElement('canvas');
  compCanvas.width = gifWidth;
  compCanvas.height = gifHeight;
  const compCtx = compCanvas.getContext('2d');

  // Canvas for cropping
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = outputWidth;
  cropCanvas.height = outputHeight;
  const cropCtx = cropCanvas.getContext('2d');

  // Temp canvas for drawing frame patches
  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d');

  const encoder = GIFEncoder();
  let previousState = null;

  for (const frame of frames) {
    const { dims, patch, delay, disposalType } = frame;

    // Save composited state before drawing if we need to restore later
    if (disposalType === 3) {
      previousState = compCtx.getImageData(0, 0, gifWidth, gifHeight);
    }

    // Draw the frame patch onto the compositing canvas
    patchCanvas.width = dims.width;
    patchCanvas.height = dims.height;
    const imageData = new ImageData(
      new Uint8ClampedArray(patch),
      dims.width,
      dims.height,
    );
    patchCtx.putImageData(imageData, 0, 0);
    compCtx.drawImage(patchCanvas, dims.left, dims.top);

    // Crop the composited result
    cropCtx.clearRect(0, 0, outputWidth, outputHeight);
    cropCtx.drawImage(
      compCanvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const { data } = cropCtx.getImageData(0, 0, outputWidth, outputHeight);
    const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
    const indexed = applyPalette(data, palette, 'rgba4444');

    // Find the first fully-transparent palette entry
    let transparentIndex;
    for (let i = 0; i < palette.length; i++) {
      if (palette[i][3] === 0) {
        transparentIndex = i;
        break;
      }
    }

    encoder.writeFrame(indexed, outputWidth, outputHeight, {
      palette: palette.map(([r, g, b]) => [r, g, b]),
      delay: delay ?? 100,
      ...(transparentIndex !== undefined && { transparent: true, transparentIndex }),
    });

    // Handle disposal for next frame
    if (disposalType === 2) {
      compCtx.clearRect(dims.left, dims.top, dims.width, dims.height);
    } else if (disposalType === 3 && previousState) {
      compCtx.putImageData(previousState, 0, 0);
      previousState = null;
    }
  }

  encoder.finish();

  const bytes = encoder.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

/**
 * @param {object} props
 * @param {number}  props.modalId
 * @param {string}   props.imageSrc   — data URL or object URL of the raw file
 * @param {number}   props.aspect     — width/height ratio for the crop area
 * @param {number}   props.outputWidth
 * @param {number}   props.outputHeight
 * @param {'rect'|'round'} [props.cropShape]
 * @param {string}   props.title
 * @param {(dataUrl: string) => void} props.onConfirm
 */
const ImageCropperModal = ({
  modalId,
  imageSrc,
  aspect,
  outputWidth,
  outputHeight,
  cropShape = 'rect',
  title,
  onConfirm,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const closeModal = () => useModalStore.getState().close(modalId);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setProcessing(true);
    try {
      const cropFn = isGif(imageSrc) ? getCroppedGif : getCroppedImg;
      const dataUrl = await cropFn(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
      onConfirm(dataUrl);
      closeModal();
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) closeModal();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pb-4 pt-5">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Crop canvas */}
        <div className="relative h-80 w-full bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-3">
          <span className="w-10 text-xs text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {zoom.toFixed(1)}×
          </span>
        </div>

        <DialogFooter className="px-6 pb-5 pt-2">
          <Button type="button" variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Processing…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
