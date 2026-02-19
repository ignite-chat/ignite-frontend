import { MicrophoneSlash, SpeakerSlash } from '@phosphor-icons/react';
import Avatar from '../Avatar';

const VoiceParticipant = ({ participant }) => {
  return (
    <div className="mx-2 ml-7 flex items-center gap-2 rounded px-2 py-0.5">
      {/* Speaking indicator ring */}
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
          participant.isSpeaking ? 'ring-2 ring-green-500' : ''
        }`}
      >
        <Avatar user={participant} className="size-6 bg-gray-600 text-[10px] text-gray-300" />
      </div>

      <span className="flex-1 truncate text-[13px] text-gray-400">{participant.name}</span>

      {participant.isMuted && <MicrophoneSlash className="size-3.5 shrink-0 text-gray-500" />}
      {participant.isDeafened && <SpeakerSlash className="size-3.5 shrink-0 text-gray-500" />}
      {participant.isScreenSharing && (
        <span className="shrink-0 rounded-full bg-red-500 px-1 py-px text-[10px] font-bold uppercase leading-tight tracking-wide text-white">
          LIVE
        </span>
      )}
    </div>
  );
};

export default VoiceParticipant;
