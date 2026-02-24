import { useState, useEffect, useRef } from 'react';
import { StickersService } from '../../services/stickers.service';
import { useStickersStore } from '../../store/stickers.store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { Upload, Trash2 } from 'lucide-react';
import ImageCropperDialog from '@/components/modals/ImageCropperDialog';
import api from '../../api';

const STICKER_SIZE = 320;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ServerStickerManager = ({ guild }) => {
  const [uploading, setUploading] = useState(false);
  const [stickerName, setStickerName] = useState('');
  const [croppedImage, setCroppedImage] = useState(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState(null);

  const fileInputRef = useRef(null);

  const guildStickers = useStickersStore((state) => state.guildStickers[guild.id] || []);

  useEffect(() => {
    if (guild?.id) {
      StickersService.loadGuildStickers(guild.id);
    }
  }, [guild?.id]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!stickerName) {
      const name = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      setStickerName(name);
    }

    const dataUrl = await fileToDataUrl(file);
    setCropperSrc(dataUrl);
    setCropperOpen(true);
  };

  const handleCropConfirm = (croppedDataUrl) => {
    setCroppedImage(croppedDataUrl);
    setCropperOpen(false);
    setCropperSrc(null);
  };

  const handleCropClose = () => {
    setCropperOpen(false);
    setCropperSrc(null);
  };

  const handleUpload = async () => {
    if (!croppedImage || !stickerName) {
      toast.error('Please select an image and enter a name.');
      return;
    }

    setUploading(true);
    try {
      const { addGuildSticker } = useStickersStore.getState();
      const res = await api.post(`guilds/${guild.id}/stickers`, {
        name: stickerName,
        image: croppedImage,
      });
      addGuildSticker(guild.id, res.data);
      toast.success('Sticker uploaded successfully!');
      setStickerName('');
      setCroppedImage(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload sticker.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (stickerId) => {
    try {
      await StickersService.deleteSticker(guild.id, stickerId);
      toast.success('Sticker deleted.');
    } catch (error) {
      toast.error('Failed to delete sticker.');
    }
  };

  return (
    <div className="max-w-[740px] space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Stickers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload custom stickers and use them in your server. You can upload up to 30 custom stickers.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Upload Sticker</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Image picker */}
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Image</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-border bg-background transition-colors hover:border-primary/50"
              >
                {croppedImage ? (
                  <img
                    src={croppedImage}
                    className="h-full w-full object-contain"
                    alt="Preview"
                  />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </button>

              <div className="flex-1 text-xs text-muted-foreground">
                <p>Recommended: 320×320</p>
                <p>Allowed: PNG, JPEG, GIF</p>
                {croppedImage && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 text-primary hover:underline"
                  >
                    Change image
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              Sticker Name
            </Label>
            <Input
              placeholder="sticker_name"
              value={stickerName}
              onChange={(e) =>
                setStickerName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              className="h-10 bg-background"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !croppedImage || !stickerName}
            className="shrink-0"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">
            {guildStickers.length} Stickers
          </h3>
          <p className="text-xs text-muted-foreground">Slots remaining: {30 - guildStickers.length}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {guildStickers.map((sticker) => (
            <div
              key={sticker.id}
              className="group relative flex flex-col items-center gap-2 rounded-md border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="h-24 w-24">
                <img
                  src={`${import.meta.env.VITE_CDN_BASE_URL}/stickers/${sticker.id}`}
                  alt={sticker.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="w-full truncate text-center text-xs font-medium text-foreground">
                {sticker.name}
              </span>
              <button
                onClick={() => handleDelete(sticker.id)}
                className="absolute right-1 top-1 p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {guildStickers.length === 0 && (
            <div className="col-span-full py-10 text-center">
              <p className="text-sm italic text-muted-foreground">
                No custom stickers yet. Upload one above!
              </p>
            </div>
          )}
        </div>
      </div>

      <ImageCropperDialog
        open={cropperOpen}
        onClose={handleCropClose}
        imageSrc={cropperSrc}
        title="Crop Sticker"
        aspect={1}
        cropShape="rect"
        outputWidth={STICKER_SIZE}
        outputHeight={STICKER_SIZE}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};

export default ServerStickerManager;
