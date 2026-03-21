import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/store/modal.store';
import { useDiscordGuildFoldersStore } from '../../store/discord-guild-folders.store';

const PRESET_COLORS = [
  null,
  0x5865f2, // blurple
  0x3ba55d, // green
  0xfaa81a, // yellow
  0xed4245, // red
  0xe67e22, // orange
  0x9b59b6, // purple
  0xe91e63, // pink
  0x1abc9c, // teal
  0x11806a, // dark teal
];

const DiscordFolderSettingsModal = ({ modalId, folder }) => {
  const [name, setName] = useState(folder.name || '');
  const [color, setColor] = useState(folder.color);
  const [customColor, setCustomColor] = useState(
    folder.color != null ? `#${folder.color.toString(16).padStart(6, '0')}` : '',
  );

  const close = () => useModalStore.getState().close(modalId);

  const handleSave = () => {
    useDiscordGuildFoldersStore.getState().updateFolder(folder.id, {
      name: name.trim() || null,
      color,
    });
    close();
  };

  const handleColorSelect = (c) => {
    setColor(c);
    setCustomColor(c != null ? `#${c.toString(16).padStart(6, '0')}` : '');
  };

  const handleCustomColorChange = (hex) => {
    setCustomColor(hex);
    const parsed = parseInt(hex.replace('#', ''), 16);
    if (!isNaN(parsed) && hex.replace('#', '').length === 6) {
      setColor(parsed);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>Folder Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-400">
              Folder Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Server Folder"
              maxLength={32}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-400">
              Folder Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleColorSelect(c)}
                  className={`size-8 rounded-full border-2 transition-all ${
                    color === c ? 'scale-110 border-white' : 'border-transparent hover:border-white/30'
                  }`}
                  style={{
                    backgroundColor:
                      c != null ? `#${c.toString(16).padStart(6, '0')}` : '#4e5058',
                  }}
                  title={c === null ? 'Default' : undefined}
                >
                  {c === null && (
                    <span className="flex size-full items-center justify-center text-xs text-white/60">
                      ×
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-gray-400">Custom:</label>
              <input
                type="color"
                value={customColor || '#5865f2'}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <Input
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#5865f2"
                className="h-8 w-24 font-mono text-xs"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiscordFolderSettingsModal;
