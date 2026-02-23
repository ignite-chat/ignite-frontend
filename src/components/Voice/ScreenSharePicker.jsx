import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, AppWindow, X, ArrowsClockwise } from '@phosphor-icons/react';
import { useVoiceStore } from '@/store/voice.store';
import { VoiceService } from '@/services/voice.service';

const QUALITY_PRESETS = [
  { label: '720p 30 FPS', width: 1280, height: 720, frameRate: 30 },
  { label: '1080p 30 FPS', width: 1920, height: 1080, frameRate: 30 },
  { label: '1080p 60 FPS', width: 1920, height: 1080, frameRate: 60 },
  { label: '1440p 30 FPS', width: 2560, height: 1440, frameRate: 30 },
  { label: '1440p 60 FPS', width: 2560, height: 1440, frameRate: 60 },
];

const ScreenSharePicker = () => {
  const isOpen = useVoiceStore((s) => s.isScreenSharePickerOpen);
  const setOpen = useVoiceStore((s) => s.setScreenSharePickerOpen);

  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(1); // Default 1080p 30fps
  const [tab, setTab] = useState('screens'); // 'screens' | 'windows'
  const [loading, setLoading] = useState(false);

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
    if (isOpen) {
      fetchSources();
      setSelectedSource(null);

      const interval = setInterval(fetchSources, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchSources]);

  const screens = sources.filter((s) => s.id.startsWith('screen:'));
  const windows = sources.filter((s) => s.id.startsWith('window:'));
  const displayedSources = tab === 'screens' ? screens : windows;

  const handleGoLive = async () => {
    if (!selectedSource) return;
    const quality = QUALITY_PRESETS[selectedQuality];
    await VoiceService.startScreenShare(selectedSource.id, quality);
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSource(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-100">Share Your Screen</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-5">
          <button
            type="button"
            onClick={() => setTab('screens')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'screens'
                ? 'border-indigo-500 text-gray-100'
                : 'border-transparent text-gray-400 hover:text-gray-200'
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
                ? 'border-indigo-500 text-gray-100'
                : 'border-transparent text-gray-400 hover:text-gray-200'
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
              className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50"
              title="Refresh sources"
            >
              <ArrowsClockwise className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sources grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && sources.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-t-transparent" />
            </div>
          ) : displayedSources.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
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
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-transparent bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
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
                    <span className="truncate text-xs text-gray-300">{source.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quality & Go Live */}
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-300">Stream Quality</label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(Number(e.target.value))}
              className="rounded-md border border-white/10 bg-gray-700 px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
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
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go Live
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScreenSharePicker;
