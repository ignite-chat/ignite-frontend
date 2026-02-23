import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Field, FieldGroup, FieldLabel } from '../../ui/field';
import { Mic } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { VoiceService } from '../../../services/voice.service';
import { Room } from 'livekit-client';
import { useVoiceStore } from '../../../store/voice.store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Separator } from '../../ui/separator';
import MicTestBars from '../../Voice/MicTestBars';

const TabVoiceAudio = () => {
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const audioInputDeviceId = useVoiceStore((s) => s.audioInputDeviceId);
  const audioOutputDeviceId = useVoiceStore((s) => s.audioOutputDeviceId);
  const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
  const room = useVoiceStore((s) => s.room);
  const [isTesting, setIsTesting] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const inputs = await Room.getLocalDevices('audioinput', true);
      const outputs = await Room.getLocalDevices('audiooutput', true);
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Stop mic test on unmount
  useEffect(() => () => setIsTesting(false), []);

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
    <div className="max-w-[740px] space-y-6">
      <div>
        <h3 className="text-base font-semibold">Voice Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your audio input and output devices
        </p>
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Input Device</FieldLabel>
            <Select value={audioInputDeviceId || 'default'} onValueChange={handleInputChange}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Output Device</FieldLabel>
            <Select value={audioOutputDeviceId || 'default'} onValueChange={handleOutputChange}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {outputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker (${device.deviceId.slice(0, 8)}...)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>

      {/* Noise Suppression */}
      {/* TODO: Krisp requires LiveKit Cloud — noise suppression won't work on self-hosted LiveKit servers */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Noise Suppression</p>
              <p className="text-xs text-muted-foreground">
                Powered by Krisp — make some noise while speaking and your friends will only hear your voice.
              </p>
            </div>
          </div>
          <Switch checked={noiseSuppression} onCheckedChange={handleNoiseToggle} />
        </div>

        {/* Mic Test */}
        <Separator />
        <div>
          <p className="mb-2 text-sm font-semibold">Mic Test</p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTesting((prev) => !prev)}
            >
              {isTesting ? 'Stop' : 'Test'}
            </Button>
            {isTesting && <MicTestBars deviceId={audioInputDeviceId} outputDeviceId={audioOutputDeviceId} />}
          </div>
        </div>

        {/* Krisp branding */}
        <Separator />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <span className="text-sm font-bold">krisp</span>
          <a
            href="https://krisp.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
};

export default TabVoiceAudio;
