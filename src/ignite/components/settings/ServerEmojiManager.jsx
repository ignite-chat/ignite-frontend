import { useState, useEffect, useRef } from 'react';
import { EmojisService } from '../../services/emojis.service';
import { useEmojisStore } from '../../store/emojis.store';
import { useModalStore } from '../../store/modal.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Upload, Trash2 } from 'lucide-react';
import ImageCropperModal from '@/ignite/components/modals/ImageCropperModal';
import api from '@/ignite/api';

const EMOJI_SIZE = 128;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ServerEmojiManager = ({ guild }) => {
  const [uploading, setUploading] = useState(false);
  const [emojiName, setEmojiName] = useState('');
  const [croppedImage, setCroppedImage] = useState(null); // base64 data URL

  const fileInputRef = useRef(null);

  const guildEmojis = useEmojisStore((state) => state.guildEmojis[guild.id] || []);
  
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Auto-fill name from filename if empty
    if (!emojiName) {
      const name = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      setEmojiName(name);
    }

    const dataUrl = await fileToDataUrl(file);
    useModalStore.getState().push(ImageCropperModal, {
      imageSrc: dataUrl,
      title: 'Crop Emoji',
      aspect: 1,
      cropShape: 'rect',
      outputWidth: EMOJI_SIZE,
      outputHeight: EMOJI_SIZE,
      onConfirm: (croppedDataUrl) => setCroppedImage(croppedDataUrl),
    });
  };

  const handleUpload = async () => {
    if (!croppedImage || !emojiName) {
      toast.error('Please select an image and enter a shortcode.');
      return;
    }

    setUploading(true);
    try {
      const { addGuildEmoji } = useEmojisStore.getState();
      const res = await api.post(`guilds/${guild.id}/emojis`, {
        name: emojiName,
        image: croppedImage,
      });
      addGuildEmoji(guild.id, res.data);
      toast.success('Emoji uploaded successfully!');
      setEmojiName('');
      setCroppedImage(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload emoji.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (emojiId) => {
    try {
      await EmojisService.deleteEmoji(guild.id, emojiId);
      toast.success('Emoji deleted.');
    } catch (error) {
      toast.error('Failed to delete emoji.');
    }
  };

  return (
    <div className="max-w-[740px] space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Emoji</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload custom emojis and use them in your server. You can upload up to 50 custom emojis.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Upload Emoji</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Image picker */}
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Image</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-border bg-background transition-colors hover:border-primary/50"
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
                <p>Recommended: 128×128</p>
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
              Emoji Name
            </Label>
            <Input
              placeholder="emoji_name"
              value={emojiName}
              onChange={(e) =>
                setEmojiName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              className="h-10 bg-background"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !croppedImage || !emojiName}
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
            {guildEmojis.length} Emojis
          </h3>
          <p className="text-xs text-muted-foreground">Slots remaining: {50 - guildEmojis.length}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {guildEmojis.map((emoji) => (
            <div
              key={emoji.id}
              className="group relative flex flex-col items-center gap-2 rounded-md border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
            >
              <div className="h-8 w-8">
                <img
                  src={`${import.meta.env.VITE_CDN_BASE_URL}/emojis/${emoji.id}`}
                  alt={emoji.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="w-full truncate text-center text-xs font-medium text-foreground">
                :{emoji.name}:
              </span>
              <button
                onClick={() => handleDelete(emoji.id)}
                className="absolute right-1 top-1 p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {guildEmojis.length === 0 && (
            <div className="col-span-full py-10 text-center">
              <p className="text-sm italic text-muted-foreground">
                No custom emojis yet. Upload one above!
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ServerEmojiManager;
