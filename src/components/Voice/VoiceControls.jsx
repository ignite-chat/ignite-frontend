import {
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  PhoneDisconnect,
  WifiHigh,
  VideoCamera,
  VideoCameraSlash,
  Monitor,
  GearSix,
} from '@phosphor-icons/react';
import { useVoiceStore } from '@/store/voice.store';
import { VoiceService } from '@/services/voice.service';
import { useModalStore } from '@/store/modal.store';
import ScreenSharePicker from './ScreenSharePicker';
import VoiceSettingsDialog from './VoiceSettingsDialog';

const VoiceControls = () => {
  const { channelName, connectionState, isMuted, isDeafened, isCameraOn, isScreenSharing } =
    useVoiceStore();

  if (connectionState === 'disconnected') return null;

  return (
    <div className="border-t border-white/5 bg-gray-800 px-2 py-3">
      {/* Connection info */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <WifiHigh className="size-4 shrink-0 text-green-500" weight="bold" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-green-500">
            {connectionState === 'connecting' ? 'Connecting...' : 'Voice Connected'}
          </p>
          <p className="truncate text-[11px] text-gray-400">{channelName}</p>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => VoiceService.toggleMute()}
          className={`flex size-8 items-center justify-center rounded-md transition-colors ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicrophoneSlash className="size-5" /> : <Microphone className="size-5" />}
        </button>

        <button
          type="button"
          onClick={() => VoiceService.toggleDeafen()}
          className={`flex size-8 items-center justify-center rounded-md transition-colors ${
            isDeafened
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <SpeakerSlash className="size-5" /> : <SpeakerHigh className="size-5" />}
        </button>

        <button
          type="button"
          onClick={() => VoiceService.toggleCamera()}
          className={`flex size-8 items-center justify-center rounded-md transition-colors ${
            isCameraOn
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCameraOn ? (
            <VideoCamera className="size-5" />
          ) : (
            <VideoCameraSlash className="size-5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => VoiceService.toggleScreenShare()}
          className={`flex size-8 items-center justify-center rounded-md transition-colors ${
            isScreenSharing
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          <Monitor className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => useModalStore.getState().push(VoiceSettingsDialog)}
          className="flex size-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
          title="Voice Settings"
        >
          <GearSix className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => VoiceService.leaveVoiceChannel()}
          className="flex size-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
          title="Disconnect"
        >
          <PhoneDisconnect className="size-5" />
        </button>
      </div>

      <ScreenSharePicker />
    </div>
  );
};

export default VoiceControls;
