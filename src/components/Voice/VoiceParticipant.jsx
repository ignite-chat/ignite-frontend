import { useState } from 'react';
import { MicrophoneSlash, SpeakerSlash } from '@phosphor-icons/react';
import Avatar from '../Avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import GuildMemberPopoverContent from '../GuildMember/GuildMemberPopoverContent';
import UserProfileModal from '../UserProfileModal';
import { useUsersStore } from '@/store/users.store';
import { useVoiceStore } from '@/store/voice.store';

const VoiceParticipant = ({ voiceState }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const currentUser = useUsersStore().getCurrentUser();
  const connectionState = useVoiceStore((s) => s.connectionState);
  const user = useUsersStore.getState().getUser(String(voiceState.user_id))
  const name = user?.name || user?.username || String(voiceState.user_id);

  const isLocalOnOtherDevice = String(voiceState.user_id) === String(currentUser?.id) && connectionState === 'disconnected';

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button className={`mx-2 ml-7 flex w-[calc(100%-1.75rem)] cursor-pointer items-center gap-2 rounded px-2 py-0.5 hover:bg-gray-700/50 ${isLocalOnOtherDevice ? 'opacity-40' : ''}`}>
            {/* Speaking indicator ring */}
            <div
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${voiceState.speaking ? 'ring-2 ring-green-500' : ''
                }`}
            >
              <Avatar user={user || { name }} className="size-6 bg-gray-600 text-[10px] text-gray-300" />
            </div>

            <span className="flex-1 truncate text-left text-[13px] text-gray-400">{name}</span>

            {voiceState.self_mute && <MicrophoneSlash className="size-3.5 shrink-0 text-gray-500" />}
            {voiceState.self_deaf && <SpeakerSlash className="size-3.5 shrink-0 text-gray-500" />}
            {voiceState.self_stream && (
              <span className="shrink-0 rounded-full bg-red-500 px-1 py-px text-[10px] font-bold uppercase leading-tight tracking-wide text-white">
                LIVE
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto border-none bg-transparent p-0 shadow-none"
          side="right"
          align="start"
        >
          <GuildMemberPopoverContent
            userId={String(voiceState.user_id)}
            onOpenProfile={() => {
              setPopoverOpen(false);
              setProfileModalOpen(true);
            }}
          />
        </PopoverContent>
      </Popover>
      <UserProfileModal
        userId={String(voiceState.user_id)}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </>
  );
};

export default VoiceParticipant;
