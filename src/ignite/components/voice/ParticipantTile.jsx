import { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';
import { DotsThree, MicrophoneSlash } from '@phosphor-icons/react';
import Avatar from '../Avatar';
import { useVoiceStore } from '@/ignite/store/voice.store';
import { useUsersStore } from '@/ignite/store/users.store';

const ParticipantTile = ({ voiceState }) => {
  const videoRef = useRef(null);
  const room = useVoiceStore((s) => s.room);
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const user =
    String(voiceState.user_id) === String(currentUser?.id)
      ? currentUser
      : useUsersStore.getState().getUser(String(voiceState.user_id));
  const name = user?.name || user?.username || String(voiceState.user_id);

  // Attach camera video track
  useEffect(() => {
    if (!room || !videoRef.current) return;

    const lkParticipant =
      room.localParticipant.identity === voiceState.user_id
        ? room.localParticipant
        : room.remoteParticipants.get(voiceState.user_id);

    if (!lkParticipant) return;

    const cameraPub = lkParticipant.getTrackPublication(Track.Source.Camera);
    if (cameraPub?.track && voiceState.self_video) {
      const el = cameraPub.track.attach(videoRef.current);
      el.style.objectFit = 'cover';
      return () => {
        cameraPub.track?.detach(videoRef.current);
      };
    }
  }, [room, voiceState.user_id, voiceState.self_video]);

  return (
    <div
      className={`group relative flex items-center justify-center overflow-hidden rounded-xl bg-[#18181b] transition-shadow ${
        voiceState.speaking ? 'ring-2 ring-green-500' : ''
      }`}
    >
      {voiceState.self_video ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-8">
          <div
            className={`flex size-20 items-center justify-center rounded-full ${
              voiceState.speaking ? 'ring-4 ring-green-500' : ''
            }`}
          >
            <Avatar
              user={user || { name }}
              className="size-20 bg-gray-600 text-3xl font-semibold text-gray-200"
            />
          </div>
        </div>
      )}

      {/* Bottom overlay bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent p-4">
        <span className="inline-flex h-8 items-center gap-2 truncate rounded-sm bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
          {voiceState.self_mute && <MicrophoneSlash className="size-4 text-red-400" />}
          <span className="hidden group-hover:inline">{name}</span>
        </span>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-sm bg-black/50 text-white"
        >
          <DotsThree className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default ParticipantTile;
