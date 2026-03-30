import { useDiscordPreferencesStore } from '@/discord/store/discord-preferences.store';
import { useDiscordVoiceStore } from '@/discord/store/discord-voice.store';
import { DiscordVoiceService } from '@/discord/services/discord-voice.service';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const TabDiscord = () => {
  const showHiddenChannels = useDiscordPreferencesStore((s) => s.showHiddenChannels);
  const setShowHiddenChannels = useDiscordPreferencesStore((s) => s.setShowHiddenChannels);
  const chatFontSize = useDiscordPreferencesStore((s) => s.chatFontSize);
  const setChatFontSize = useDiscordPreferencesStore((s) => s.setChatFontSize);

  const inputSensitivity = useDiscordVoiceStore((s) => s.inputSensitivity);
  const echoCancellation = useDiscordVoiceStore((s) => s.echoCancellation);
  const noiseSuppression = useDiscordVoiceStore((s) => s.noiseSuppression);
  const autoGainControl = useDiscordVoiceStore((s) => s.autoGainControl);
  const connectionState = useDiscordVoiceStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  const handleSensitivityChange = (value) => {
    useDiscordVoiceStore.getState().setInputSensitivity(value[0]);
  };

  const handleToggle = (setter, current) => {
    setter(!current);
    if (isConnected) {
      DiscordVoiceService.reapplyAudioConstraints();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Discord</h2>
        <p className="mt-1 text-sm text-gray-400">Manage Discord integration settings.</p>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appearance</h3>

        <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
          <div>
            <p className="font-medium text-gray-200">Show Hidden Channels</p>
            <p className="text-sm text-gray-400">
              Display channels you don&apos;t have permission to view. You won&apos;t be able to read their messages.
            </p>
          </div>
          <Switch
            checked={showHiddenChannels}
            onCheckedChange={setShowHiddenChannels}
          />
        </div>

        <div className="rounded-lg bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-200">Chat Font Size</p>
              <p className="text-sm text-gray-400">
                Adjust the font size for Discord messages ({chatFontSize}px).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">12px</span>
              <input
                type="range"
                min={12}
                max={24}
                value={chatFontSize}
                onChange={(e) => setChatFontSize(Number(e.target.value))}
                className="w-32 accent-[#5865f2]"
              />
              <span className="text-xs text-gray-500">24px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Processing */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voice Processing</h3>

        {/* Input Sensitivity */}
        <div className="rounded-lg bg-white/5 p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-200">Input Sensitivity</p>
              <p className="text-sm text-gray-400">
                Set the volume threshold for voice activity detection.
              </p>
            </div>
            <span className="ml-4 shrink-0 font-mono text-sm text-gray-300">{inputSensitivity} dB</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-14 text-right text-xs text-gray-500">-100 dB</span>
            <Slider
              value={[inputSensitivity]}
              min={-100}
              max={0}
              step={1}
              onValueChange={handleSensitivityChange}
              className="flex-1"
            />
            <span className="w-10 text-xs text-gray-500">0 dB</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Lower value = more sensitive (triggers on quieter sounds). Higher value = less sensitive.
          </p>
        </div>

        {/* Audio processing toggles */}
        <div className="space-y-px overflow-hidden rounded-lg bg-white/5">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-200">Echo Cancellation</p>
              <p className="text-sm text-gray-400">Reduce echo from speakers being picked up by the microphone.</p>
            </div>
            <Switch
              checked={echoCancellation}
              onCheckedChange={() => handleToggle(useDiscordVoiceStore.getState().setEchoCancellation, echoCancellation)}
            />
          </div>
          <div className="mx-4 border-t border-white/5" />
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-200">Noise Suppression</p>
              <p className="text-sm text-gray-400">Filter out background noise from your microphone input.</p>
            </div>
            <Switch
              checked={noiseSuppression}
              onCheckedChange={() => handleToggle(useDiscordVoiceStore.getState().setNoiseSuppression, noiseSuppression)}
            />
          </div>
          <div className="mx-4 border-t border-white/5" />
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-200">Auto Gain Control</p>
              <p className="text-sm text-gray-400">Automatically adjust microphone volume for consistent levels.</p>
            </div>
            <Switch
              checked={autoGainControl}
              onCheckedChange={() => handleToggle(useDiscordVoiceStore.getState().setAutoGainControl, autoGainControl)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabDiscord;
