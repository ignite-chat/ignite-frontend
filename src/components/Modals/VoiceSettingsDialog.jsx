import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic } from 'lucide-react';
import { Room } from 'livekit-client';
import { useVoiceStore } from '@/store/voice.store';
import { VoiceService } from '@/services/voice.service';
import { useModalStore } from '@/store/modal.store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MicTestBars from '@/components/Voice/MicTestBars';

// ─── Voice Settings Dialog ───────────────────────────────────────────────────

/** Filter out the browser's "default" pseudo-device to avoid duplicate entries with our own "Default" option. */
function filterDefaultDevice(devices) {
  return devices.filter((d) => d.deviceId !== 'default');
}

const VoiceSettingsDialog = ({ modalId }) => {
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const audioInputDeviceId = useVoiceStore((s) => s.audioInputDeviceId);
  const audioOutputDeviceId = useVoiceStore((s) => s.audioOutputDeviceId);
  const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
  const room = useVoiceStore((s) => s.room);
  const [isTesting, setIsTesting] = useState(false);
  const micCleanupRef = useRef(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const inputs = await Room.getLocalDevices('audioinput', true);
        const outputs = await Room.getLocalDevices('audiooutput', true);
        setInputDevices(filterDefaultDevice(inputs));
        setOutputDevices(filterDefaultDevice(outputs));
      } catch (err) {
        console.warn('Failed to enumerate audio devices:', err);
      }
    };
    loadDevices();

    return () => {
      // Immediately stop the mic stream when the dialog unmounts
      micCleanupRef.current?.();
      micCleanupRef.current = null;
    };
  }, []);

  const handleInputChange = useCallback(
    async (deviceId) => {
      const id = deviceId === 'default' ? null : deviceId;
      useVoiceStore.getState().setAudioInputDeviceId(id);
      if (room) {
        try {
          await room.switchActiveDevice('audioinput', deviceId);
        } catch (err) {
          console.warn('Failed to switch audio input device:', err);
        }
      }
    },
    [room]
  );

  const handleOutputChange = useCallback(
    async (deviceId) => {
      const id = deviceId === 'default' ? null : deviceId;
      useVoiceStore.getState().setAudioOutputDeviceId(id);
      if (room) {
        try {
          await room.switchActiveDevice('audiooutput', deviceId);
        } catch (err) {
          console.warn('Failed to switch audio output device:', err);
        }
      }
    },
    [room]
  );

  const handleNoiseToggle = useCallback(async () => {
    if (room) {
      await VoiceService.toggleNoiseSuppression();
    } else {
      useVoiceStore.getState().setNoiseSuppression(!noiseSuppression);
    }
  }, [room, noiseSuppression]);

  return (
    <Dialog open onOpenChange={() => useModalStore.getState().close(modalId)}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[480px] !gap-0 !rounded-2xl !border-[#1e1f22] !bg-[#313338] !p-0 overflow-hidden !shadow-2xl"
      >
        <DialogTitle className="sr-only">Voice Settings</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[#1e1f22]/60 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-[#f2f3f5]">Voice Settings</h2>
          <button
            onClick={() => useModalStore.getState().close(modalId)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#b5bac1] transition-colors hover:bg-[#3b3d44] hover:text-[#dbdee1]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Content ── */}
        <div className="space-y-3 p-4">

          {/* ─ Device Selectors Card ─ */}
          <div className="space-y-3 rounded-lg bg-[#2b2d31] p-3.5">
            {/* Input Device */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
                Input Device
              </label>
              <Select value={audioInputDeviceId || 'default'} onValueChange={handleInputChange}>
                <SelectTrigger className="!h-10 !rounded-md !border-0 !bg-[#1e1f22] !px-3 !text-sm !text-[#dbdee1] !shadow-none !ring-0 focus:!ring-1 focus:!ring-[#5865f2]/50">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent className="!rounded-lg !border-[#1e1f22] !bg-[#2b2d31] !shadow-xl">
                  <SelectItem value="default" className="!rounded-md !text-sm !text-[#dbdee1] focus:!bg-[#404249] focus:!text-[#f2f3f5]">Default</SelectItem>
                  {inputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId} className="!rounded-md !text-sm !text-[#dbdee1] focus:!bg-[#404249] focus:!text-[#f2f3f5]">
                      {device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Output Device */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
                Output Device
              </label>
              <Select value={audioOutputDeviceId || 'default'} onValueChange={handleOutputChange}>
                <SelectTrigger className="!h-10 !rounded-md !border-0 !bg-[#1e1f22] !px-3 !text-sm !text-[#dbdee1] !shadow-none !ring-0 focus:!ring-1 focus:!ring-[#5865f2]/50">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent className="!rounded-lg !border-[#1e1f22] !bg-[#2b2d31] !shadow-xl">
                  <SelectItem value="default" className="!rounded-md !text-sm !text-[#dbdee1] focus:!bg-[#404249] focus:!text-[#f2f3f5]">Default</SelectItem>
                  {outputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId} className="!rounded-md !text-sm !text-[#dbdee1] focus:!bg-[#404249] focus:!text-[#f2f3f5]">
                      {device.label || `Speaker (${device.deviceId.slice(0, 8)}...)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ─ Noise Suppression Card ─ */}
          {/* TODO: Krisp requires LiveKit Cloud — noise suppression won't work on self-hosted LiveKit servers */}
          <div className="flex items-center justify-between rounded-lg bg-[#2b2d31] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865f2]/15">
                <Mic className="h-[18px] w-[18px] text-[#5865f2]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#f2f3f5]">Noise Suppression</p>
                <p className="text-xs text-[#949ba4]">
                  Powered by <span className="font-semibold text-[#b5bac1]">Krisp</span>
                </p>
              </div>
            </div>
            {/* Discord-style toggle — larger, green when checked */}
            <button
              role="switch"
              aria-checked={noiseSuppression}
              onClick={handleNoiseToggle}
              className={`relative inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                noiseSuppression ? 'bg-[#23a55a]' : 'bg-[#80848e]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  noiseSuppression ? 'translate-x-[21px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </div>

          {/* ─ Mic Test Card ─ */}
          <div className="rounded-lg bg-[#2b2d31] p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">Mic Test</span>
            </div>

            {isTesting && (
              <div className="mb-3 flex h-10 items-end rounded-md bg-[#1e1f22] px-3">
                <MicTestBars deviceId={audioInputDeviceId} outputDeviceId={audioOutputDeviceId} onCleanupReady={(fn) => { micCleanupRef.current = fn; }} />
              </div>
            )}

            {/* Test button */}
            <button
              type="button"
              onClick={() => setIsTesting((prev) => !prev)}
              className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isTesting
                  ? 'bg-[#da373c]/15 text-[#da373c] hover:bg-[#da373c]/25'
                  : 'bg-[#23a55a]/15 text-[#23a55a] hover:bg-[#23a55a]/25'
              }`}
            >
              {isTesting ? 'Stop Testing' : "Let's Check"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceSettingsDialog;
