import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/store/modal.store';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });

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

  const handleCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const closeModal = () => useModalStore.getState().close(modalId);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
    onConfirm(dataUrl);
    closeModal();
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
          <Button type="button" onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
