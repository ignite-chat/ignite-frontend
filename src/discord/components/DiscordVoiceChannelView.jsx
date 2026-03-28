import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  SpeakerHigh,
  MicrophoneSlash,
  SpeakerSlash,
  VideoCamera,
  Monitor,
  Plugs,
  SignOut,
  DotsThree,
} from '@phosphor-icons/react';
import { useDiscordVoiceStatesStore } from '../store/discord-voice-states.store';
import { useDiscordVoiceStore } from '../store/discord-voice.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordStore } from '../store/discord.store';
import { DiscordService } from '../services/discord.service';
import { DiscordVoiceService } from '../services/discord-voice.service';
import { DiscordStreamService } from '../services/discord-stream.service';
import { useModalStore } from '@/store/modal.store';
import { useContextMenuStore } from '@/store/context-menu.store';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import DiscordUserContextMenu from './context-menus/DiscordUserContextMenu';

const FocusedStreamView = ({ streamMedia, membersVisible, onToggleMembers, onGoBack }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !streamMedia) return;
    videoRef.current.srcObject = streamMedia;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [streamMedia]);

  return (
    <div className="group/stream relative h-full w-full cursor-pointer overflow-hidden rounded-xl bg-black" onClick={onGoBack}>
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center gap-3 pb-4 opacity-0 transition-opacity duration-150 group-hover/stream:pointer-events-auto group-hover/stream:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleMembers(); }}
          className="rounded-lg bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
        >
          {membersVisible ? 'Hide Members' : 'Show Members'}
        </button>
      </div>
    </div>
  );
};

const FocusedParticipant = ({ vs, guildId }) => {
  const videoRef = useRef(null);
  const user = useDiscordUsersStore((s) => s.users[vs.user_id]);
  const member = useDiscordMembersStore((s) =>
    guildId ? s.members[guildId]?.[vs.user_id] : undefined,
  );
  const isMuted = vs.self_mute || vs.mute || vs.self_deaf || vs.deaf || vs.suppress;
  const isSpeaking = useDiscordVoiceStore((s) => s.speakingUsers.has(vs.user_id)) && !isMuted;
  const videoStream = useDiscordVoiceStore((s) => s.remoteVideoStreams.get(vs.user_id));
  const vsMember = vs.member;
  const vsUser = vsMember?.user;
  const displayName =
    member?.nick || vsMember?.nick || user?.global_name || vsUser?.global_name ||
    user?.username || vsUser?.username || `User ${vs.user_id}`;
  const avatarUrl = DiscordService.getUserAvatarUrl(
    vs.user_id,
    user?.avatar || vsUser?.avatar || vsMember?.avatar || null,
    256,
  );

  useEffect(() => {
    if (!videoRef.current || !videoStream) return;
    videoRef.current.srcObject = videoStream;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [videoStream]);

  return (
    <>
      {videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <img
            src={avatarUrl}
            alt={displayName}
            className={`size-32 rounded-full object-cover ${isSpeaking ? 'ring-4 ring-green-500' : ''}`}
          />
          <span className="text-lg font-medium text-white">{displayName}</span>
        </div>
      )}
      {/* Bottom overlay with name and status */}
      <div className="absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-black/60 to-transparent p-4">
        <span className="inline-flex h-8 items-center gap-2 truncate rounded-sm bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
          {vs.self_mute && !vs.mute && <MicrophoneSlash size={16} className="text-gray-400" />}
          {vs.mute && <MicrophoneSlash size={16} className="text-red-400" />}
          {vs.self_deaf && !vs.deaf && <SpeakerSlash size={16} className="text-gray-400" />}
          {vs.deaf && <SpeakerSlash size={16} className="text-red-400" />}
          <span>{displayName}</span>
        </span>
      </div>
    </>
  );
};

const DiscordVoiceChannelView = ({ channel }) => {
  const guildId = channel.guild_id;
  const channelId = channel.id;

  const guildVoiceStates = useDiscordVoiceStatesStore((s) => s.voiceStates[guildId] || {});
  const voiceStates = useMemo(
    () => Object.values(guildVoiceStates).filter((vs) => vs.channel_id === channelId),
    [guildVoiceStates, channelId],
  );

  const connectionState = useDiscordVoiceStore((s) => s.connectionState);
  const connectedChannelId = useDiscordVoiceStore((s) => s.channelId);
  const isConnected = connectedChannelId === channelId;
  const watchingStreamKey = useDiscordVoiceStore((s) => s.watchingStreamKey);
  const streamConnectionState = useDiscordVoiceStore((s) => s.streamConnectionState);
  const watchingStreamMedia = useDiscordVoiceStore((s) => s.watchingStreamMedia);

  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const guild = useMemo(() => guilds.find((g) => g.id === guildId), [guilds, guildId]);
  const guildName = guild?.properties?.name || guild?.name || '';

  const screenSharers = useMemo(() => voiceStates.filter((vs) => vs.self_stream), [voiceStates]);
  const [focusedStreamUserId, setFocusedStreamUserId] = useState(null);
  const [focusedUserId, setFocusedUserId] = useState(null);
  const [membersVisible, setMembersVisible] = useState(true);

  // Auto-clear if the focused participant stops streaming
  const focusedStream =
    focusedStreamUserId && screenSharers.some((vs) => vs.user_id === focusedStreamUserId)
      ? focusedStreamUserId
      : null;

  // Auto-clear if the focused user leaves the channel
  const focusedUser =
    focusedUserId && voiceStates.some((vs) => vs.user_id === focusedUserId)
      ? focusedUserId
      : null;

  const handleWatchStream = useCallback(
    (userId) => {
      // Start watching the stream
      DiscordStreamService.watchStream(guildId, channelId, userId);
      setFocusedStreamUserId(userId);
    },
    [guildId, channelId],
  );

  const handleUnfocus = useCallback(() => {
    setFocusedStreamUserId(null);
  }, []);

  const handleStopWatching = useCallback(() => {
    DiscordStreamService.stopWatching();
    setFocusedStreamUserId(null);
  }, []);

  const handleJoin = useCallback(() => {
    DiscordVoiceService.joinVoiceChannel(guildId, channelId, channel.name, guildName);
  }, [guildId, channelId, channel.name, guildName]);

  const handleDisconnect = useCallback(() => {
    DiscordVoiceService.leaveVoiceChannel();
  }, []);

  const totalTiles = voiceStates.length + screenSharers.length;

  // No participants at all — show empty state
  if (voiceStates.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#111214]">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-white/10">
          <SpeakerHigh className="size-10 text-white" weight="fill" />
        </div>
        <h2 className="text-xl font-semibold text-gray-100">{channel.name}</h2>
        <p className="mt-1 text-sm text-gray-500">No one is in the voice channel yet.</p>
        {!isConnected && (
          <button
            type="button"
            onClick={handleJoin}
            className="mt-4 flex items-center gap-2 rounded-md bg-[#248046] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#1a6334]"
          >
            <Plugs size={18} />
            Join Voice
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex flex-1 flex-col overflow-hidden bg-[#111214] p-4 pb-20">
      {/* Join Voice overlay when not connected */}
      {!isConnected && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-white/10">
            <SpeakerHigh className="size-10 text-white" weight="fill" />
          </div>
          <h2 className="text-xl font-semibold text-gray-100">{channel.name}</h2>
          <p className="mt-1 text-sm text-gray-400">
            {voiceStates.length} participant{voiceStates.length !== 1 ? 's' : ''} in voice
          </p>
          <button
            type="button"
            onClick={handleJoin}
            className="mt-4 flex items-center gap-2 rounded-md bg-[#248046] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#1a6334]"
          >
            <Plugs size={18} />
            Join Voice
          </button>
        </div>
      )}

      {/* Connecting overlay */}
      {isConnected && connectionState === 'connecting' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 animate-spin rounded-full border-4 border-solid border-green-500 border-t-transparent" />
            <p className="text-sm text-gray-400">Connecting to voice...</p>
          </div>
        </div>
      )}
      {focusedStream ? (
        /* Focused stream layout: main stream on top + participant strip at bottom */
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="min-h-0 flex-1">
            {watchingStreamMedia ? (
              <FocusedStreamView
                streamMedia={watchingStreamMedia}
                membersVisible={membersVisible}
                onToggleMembers={() => setMembersVisible((v) => !v)}
                onGoBack={handleUnfocus}
              />
            ) : (
              <div className="flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-black" onClick={handleUnfocus}>
                <div className="flex flex-col items-center gap-3">
                  <div className="size-10 animate-spin rounded-full border-4 border-solid border-white/20 border-t-white" />
                  <p className="text-sm text-gray-400">Connecting to stream...</p>
                </div>
              </div>
            )}
          </div>
          {membersVisible && (
            <div className="flex h-36 shrink-0 gap-2 overflow-x-auto overflow-y-hidden">
              {voiceStates.map((vs) => (
                <div key={vs.user_id} className="aspect-video h-full shrink-0 rounded-xl">
                  <VoiceParticipantTile
                    vs={vs}
                    guildId={guildId}
                    onWatchStream={vs.self_stream ? () => handleWatchStream(vs.user_id) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : focusedUser ? (
        /* Focused user layout: enlarged tile on top + participant strip at bottom */
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="group/focused relative min-h-0 flex-1 cursor-pointer overflow-hidden rounded-xl bg-[#1a1a1e]" onClick={() => setFocusedUserId(null)}>
            {(() => {
              const vs = voiceStates.find((v) => v.user_id === focusedUser);
              if (!vs) return null;
              return <FocusedParticipant vs={vs} guildId={guildId} />;
            })()}
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4 opacity-0 transition-opacity duration-150 group-hover/focused:opacity-100">
              <span className="rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                Click to go back
              </span>
            </div>
          </div>
          {membersVisible && (
            <div className="flex h-36 shrink-0 gap-2 overflow-x-auto overflow-y-hidden">
              {voiceStates.map((vs) => (
                <div key={vs.user_id} className="aspect-video h-full shrink-0 rounded-xl">
                  <VoiceParticipantTile
                    vs={vs}
                    guildId={guildId}
                    onFocus={() => setFocusedUserId(vs.user_id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grid layout */
        <div
          className={`grid flex-1 gap-3 ${totalTiles > 9 ? 'overflow-y-auto' : ''} ${totalTiles === 1
            ? 'grid-cols-1'
            : totalTiles <= 4
              ? 'grid-cols-2'
              : totalTiles <= 9
                ? 'grid-cols-3'
                : 'grid-cols-4'
            }`}
          style={{ gridAutoRows: totalTiles <= 9 ? '1fr' : 'minmax(180px, auto)' }}
        >
          {/* Stream tiles for screen sharers */}
          {screenSharers.map((vs) => (
            <StreamTile
              key={`${vs.user_id}-stream`}
              vs={vs}
              guildId={guildId}
              channelId={channelId}
              isWatching={watchingStreamKey === `guild:${guildId}:${channelId}:${vs.user_id}`}
              streamMedia={
                watchingStreamKey === `guild:${guildId}:${channelId}:${vs.user_id}`
                  ? watchingStreamMedia
                  : null
              }
              onWatch={() => {
                const key = `guild:${guildId}:${channelId}:${vs.user_id}`;
                if (watchingStreamKey === key && watchingStreamMedia) {
                  setFocusedStreamUserId(vs.user_id);
                } else {
                  handleWatchStream(vs.user_id);
                }
              }}
            />
          ))}
          {/* Participant tiles */}
          {voiceStates.map((vs) => (
            <VoiceParticipantTile
              key={vs.user_id}
              vs={vs}
              guildId={guildId}
              onWatchStream={vs.self_stream ? () => handleWatchStream(vs.user_id) : undefined}
              onFocus={() => setFocusedUserId(vs.user_id)}
            />
          ))}
        </div>
      )}

      {/* Stream connecting indicator */}
      {streamConnectionState === 'connecting' && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-gray-300 backdrop-blur-sm">
          Connecting to stream...
        </div>
      )}

      {/* Floating join/disconnect bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex translate-y-2 justify-center opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#1e1f22]/90 p-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1 px-2 text-sm text-gray-300">
            <SpeakerHigh size={16} weight="fill" className="text-gray-400" />
            <span className="font-medium">{channel.name}</span>
          </div>
          {focusedStream && (
            <button
              type="button"
              onClick={handleStopWatching}
              className="flex items-center gap-2 rounded-xl bg-[#da373c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#a12d31]"
            >
              Stop Watching
            </button>
          )}
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
            >
              <SignOut size={16} />
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              className="flex items-center gap-2 rounded-xl bg-[#248046] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1a6334]"
            >
              <Plugs size={16} />
              Join Voice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StreamTile = ({ vs, guildId, channelId, isWatching, streamMedia, onWatch }) => {
  const videoRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const intervalRef = useRef(null);
  const user = useDiscordUsersStore((s) => s.users[vs.user_id]);
  const member = useDiscordMembersStore((s) =>
    guildId ? s.members[guildId]?.[vs.user_id] : undefined,
  );
  const vsMember = vs.member;
  const vsUser = vsMember?.user;
  const displayName =
    member?.nick || vsMember?.nick || user?.global_name || vsUser?.global_name ||
    user?.username || vsUser?.username || `User ${vs.user_id}`;

  // Fetch stream preview thumbnail
  const fetchPreview = useCallback(() => {
    const streamKey = encodeURIComponent(`guild:${guildId}:${channelId}:${vs.user_id}`);
    const url = `https://discord.com/api/v9/streams/${streamKey}/preview?version=${Date.now()}`;
    const token = useDiscordStore.getState().token;
    fetch(url, { headers: { Authorization: token } })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => { if (data?.url) setPreviewUrl(data.url); })
      .catch(() => { });
  }, [guildId, channelId, vs.user_id]);

  // Fetch preview on mount and refresh every 5 seconds
  useEffect(() => {
    fetchPreview();
    intervalRef.current = setInterval(fetchPreview, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchPreview]);

  useEffect(() => {
    if (!videoRef.current || !streamMedia) return;
    videoRef.current.srcObject = streamMedia;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [streamMedia]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onWatch}
      onKeyDown={(e) => e.key === 'Enter' && onWatch()}
      className="group/tile relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#1a1a1e]"
    >
      {/* Stream video when watching */}
      {isWatching && streamMedia ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 size-full object-contain"
        />
      ) : previewUrl ? (
        /* Stream preview thumbnail when not watching */
        <img
          src={previewUrl}
          alt="Stream preview"
          className="absolute inset-0 size-full object-contain"
        />
      ) : null}

      {/* Hover overlay */}
      {!isWatching &&
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            Watch Stream
          </span>
        </div>
      }

      {/* Top-right LIVE badge */}
      <div className="absolute right-3 top-3">
        <span className="rounded-full bg-[#ed4245] px-2 py-0.5 text-[10px] font-bold leading-tight text-white">
          LIVE
        </span>
      </div>

      {/* Bottom bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-black/60 to-transparent p-4">
        <span className="inline-flex h-8 items-center gap-2 truncate rounded-sm bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
          <Monitor size={16} className="text-green-400" weight="fill" />
          {displayName}
        </span>
      </div>
    </div>
  );
};

const VoiceParticipantTile = ({ vs, guildId, onWatchStream, onFocus }) => {
  const videoRef = useRef(null);
  const user = useDiscordUsersStore((s) => s.users[vs.user_id]);
  const member = useDiscordMembersStore((s) =>
    guildId ? s.members[guildId]?.[vs.user_id] : undefined,
  );
  const isMuted = vs.self_mute || vs.mute || vs.self_deaf || vs.deaf || vs.suppress;
  const isSpeaking = useDiscordVoiceStore((s) => s.speakingUsers.has(vs.user_id)) && !isMuted;
  const videoStream = useDiscordVoiceStore((s) => s.remoteVideoStreams.get(vs.user_id));

  const hasVideo = !!videoStream;

  // Resolve display name from multiple sources: store member, store user, voice state member
  const vsMember = vs.member;
  const vsUser = vsMember?.user;
  const displayName =
    member?.nick || vsMember?.nick || user?.global_name || vsUser?.global_name ||
    user?.username || vsUser?.username || `User ${vs.user_id}`;
  const avatarUrl = DiscordService.getUserAvatarUrl(
    vs.user_id,
    user?.avatar || vsUser?.avatar || vsMember?.avatar || null,
    128,
  );

  // Attach video stream to <video> element
  useEffect(() => {
    if (!videoRef.current || !videoStream) return;
    videoRef.current.srcObject = videoStream;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [videoStream]);

  const author = user || { id: vs.user_id, username: displayName };

  const openProfile = useCallback(() => {
    useModalStore.getState().push(DiscordUserProfileModal, { author, member, guildId });
  }, [author, member, guildId]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    useContextMenuStore.getState().open(DiscordUserContextMenu, {
      author,
      guildId,
      onViewProfile: openProfile,
    }, e);
  }, [author, guildId, openProfile]);

  return (
    <div
      onClick={onFocus || openProfile}
      onContextMenu={handleContextMenu}
      className={`group/tile relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[#1a1a1e] transition-shadow ${isSpeaking ? 'ring-2 ring-green-500' : ''
        }`}
    >
      {hasVideo ? (
        /* Video / Screen share */
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* Avatar fallback */
        <div className="flex flex-col items-center justify-center gap-2 p-8">
          <div
            className={`flex size-20 items-center justify-center rounded-full ${isSpeaking ? 'ring-4 ring-green-500' : ''
              }`}
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-20 rounded-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Top-right badges */}
      {(vs.self_stream || vs.self_video) && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {vs.self_video && !vs.self_stream && (
            <span className="rounded-full bg-black/50 p-1.5">
              <VideoCamera size={14} className="text-green-400" weight="fill" />
            </span>
          )}
          {vs.self_stream && (
            <span className="rounded-full bg-[#ed4245] px-2 py-0.5 text-[10px] font-bold leading-tight text-white">
              LIVE
            </span>
          )}
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent p-4">
        <span className="inline-flex h-8 items-center gap-2 truncate rounded-sm bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
          {vs.self_mute && !vs.mute && (
            <MicrophoneSlash size={16} className="text-gray-400" />
          )}
          {vs.mute && <MicrophoneSlash size={16} className="text-red-400" />}
          {vs.self_deaf && !vs.deaf && (
            <SpeakerSlash size={16} className="text-gray-400" />
          )}
          {vs.deaf && <SpeakerSlash size={16} className="text-red-400" />}
          {vs.self_stream && (
            <Monitor size={16} className="text-green-400" weight="fill" />
          )}
          <span>{displayName}</span>
        </span>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex size-8 items-center justify-center rounded-sm bg-black/50 text-white opacity-0 transition group-hover/tile:opacity-100"
        >
          <DotsThree size={20} />
        </button>
      </div>
    </div>
  );
};

export default DiscordVoiceChannelView;
