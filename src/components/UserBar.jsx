import { useState } from 'react';
import {
  Gear,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  PhoneDisconnect,
  WifiHigh,
  VideoCamera,
  VideoCameraSlash,
  Monitor,
  Waveform,
} from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth.store';
import { Dialog, DialogTrigger } from './ui/dialog';
import UserSettingsDialogContent from './UserSettingsDialogContent';
import { LogOut } from 'lucide-react';
import Avatar from './Avatar';
import { useVoiceStore } from '@/store/voice.store';
import { useUsersStore } from '@/store/users.store';
import { VoiceService } from '@/services/voice.service';
import VoiceSettingsDialog from './Voice/VoiceSettingsDialog';

const UserBar = () => {
  const { logout } = useAuthStore();
  const { channelName, connectionState, isMuted, isDeafened, isCameraOn, isScreenSharing } =
    useVoiceStore();
  const user = useUsersStore((state) => state.getCurrentUser());
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);

  const isConnected = connectionState !== 'disconnected';

  return (
    <div className="border-t border-white/5 bg-[#202024]">
      {/* Voice Channel Panel - Only show when connected */}
      {isConnected && (
        <div className="border-b border-white/5 bg-[#1a1a1d] px-2 py-2">
          <div className="mb-2 flex items-center gap-2">
            <WifiHigh className="size-4 shrink-0 text-green-500" weight="bold" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-green-500">
                {connectionState === 'connecting' ? 'Connecting...' : 'Voice Connected'}
              </p>
              <p className="truncate text-[11px] text-gray-400">{channelName}</p>
            </div>
          </div>

          {/* Voice Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => VoiceService.toggleCamera()}
              className={`flex flex-1 items-center justify-center gap-2 rounded py-2 px-3 text-sm font-medium transition-colors ${
                isCameraOn
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-[#2a2a2d] text-gray-300 hover:bg-[#35353a]'
              }`}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraOn ? (
                <VideoCamera className="size-5" weight="fill" />
              ) : (
                <VideoCameraSlash className="size-5" weight="fill" />
              )}
              <span>{isCameraOn ? 'Camera' : 'Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => VoiceService.toggleScreenShare()}
              className={`flex flex-1 items-center justify-center gap-2 rounded py-2 px-3 text-sm font-medium transition-colors ${
                isScreenSharing
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-[#2a2a2d] text-gray-300 hover:bg-[#35353a]'
              }`}
              title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            >
              <Monitor className="size-5" weight="fill" />
              <span>Screen</span>
            </button>

            <button
              type="button"
              onClick={() => setVoiceSettingsOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded bg-[#2a2a2d] text-gray-300 transition-colors hover:bg-[#35353a] hover:text-gray-100"
              title="Voice Settings"
            >
              <Waveform className="size-5" weight="bold" />
            </button>

            <button
              type="button"
              onClick={() => VoiceService.leaveVoiceChannel()}
              className="flex size-9 shrink-0 items-center justify-center rounded bg-[#2a2a2d] text-gray-300 transition-colors hover:bg-red-500/20 hover:text-red-400"
              title="Disconnect"
            >
              <PhoneDisconnect className="size-5" weight="fill" />
            </button>
          </div>

          <VoiceSettingsDialog open={voiceSettingsOpen} onOpenChange={setVoiceSettingsOpen} />
        </div>
      )}

      {/* User Info Bar */}
      <div className="flex items-center px-2.5 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative shrink-0">
            <Avatar user={user} className="size-9" />
            {user?.status !== 'offline' && (
              <div className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#202024]">
                <div className="size-3 rounded-full bg-green-600"></div>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base font-semibold leading-tight text-gray-100">
              {user?.name}
            </span>
            <span className="truncate text-xs text-gray-500">
              {user?.status || 'Online'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => VoiceService.toggleMute()}
            className={`flex size-9 items-center justify-center rounded transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'hover:bg-white/5'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicrophoneSlash className="size-5 text-red-400" weight="fill" />
            ) : (
              <Microphone className="size-5 text-gray-400 hover:text-gray-200" weight="fill" />
            )}
          </button>

          <button
            type="button"
            onClick={() => VoiceService.toggleDeafen()}
            className={`flex size-9 items-center justify-center rounded transition-colors ${
              isDeafened
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'hover:bg-white/5'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? (
              <SpeakerSlash className="size-5 text-red-400" weight="fill" />
            ) : (
              <SpeakerHigh className="size-5 text-gray-400 hover:text-gray-200" weight="fill" />
            )}
          </button>

          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded hover:bg-white/5"
                title="User Settings"
              >
                <Gear className="size-5 text-gray-400 hover:text-gray-200" weight="fill" />
              </button>
            </DialogTrigger>
            <UserSettingsDialogContent />
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default UserBar;
