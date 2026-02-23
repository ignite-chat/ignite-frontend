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
  ArrowLeft,
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

const ScreenShareTile = ({ voiceState, isWatching, onWatch }) => {
  const videoRef = useRef(null);
  const room = useVoiceStore((s) => s.room);
  const [trackInfo, setTrackInfo] = useState(null);

  const isLocal = room?.localParticipant?.identity === voiceState.user_id;

  useEffect(() => {
    if (!room || !videoRef.current) return;

    // Show preview when it's our own stream OR when we're watching a remote stream
    const shouldAttach = isLocal || isWatching;
    if (!shouldAttach) return;

    const lkParticipant = isLocal
      ? room.localParticipant
      : room.remoteParticipants.get(voiceState.user_id);

    if (!lkParticipant) return;

    const screenPub = lkParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (!screenPub?.track) return;

    const videoEl = videoRef.current;
    screenPub.track.attach(videoEl);

    const settings = screenPub.track.mediaStreamTrack?.getSettings();
    if (settings?.height) {
      setTrackInfo({ height: settings.height, fps: Math.round(settings.frameRate ?? 0) });
    }

    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      screenPub.track?.detach(videoEl);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLocal, isWatching, room, voiceState.user_id]);

  const currentUser = useStore((s) => s.user);
  const user =
    String(voiceState.user_id) === String(currentUser?.id)
      ? currentUser
      : useUsersStore.getState().getUser(String(voiceState.user_id));
  const name = user?.name || user?.username || String(voiceState.user_id);

  const resLabel = trackInfo ? `${trackInfo.height}P ${trackInfo.fps}FPS` : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onWatch}
      onKeyDown={(e) => e.key === 'Enter' && onWatch()}
      className="group/tile relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#1e1f22]"
    >
      {(isLocal || isWatching) && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 size-full object-contain"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#101113] to-transparent" />

      {/* Hover overlay */}
      {!isWatching && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover/tile:opacity-100">
          <span className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            {isWatching ? 'View Stream' : 'Watch Stream'}
          </span>
        </div>
      )}

      {/* Top-right badges */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        {resLabel && (
          <span className="rounded-full bg-gray-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {resLabel}
          </span>
        )}
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          LIVE
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-black/60 to-transparent p-4">
        <span className="inline-flex h-8 items-center gap-2 truncate rounded-sm bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
          <Monitor className="size-4 text-green-400" weight="fill" />
          {name}
        </span>
      </div>
    </div>
  );
};

const VoiceChannelView = ({ channel }) => {
  const { voiceStates: allVoiceStates, connectionState, isMuted, isCameraOn, isScreenSharing } = useVoiceStore();
  const currentUser = useStore((s) => s.user);
  const usersStore = useUsersStore();

  const channelId = channel?.channel_id;
  const channelVoiceStates = useMemo(
    () => allVoiceStates.filter((vs) => String(vs.channel_id) === String(channelId)),
    [allVoiceStates, channelId]
  );

  const watchingScreens = useVoiceStore((s) => s.watchingScreens);
  const addWatchingScreen = useVoiceStore((s) => s.addWatchingScreen);
  const removeWatchingScreen = useVoiceStore((s) => s.removeWatchingScreen);
  const screenSharers = useMemo(() => channelVoiceStates.filter((vs) => vs.self_stream), [channelVoiceStates]);
  const [focusedScreen, setFocusedScreen] = useState(null);

  const focusedSharer = useMemo(
    () => (focusedScreen ? screenSharers.find((vs) => vs.user_id === focusedScreen) : null),
    [focusedScreen, screenSharers]
  );

  // Clear focused screen if that participant stops sharing
  useEffect(() => {
    if (focusedScreen && !screenSharers.some((vs) => vs.user_id === focusedScreen)) {
      setFocusedScreen(null);
    }
  }, [focusedScreen, screenSharers]);

  const stopWatching = () => {
    if (focusedScreen) {
      removeWatchingScreen(focusedScreen);
    }
    setFocusedScreen(null);
  };

  const totalTiles = channelVoiceStates.length + screenSharers.length;

  // Not connected — show a join prompt with current voice state users
  if (connectionState === 'disconnected') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black">
        <h2 className="text-xl font-semibold text-gray-100">{channel?.name}</h2>
        {channelVoiceStates.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-400">
              {channelVoiceStates.length} {channelVoiceStates.length === 1 ? 'person' : 'people'} in this
              channel
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {channelVoiceStates.map((vs) => {
                const user =
                  String(vs.user_id) === String(currentUser?.id)
                    ? currentUser
                    : usersStore.getUser(String(vs.user_id));
                const name = user?.name || user?.username || String(vs.user_id);
                return (
                  <div
                    key={vs.user_id}
                    className="flex items-center gap-1.5 rounded-full bg-gray-600 px-3 py-1.5"
                  >
                    <div className="flex size-5 items-center justify-center rounded-full">
                      <Avatar
                        user={user || { name }}
                        className="size-5 bg-gray-500 text-[10px] font-semibold text-gray-200"
                      />
                    </div>
                    <span className="text-xs text-gray-300">{name}</span>
                    {vs.self_deaf && <SpeakerSlash className="size-3 text-gray-400" />}
                    {vs.self_mute && !vs.self_deaf && (
                      <MicrophoneSlash className="size-3 text-gray-400" />
                    )}
                  </div>
                );
              })}
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
          className="rounded-md bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200"
        >
          Join Voice
        </button>
      </div>
    );
  }

  if (connectionState === 'connecting') {
    return (
      <div className="flex flex-1 items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-solid border-green-500 border-t-transparent"></div>
          <p className="text-sm text-gray-400">Connecting to voice...</p>
        </div>
      </div>
    );
  }

  // Connected — show participants
  return (
    <div className="group relative flex flex-1 flex-col overflow-hidden bg-black px-4 pb-24 pt-14">
      {focusedSharer ? (
        // Screenshare layout: main screenshare + participant strip
        <div className="flex flex-1 gap-3 overflow-hidden">
          <div
            className="group/stream relative flex flex-1 cursor-pointer"
            onClick={() => setFocusedScreen(null)}
          >
            <ScreenShareView participantIdentity={focusedSharer.user_id} />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-xl pb-4 opacity-0 transition-opacity duration-150 group-hover/stream:opacity-100">
              <span className="rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                Click to go back
              </span>
            </div>
          </div>
          <div className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto">
            {channelVoiceStates.map((vs) => (
              <div key={vs.user_id} className="aspect-video">
                <ParticipantTile voiceState={vs} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Grid layout
        <div
          className={`grid flex-1 gap-3 ${totalTiles === 1 ? 'grid-cols-1' : totalTiles <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          style={{
            gridAutoRows: totalTiles <= 2 ? '1fr' : 'minmax(0, 1fr)',
          }}
        >
          {screenSharers.map((vs) => (
            <ScreenShareTile
              key={`${vs.user_id}-screen`}
              voiceState={vs}
              isWatching={watchingScreens.includes(vs.user_id)}
              onWatch={() => {
                if (watchingScreens.includes(vs.user_id)) {
                  setFocusedScreen(vs.user_id);
                } else {
                  addWatchingScreen(vs.user_id);
                }
              }}
            />
          ))}
          {channelVoiceStates.map((vs) => (
            <ParticipantTile key={vs.user_id} voiceState={vs} />
          ))}
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
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${isMuted
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
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${isCameraOn
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
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${isScreenSharing
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

        {/* Group 3: Stop Watching / Leave Voice */}
        {focusedScreen && !isScreenSharing ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={stopWatching}
                className="flex size-14 items-center justify-center rounded-2xl bg-red-500 text-white shadow-2xl transition-colors hover:bg-red-600"
              >
                <ArrowLeft className="size-5" weight="bold" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Stop Watching</TooltipContent>
          </Tooltip>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default VoiceChannelView;
