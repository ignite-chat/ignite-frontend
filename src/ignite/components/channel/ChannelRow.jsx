import { Hash, SpeakerHigh } from '@phosphor-icons/react';
import { useTypingStore } from '@/ignite/store/typing.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { ChannelType } from '@/ignite/constants/ChannelType';

const ChannelRow = ({ channel, isActive, isUnread, mentionsCount }) => {
  const isVoice = channel.type === ChannelType.GUILD_VOICE;
  const Icon = isVoice ? SpeakerHigh : Hash;
  const typingUsers = useTypingStore((s) => s.typing[channel.channel_id] || []);
  const firstTypingUser = useUsersStore((s) =>
    typingUsers[0] ? s.users[typingUsers[0].user_id] : null
  );
  const showTyping = !isVoice && typingUsers.length > 0 && !mentionsCount;

  return (
    <div
      className={`relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${
        isActive
          ? 'bg-white/[0.11] text-gray-100'
          : isUnread
            ? 'text-gray-100 hover:bg-white/5'
            : 'text-gray-500 hover:bg-white/5 hover:text-gray-100'
      }`}
    >
      <Icon
        className={`size-5 shrink-0 ${
          isActive || isUnread ? 'text-gray-200' : 'text-gray-500'
        }`}
      />
      <p
        className={`ml-1 select-none truncate text-base ${showTyping ? '' : 'flex-1'} ${
          isActive || isUnread
            ? 'font-semibold text-white'
            : 'font-medium'
        }`}
      >
        {channel.name}
      </p>
      {showTyping && (
        <span className="ml-auto flex items-center gap-1">
          {firstTypingUser ? (
            firstTypingUser.avatar_url ? (
              <img src={firstTypingUser.avatar_url} className="size-4 rounded-full" alt="" />
            ) : (
              <span className="flex size-4 items-center justify-center rounded-full bg-[#2b2d31] text-[8px] font-semibold text-gray-300">
                {firstTypingUser.username?.slice(0, 1).toUpperCase()}
              </span>
            )
          ) : (
            <span className="flex size-4 items-center justify-center rounded-full bg-[#2b2d31] text-[8px] font-semibold text-gray-300">
              {typingUsers[0]?.username?.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="flex items-center gap-[2px]">
            <span className="size-[5px] animate-bounce rounded-full bg-white [animation-delay:0ms]" />
            <span className="size-[5px] animate-bounce rounded-full bg-white [animation-delay:150ms]" />
            <span className="size-[5px] animate-bounce rounded-full bg-white [animation-delay:300ms]" />
          </span>
        </span>
      )}
      {mentionsCount > 0 && (
        <div className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm">
          {mentionsCount}
        </div>
      )}
    </div>
  );
};

export default ChannelRow;
