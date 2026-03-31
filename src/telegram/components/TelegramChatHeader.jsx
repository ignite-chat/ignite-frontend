import { useMemo } from 'react';
import { UsersThree, Megaphone, User } from '@phosphor-icons/react';
import { useTelegramUsersStore } from '../store/telegram-users.store';
import { getChatDisplayName } from '../utils/helpers';

const ICON_COLORS = {
  private: 'bg-blue-500',
  group: 'bg-green-500',
  supergroup: 'bg-violet-500',
  channel: 'bg-rose-500',
};

const TelegramChatHeader = ({ chat }) => {
  const users = useTelegramUsersStore((s) => s.users);
  const displayName = getChatDisplayName(chat, users);

  const statusText = useMemo(() => {
    if (chat.type === 'private') {
      const user = users[chat.id];
      if (!user) return null;
      if (user.status === 'online') return 'online';
      if (user.status === 'recently') return 'last seen recently';
      if (user.status === 'lastWeek') return 'last seen within a week';
      if (user.status === 'lastMonth') return 'last seen within a month';
      if (user.status === 'offline' && user.lastOnline) {
        const date = new Date(user.lastOnline * 1000);
        return `last seen ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
      }
      return 'offline';
    }
    if (chat.memberCount) {
      return `${chat.memberCount.toLocaleString()} ${chat.type === 'channel' ? 'subscribers' : 'members'}`;
    }
    return null;
  }, [chat, users]);

  const color = ICON_COLORS[chat.type] || 'bg-blue-500';
  const initial = displayName?.[0]?.toUpperCase() || '?';
  const TypeIcon = chat.type === 'channel' ? Megaphone : chat.type === 'private' ? User : UsersThree;
  const showGroupIcon = chat.type !== 'private';

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/5 bg-[#1a1a1e] px-4">
      {chat.photo ? (
        <img src={chat.photo} alt="" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${color}`}>
          {showGroupIcon
            ? <TypeIcon size={16} weight="fill" className="text-white" />
            : <span className="text-xs font-semibold text-white">{initial}</span>
          }
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
        {statusText && (
          <span className={`block text-xs ${chat.type === 'private' && users[chat.id]?.status === 'online' ? 'text-blue-400' : 'text-gray-400'}`}>
            {statusText}
          </span>
        )}
      </div>
    </div>
  );
};

export default TelegramChatHeader;
