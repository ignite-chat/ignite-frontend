import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Volume2, Upload } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { useSoundStore, SOUND_EVENTS, SOUND_EVENT_LABELS } from '../../../store/sound.store';
import { SoundService } from '../../../services/sound.service';

const TabNotificationSounds = () => {
  const disableAll = useSoundStore((s) => s.disableAll);
  const events = useSoundStore((s) => s.events);
  const { setDisableAll, setEventEnabled, setCustomSound, removeCustomSound } = useSoundStore();
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const handleUploadClick = (eventType) => {
    setUploadTarget(eventType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadTarget) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Sound file must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomSound(uploadTarget, reader.result);
      SoundService.invalidateCache(uploadTarget);
      setUploadTarget(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-[740px] space-y-6">
      <div>
        <h3 className="text-base font-semibold">Notification Sounds</h3>
        <p className="text-sm text-muted-foreground">
          Toggle and customize sounds for different events
        </p>
      </div>

      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Disable All Notification Sounds</p>
          <p className="text-xs text-muted-foreground">Mute every sound effect at once</p>
        </div>
        <Switch checked={disableAll} onCheckedChange={setDisableAll} />
      </div>

      {/* Per-event rows */}
      <div className="space-y-1 rounded-lg border border-border bg-card p-4">
        {SOUND_EVENTS.map((eventType) => {
          const config = events[eventType];
          return (
            <div
              key={eventType}
              className="flex items-center justify-between rounded-md px-2 py-2.5 hover:bg-muted/50"
            >
              <span className="text-sm font-medium">{SOUND_EVENT_LABELS[eventType]}</span>
              <div className="flex items-center gap-2">
                {/* Preview */}
                <button
                  onClick={() => SoundService.previewSound(eventType)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Preview sound"
                >
                  <Volume2 className="h-4 w-4" />
                </button>

                {/* Upload custom */}
                <button
                  onClick={() => handleUploadClick(eventType)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Upload custom sound"
                >
                  <Upload className="h-4 w-4" />
                </button>

                {/* Remove custom */}
                {config?.customSound && (
                  <button
                    onClick={() => {
                      removeCustomSound(eventType);
                      SoundService.invalidateCache(eventType);
                    }}
                    className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                    title="Remove custom sound"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Toggle */}
                <Switch
                  checked={config?.enabled ?? true}
                  onCheckedChange={(checked) => setEventEnabled(eventType, checked)}
                  disabled={disableAll}
                />
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default TabNotificationSounds;
