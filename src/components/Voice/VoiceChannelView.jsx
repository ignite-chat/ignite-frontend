import { useEffect, useRef, useMemo, useState } from 'react';
import { Track } from 'livekit-client';
import {
  MicrophoneSlash,
  SpeakerSlash,
  SpeakerHigh,
  Microphone,
  VideoCamera,
  VideoCameraSlash,
  Monitor,
  PhoneDisconnect,
  DotsThree,
} from '@phosphor-icons/react';
import { useVoiceStore } from '@/store/voice.store';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUsersStore } from '@/store/users.store';
import useStore from '@/hooks/useStore';
import { VoiceService } from '@/services/voice.service';
import ParticipantTile from './ParticipantTile';
import Avatar from '../Avatar';

const ScreenShareView = ({ participantIdentity }) => {
  const videoRef = useRef(null);
  const room = useVoiceStore((s) => s.room);

  useEffect(() => {
    if (!room || !videoRef.current) return;

    const lkParticipant =
      room.localParticipant.identity === participantIdentity
        ? room.localParticipant
        : room.remoteParticipants.get(participantIdentity);

    if (!lkParticipant) return;

    const screenPub = lkParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (screenPub?.track) {
      const el = screenPub.track.attach(videoRef.current);
      el.style.objectFit = 'contain';
      return () => {
        screenPub.track?.detach(videoRef.current);
      };
    }
  }, [room, participantIdentity]);

  return (
    <div className="relative flex-1 overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
    </div>
  );
};

const VoiceChannelView = ({ channel }) => {
  const { participants, connectionState, isMuted, isCameraOn, isScreenSharing } = useVoiceStore();
  const currentUser = useStore((s) => s.user);
  const usersStore = useUsersStore();

  const voiceStates = channel?.voice_states || [];

  const voiceStateUsers = useMemo(() => {
    return voiceStates.map((vs) => {
      const user =
        String(vs.user_id) === String(currentUser?.id)
          ? currentUser
          : usersStore.getUser(String(vs.user_id));
      return {
        userId: String(vs.user_id),
        name: user?.name || user?.username || String(vs.user_id),
        avatar: user?.avatar,
        selfMute: vs.self_mute,
        selfDeaf: vs.self_deaf,
      };
    });
  }, [voiceStates, currentUser, usersStore]);

  const screenSharer = useMemo(() => participants.find((p) => p.isScreenSharing), [participants]);
  const [isWatchingScreen, setIsWatchingScreen] = useState(false);

  // Not connected — show a join prompt with current voice state users
  if (connectionState === 'disconnected') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gray-700">
        <div className="flex size-24 items-center justify-center rounded-full bg-gray-600">
          <span className="text-4xl text-gray-400">🔊</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-100">{channel?.name}</h2>
        {voiceStateUsers.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-400">
              {voiceStateUsers.length} {voiceStateUsers.length === 1 ? 'person' : 'people'} in this
              channel
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {voiceStateUsers.map((u) => (
                <div
                  key={u.userId}
                  className="flex items-center gap-1.5 rounded-full bg-gray-600 px-3 py-1.5"
                >
                  <div className="flex size-5 items-center justify-center rounded-full">
                    <Avatar
                      user={{ avatar_url: u.avatar_url, name: u.name }}
                      className="size-5 bg-gray-500 text-[10px] font-semibold text-gray-200"
                    />
                  </div>
                  <span className="text-xs text-gray-300">{u.name}</span>
                  {u.selfDeaf && <SpeakerSlash className="size-3 text-gray-400" />}
                  {u.selfMute && !u.selfDeaf && (
                    <MicrophoneSlash className="size-3 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No one is in the voice channel yet.</p>
        )}
        <button
          type="button"
          onClick={() =>
            VoiceService.joinVoiceChannel(channel.channel_id, channel.guild_id, '', channel.name)
          }
          className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          Join Voice
        </button>
      </div>
    );
  }

  if (connectionState === 'connecting') {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-700">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-solid border-green-500 border-t-transparent"></div>
          <p className="text-sm text-gray-400">Connecting to voice...</p>
        </div>
      </div>
    );
  }

  // Connected — show participants
  return (
    <div className="group relative flex flex-1 flex-col overflow-hidden bg-black px-4 pt-14 pb-24">
      {screenSharer && isWatchingScreen ? (
        // Screenshare layout: main screenshare + participant strip
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300">{screenSharer.name} is sharing their screen</p>
            <button
              type="button"
              onClick={() => setIsWatchingScreen(false)}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              Stop Watching
            </button>
          </div>
          <div className="flex flex-1 gap-3 overflow-hidden">
            <ScreenShareView participantIdentity={screenSharer.identity} />
            <div className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto">
              {participants.map((p) => (
                <div key={p.identity} className="aspect-video">
                  <ParticipantTile participant={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Grid layout
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {screenSharer && (
            <div className="flex items-center justify-between rounded-md bg-gray-600 px-3 py-2">
              <p className="text-sm text-gray-300">{screenSharer.name} is sharing their screen</p>
              <button
                type="button"
                onClick={() => setIsWatchingScreen(true)}
                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                Watch Stream
              </button>
            </div>
          )}
          <div
            className={`grid flex-1 gap-3 ${
              participants.length === 1
                ? 'grid-cols-1'
                : participants.length <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            }`}
            style={{
              gridAutoRows: participants.length <= 2 ? '1fr' : 'minmax(0, 1fr)',
            }}
          >
            {participants.map((p) => (
              <ParticipantTile key={p.identity} participant={p} />
            ))}
          </div>
        </div>
      )}

      {/* Floating Channel Info - Top */}
      <div className="pointer-events-none absolute inset-x-0 top-4 flex -translate-y-2 px-4 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center gap-2 px-1">
          <SpeakerHigh className="size-4 shrink-0 text-gray-400" weight="fill" />
          <span className="text-sm font-medium text-gray-200">{channel?.name}</span>
        </div>
      </div>

      {/* Floating Voice Controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex translate-y-2 justify-center gap-4 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        {/* Group 1: Mic + Camera */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#1e1e22]/90 p-2 shadow-2xl backdrop-blur-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => VoiceService.toggleMute()}
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                {isMuted ? (
                  <MicrophoneSlash className="size-5" weight="fill" />
                ) : (
                  <Microphone className="size-5" weight="fill" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => VoiceService.toggleCamera()}
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                  isCameraOn
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                {isCameraOn ? (
                  <VideoCamera className="size-5" weight="fill" />
                ) : (
                  <VideoCameraSlash className="size-5" weight="fill" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Group 2: Screen Share + Options */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#1e1e22]/90 p-2 shadow-2xl backdrop-blur-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => VoiceService.toggleScreenShare()}
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                  isScreenSharing
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <Monitor className="size-5" weight="fill" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-xl text-gray-300 transition-colors hover:bg-white/10"
              >
                <DotsThree className="size-5" weight="bold" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">More options</TooltipContent>
          </Tooltip>
        </div>

        {/* Group 3: End Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => VoiceService.leaveVoiceChannel()}
              className="flex size-14 items-center justify-center rounded-2xl bg-red-500 text-white shadow-2xl transition-colors hover:bg-red-600"
            >
              <PhoneDisconnect className="size-5" weight="fill" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Leave Voice</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default VoiceChannelView;
