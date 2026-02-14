import { MicrophoneSlash } from '@phosphor-icons/react';

const VoiceParticipant = ({ participant }) => {
  return (
    <div className="mx-2 ml-7 flex items-center gap-2 rounded px-2 py-0.5">
      {/* Speaking indicator ring */}
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-600 text-[10px] font-semibold text-gray-300 ${
          participant.isSpeaking ? 'ring-2 ring-green-500' : ''
        }`}
      >
        {(participant.name || '?').charAt(0).toUpperCase()}
      </div>

      <span className="flex-1 truncate text-[13px] text-gray-400">{participant.name}</span>

      {participant.isMuted && <MicrophoneSlash className="size-3.5 shrink-0 text-gray-500" />}
    </div>
  );
};

export default VoiceParticipant;
