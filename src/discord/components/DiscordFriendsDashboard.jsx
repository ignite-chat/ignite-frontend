import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, X, Search, Check } from 'lucide-react';
import { ChatCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  useDiscordRelationshipsStore,
  RelationshipType,
} from '../store/discord-relationships.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';

const statusOrder = { online: 0, idle: 1, dnd: 2, offline: 3 };

const FALLBACK_USER = { id: '0', username: 'Unknown User', global_name: null, avatar: null };

const StatusIndicator = ({ status }) => {
  const colors = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-500',
  };
  return (
    <div
      className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#1a1a1e] ${colors[status] || colors.offline}`}
    />
  );
};

const FriendRow = ({ user }) => {
  const navigate = useNavigate();
  const channels = useDiscordChannelsStore((s) => s.channels);
  const status = user.status || 'offline';
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 64);

  const messageUser = () => {
    const existingChannel = channels.find(
      (c) => c.type === 1 && c.recipient_ids?.includes(user.id)
    );
    if (existingChannel) {
      navigate(`/discord/@me/${existingChannel.id}`);
    }
  };

  return (
    <div
      onClick={messageUser}
      className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={avatarUrl}
            alt={user.global_name || user.username}
            className="size-8 rounded-full object-cover"
          />
          <StatusIndicator status={status} />
        </div>
        <div>
          <div className="text-sm font-bold text-white">
            {user.global_name || user.username}
            {user.global_name && (
              <span className="ml-1 hidden text-xs text-gray-400 group-hover:inline">
                {user.username}
              </span>
            )}
          </div>
          <div className="text-xs capitalize text-gray-400">{status}</div>
        </div>
      </div>
      <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            messageUser();
          }}
          className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <ChatCircle size={18} weight="fill" />
        </button>
      </div>
    </div>
  );
};

const PendingRow = ({ user, isOutgoing }) => {
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 64);

  const handleAccept = async (e) => {
    e.stopPropagation();
    try {
      await DiscordApiService.acceptFriendRequest(user.id);
      useDiscordRelationshipsStore.getState().removeRelationship(user.id);
      toast.success(`Accepted friend request from ${user.global_name || user.username}`);
    } catch {
      toast.error('Failed to accept friend request');
    }
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    try {
      await DiscordApiService.deleteRelationship(user.id);
      useDiscordRelationshipsStore.getState().removeRelationship(user.id);
      toast.success(isOutgoing ? 'Cancelled friend request' : 'Declined friend request');
    } catch {
      toast.error('Failed to decline friend request');
    }
  };

  return (
    <div className="border-white/5/30 group flex items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30">
      <div className="flex items-center gap-3">
        <img
          src={avatarUrl}
          alt={user.global_name || user.username}
          className="size-8 rounded-full object-cover"
        />
        <div>
          <div className="text-sm font-bold text-white">{user.global_name || user.username}</div>
          <div className="text-xs text-gray-400">
            {isOutgoing ? 'Outgoing Friend Request' : 'Incoming Friend Request'}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {!isOutgoing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleAccept}
                className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-900 hover:text-green-500"
              >
                <Check size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Accept</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDecline}
              className="flex size-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-900 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{isOutgoing ? 'Cancel' : 'Ignore'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

const DiscordFriendsDashboard = () => {
  const [activeTab, setActiveTab] = useState('online');
  const [searchQuery, setSearchQuery] = useState('');
  const relationships = useDiscordRelationshipsStore((s) => s.relationships);
  const usersMap = useDiscordUsersStore((s) => s.users);

  const friends = useMemo(
    () =>
      relationships
        .filter((r) => r.type === RelationshipType.FRIEND)
        .map((r) => usersMap[r.id] || { ...FALLBACK_USER, id: r.id })
        .filter((u) => u.username !== FALLBACK_USER.username),
    [relationships, usersMap]
  );

  const pendingRequests = useMemo(
    () =>
      relationships
        .filter(
          (r) => r.type === RelationshipType.INCOMING_REQUEST || r.type === RelationshipType.OUTGOING_REQUEST
        )
        .map((r) => ({
          user: usersMap[r.id] || { ...FALLBACK_USER, id: r.id },
          type: r.type,
        })),
    [relationships, usersMap]
  );

  const incomingCount = useMemo(
    () => relationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length,
    [relationships]
  );

  const filteredFriends = useMemo(() => {
    let list = friends;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(query) ||
          u.global_name?.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'online') {
      list = list.filter((u) => {
        const status = u.status || 'offline';
        return status !== 'offline';
      });
    }
    return list.sort((a, b) => {
      const sa = statusOrder[a.status || 'offline'];
      const sb = statusOrder[b.status || 'offline'];
      if (sa !== sb) return sa - sb;
      const na = (a.global_name || a.username || '').toLowerCase();
      const nb = (b.global_name || b.username || '').toLowerCase();
      return na.localeCompare(nb);
    });
  }, [friends, searchQuery, activeTab]);

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e] select-none">
      <header className="flex h-12 items-center justify-between border-b border-white/5 px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold text-[#f2f3f5]">
            <Users size={20} className="text-[#80848e]" />
            Friends
          </div>
          <Separator orientation="vertical" className="h-6 bg-[#4e5058]" />
          <nav className="flex items-center gap-2">
            <TabButton id="online" label="Online" active={activeTab} onClick={setActiveTab} />
            <TabButton id="all" label="All" active={activeTab} onClick={setActiveTab} />
            <TabButton
              id="pending"
              label="Pending"
              active={activeTab}
              onClick={setActiveTab}
              count={incomingCount}
            />
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        {(activeTab === 'online' || activeTab === 'all') && (
          <>
            <div className="mb-4">
              <InputGroup className="border-white/5 bg-[#17171a]">
                <InputGroupAddon>
                  <Search size={16} className="text-white" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-white placeholder:text-gray-500"
                />
                {searchQuery && (
                  <InputGroupAddon>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery('')}
                      className="h-6 w-6 text-gray-500 hover:bg-transparent hover:text-gray-300"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </Button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
                  {activeTab === 'online' ? 'Online' : 'All Friends'} — {filteredFriends.length}
                </div>
                {filteredFriends.map((user) => (
                  <FriendRow key={user.id} user={user} />
                ))}
                {filteredFriends.length === 0 && (
                  <div className="flex h-64 flex-col items-center justify-center">
                    <p className="text-sm text-gray-500">
                      {searchQuery ? 'No friends match your search.' : 'No friends found.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-1">
            <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">
              Pending — {pendingRequests.length}
            </div>
            {pendingRequests.length === 0 && (
              <div className="flex h-64 flex-col items-center justify-center">
                <p className="text-sm text-gray-500">There are no pending friend requests.</p>
              </div>
            )}
            {pendingRequests.map((r) => (
              <PendingRow
                key={r.user.id}
                user={r.user}
                isOutgoing={r.type === RelationshipType.OUTGOING_REQUEST}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ id, label, active, onClick, count }) => (
  <Button
    variant={active === id ? 'secondary' : 'ghost'}
    size="sm"
    className="h-7 px-3 text-sm font-medium"
    onClick={() => onClick(id)}
  >
    {label}
    {count != null && count > 0 && (
      <Badge className="ml-2 h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
        {count}
      </Badge>
    )}
  </Button>
);

export default DiscordFriendsDashboard;
