import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MagnifyingGlass, Megaphone, UsersThree, User, Robot } from '@phosphor-icons/react';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { useTelegramUsersStore } from '../store/telegram-users.store';
import { getChatDisplayName, formatTelegramDate } from '../utils/helpers';

const ICON_COLORS = {
  private: 'bg-blue-500',
  group: 'bg-green-500',
  supergroup: 'bg-violet-500',
  channel: 'bg-rose-500',
};

const ChatIcon = ({ type, name, photo }) => {
  if (photo) {
    return <img src={photo} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
  }

  const color = ICON_COLORS[type] || 'bg-blue-500';
  const initial = name?.[0]?.toUpperCase() || '?';

  const icon = type === 'channel'
    ? <Megaphone size={18} weight="fill" className="text-white" />
    : type === 'group' || type === 'supergroup'
      ? <UsersThree size={18} weight="fill" className="text-white" />
      : null;

  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${color}`}>
      {icon || <span className="text-sm font-semibold text-white">{initial}</span>}
    </div>
  );
};

const ChatItem = ({ chat, isActive, users }) => {
  const navigate = useNavigate();
  const displayName = getChatDisplayName(chat, users);
  const lastMsg = chat.lastMessage;
  const previewText = lastMsg?.action
    ? lastMsg.action
    : lastMsg?.text
      ? lastMsg.text.replace(/\n/g, ' ')
      : lastMsg?.media
        ? `[${lastMsg.media.type}]`
        : '';

  const timeStr = lastMsg?.date ? formatTelegramDate(lastMsg.date) : '';

  return (
    <button
      type="button"
      className={`flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-left transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
      onClick={() => navigate(`/telegram/${chat.id}`)}
    >
      <ChatIcon type={chat.type} name={displayName} photo={chat.photo} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{displayName}</span>
          {timeStr && <span className="shrink-0 text-[11px] text-gray-500">{timeStr}</span>}
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
            {lastMsg?.senderName && chat.type !== 'private' && (
              <span className="font-medium text-gray-300">{lastMsg.senderName}: </span>
            )}
            {previewText || '\u00A0'}
          </span>
          {chat.unreadCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-white">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const TelegramChatsSidebar = () => {
  const { chatId } = useParams();
  const { chats } = useTelegramChatsStore();
  const users = useTelegramUsersStore((s) => s.users);
  const [search, setSearch] = useState('');

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const query = search.toLowerCase();
    return chats.filter((c) => {
      const name = getChatDisplayName(c, users).toLowerCase();
      return name.includes(query);
    });
  }, [chats, users, search]);

  const pinnedChats = useMemo(() => filteredChats.filter((c) => c.pinned && !c.archived), [filteredChats]);
  const regularChats = useMemo(() => filteredChats.filter((c) => !c.pinned && !c.archived), [filteredChats]);

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#111214]">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-white/5 px-3 py-3">
        <h2 className="truncate text-base font-semibold text-white">Telegram</h2>
      </div>

      {/* Search */}
      <div className="shrink-0 px-2 py-2">
        <div className="flex min-w-0 items-center gap-2 rounded-md bg-[#1e1f22] px-2.5 py-1.5">
          <MagnifyingGlass size={14} className="shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-0 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="min-w-0 flex-1 overflow-y-auto px-1.5">
        {pinnedChats.length > 0 && (
          <div className="mb-1">
            {pinnedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === chatId}
                users={users}
              />
            ))}
            <div className="mx-2 my-1 border-b border-white/5" />
          </div>
        )}
        {regularChats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === chatId}
            users={users}
          />
        ))}
        {filteredChats.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            {search ? 'No chats found' : 'No chats yet'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramChatsSidebar;
