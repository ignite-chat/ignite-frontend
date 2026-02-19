import { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';
import { DotsThree, MicrophoneSlash, Monitor } from '@phosphor-icons/react';
import Avatar from '../Avatar';
import { useVoiceStore } from '@/store/voice.store';

const ParticipantTile = ({ participant }) => {
  const videoRef = useRef(null);
  const screenShareRef = useRef(null);
  const room = useVoiceStore((s) => s.room);

  // Attach camera video track
  useEffect(() => {
    if (!room || !videoRef.current) return;

    const lkParticipant =
      room.localParticipant.identity === participant.identity
        ? room.localParticipant
        : room.remoteParticipants.get(participant.identity);

    if (!lkParticipant) return;

    const cameraPub = lkParticipant.getTrackPublication(Track.Source.Camera);
    if (cameraPub?.track && participant.isCameraOn) {
      const el = cameraPub.track.attach(videoRef.current);
      el.style.objectFit = 'cover';
      return () => {
        cameraPub.track?.detach(videoRef.current);
      };
    }
  }, [room, participant.identity, participant.isCameraOn]);

  return (
    <div
      className={`group relative flex items-center justify-center overflow-hidden rounded-xl bg-[#18181b] transition-shadow ${
        participant.isSpeaking ? 'ring-2 ring-green-500' : ''
      }`}
    >
      {participant.isCameraOn ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-8">
          <div
            className={`flex size-20 items-center justify-center rounded-full ${
              participant.isSpeaking ? 'ring-4 ring-green-500' : ''
            }`}
          >
            <Avatar
              user={participant}
              className="size-20 bg-gray-600 text-3xl font-semibold text-gray-200"
            />
          </div>
        </div>
      )}

      {/* Bottom overlay bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent p-4">
        <span className="inline-flex h-8 items-center gap-2 truncate rounded-sm bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
          {participant.isScreenSharing && (
            <Monitor className="size-4 text-green-400" weight="fill" />
          )}
          {participant.isMuted && <MicrophoneSlash className="size-4 text-red-400" />}
          <span className="hidden group-hover:inline">{participant.name}</span>
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
