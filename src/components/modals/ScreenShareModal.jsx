import { useState, useEffect, useCallback } from 'react';
import { Monitor, AppWindow, ArrowsClockwise } from '@phosphor-icons/react';
import { VoiceService } from '@/services/voice.service';
import { useModalStore } from '@/store/modal.store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const QUALITY_PRESETS = [
  { label: '720p 30 FPS', width: 1280, height: 720, frameRate: 30 },
  { label: '1080p 30 FPS', width: 1920, height: 1080, frameRate: 30 },
  { label: '1080p 60 FPS', width: 1920, height: 1080, frameRate: 60 },
  { label: '1440p 30 FPS', width: 2560, height: 1440, frameRate: 30 },
  { label: '1440p 60 FPS', width: 2560, height: 1440, frameRate: 60 },
];

const ScreenShareModal = ({ modalId }) => {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(1); // Default 1080p 30fps
  const [tab, setTab] = useState('screens'); // 'screens' | 'windows'
  const [loading, setLoading] = useState(false);

  const close = () => useModalStore.getState().close(modalId);

  const fetchSources = useCallback(async () => {
    if (!window.IgniteNative?.getDesktopSources) return;
    setLoading(true);
    try {
      const result = await window.IgniteNative.getDesktopSources();
      setSources(result);
    } catch (err) {
      console.error('Failed to get desktop sources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
    const interval = setInterval(fetchSources, 2000);
    return () => clearInterval(interval);
  }, [fetchSources]);

  const screens = sources.filter((s) => s.id.startsWith('screen:'));
  const windows = sources.filter((s) => s.id.startsWith('window:'));
  const displayedSources = tab === 'screens' ? screens : windows;

  const handleGoLive = async () => {
    if (!selectedSource) return;
    const quality = QUALITY_PRESETS[selectedQuality];
    await VoiceService.startScreenShare(selectedSource.id, quality);
    close();
  };

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-2xl !gap-0 !rounded-2xl !border-border !bg-background !p-0 overflow-hidden !shadow-2xl"
      >
        <DialogTitle className="sr-only">Share Your Screen</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-foreground">Share Your Screen</h2>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="text-lg">&times;</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          <button
            type="button"
            onClick={() => setTab('screens')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'screens'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="size-4" />
            Screens
          </button>
          <button
            type="button"
            onClick={() => setTab('windows')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'windows'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <AppWindow className="size-4" />
            Windows
          </button>
          <div className="ml-auto flex items-center">
            <button
              type="button"
              onClick={fetchSources}
              disabled={loading}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              title="Refresh sources"
            >
              <ArrowsClockwise className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sources grid */}
        <div className="max-h-[50vh] overflow-y-auto p-5">
          {loading && sources.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
            </div>
          ) : displayedSources.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No {tab === 'screens' ? 'screens' : 'windows'} available
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {displayedSources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedSource(source)}
                  className={`group flex flex-col overflow-hidden rounded-lg border-2 transition-all ${
                    selectedSource?.id === source.id
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-card hover:border-muted-foreground/30 hover:bg-accent'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    <img
                      src={source.thumbnailDataUrl}
                      alt={source.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-2">
                    {source.appIconDataUrl && (
                      <img
                        src={source.appIconDataUrl}
                        alt=""
                        className="size-4 shrink-0"
                        draggable={false}
                      />
                    )}
                    <span className="truncate text-xs text-foreground/85">{source.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quality & Go Live */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Stream Quality</label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(Number(e.target.value))}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {QUALITY_PRESETS.map((preset, i) => (
                <option key={preset.label} value={i}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGoLive}
            disabled={!selectedSource}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go Live
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScreenShareModal;
