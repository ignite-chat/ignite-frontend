import { useMemo, useCallback } from 'react';
import { UserStarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from '../ui/badge';
import { useChannelsStore } from '@/store/channels.store';
import useStore from '@/hooks/useStore';
import { useUnreadsStore } from '@/store/unreads.store';
import { useFriendsStore } from '@/store/friends.store';
import DMChannelItem from './DMChannelItem';
import UserBar from '../UserBar';

const sortByLastMessage = (a, b) => {
  if (!a.last_message_id) return 1;
  if (!b.last_message_id) return -1;
  return BigInt(a.last_message_id) < BigInt(b.last_message_id) ? 1 : -1;
};

const ChannelSection = ({ title, channels, activeChannelId, onNavigate, channelUnreads, channelUnreadsLoaded, channelsRaw }) => {
  if (channels.length === 0) return null;

  return (
    <>
      <div className="mt-4 flex items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 select-none cursor-default">
        {title}
      </div>
      <div className="mt-2 space-y-0.5">
        {channels.map((channel) => (
          <DMChannelItem
            key={channel.channel_id}
            channel={channel}
            isActive={activeChannelId === channel.channel_id}
            onClick={() => onNavigate(channel.channel_id)}
            channelUnreads={channelUnreads}
            channelUnreadsLoaded={channelUnreadsLoaded}
            channelsRaw={channelsRaw}
          />
        ))}
      </div>
    </>
  );
};

const DMSidebar = ({ activeChannelId, onNavigate }) => {
  const store = useStore();
  const currentUser = store.user || { id: 'me' };
  const { channels, pinnedChannelIds } = useChannelsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { requests } = useFriendsStore();

  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const otherUser = (thread.recipients || []).find(r => r.id !== currentUser.id) || thread.user || {};
    const isPinned = pinnedChannelIds.includes(thread.channel_id);
    return { ...thread, user: otherUser, isPinned };
  }, [currentUser.id, pinnedChannelIds]);

  const { pinnedDms, unpinnedDms } = useMemo(() => {
    const allDms = channels
      .filter(c => c.type === 1)
      .map(normalizeThread);

    const pinned = allDms.filter(c => c.isPinned).sort(sortByLastMessage);
    const unpinned = allDms.filter(c => !c.isPinned).sort(sortByLastMessage);

    return { pinnedDms: pinned, unpinnedDms: unpinned };
  }, [channels, normalizeThread]);

  const pendingCount = useMemo(
    () => requests.filter(req => req.sender_id !== currentUser.id).length,
    [requests, currentUser.id]
  );

  return (
    <aside className="flex w-80 flex-col bg-gray-800 select-none cursor-default">
      <div className="flex-1 overflow-y-auto p-2">
        <Button
          variant={activeChannelId === 'friends' ? "secondary" : "ghost"}
          className="w-full justify-start gap-3 mb-1"
          onClick={() => onNavigate('friends')}
        >
          <UserStarIcon className="h-5 w-5" />
          <span className="font-medium">Friends</span>
          {pendingCount > 0 && (
            <Badge className="ml-auto h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] hover:bg-[#f23f42] font-bold">
              {pendingCount}
            </Badge>
          )}
        </Button>

        <div className="border-b border-gray-700 my-2 mx-2" />

        <ChannelSection
          title="Pinned"
          channels={pinnedDms}
          activeChannelId={activeChannelId}
          onNavigate={onNavigate}
          channelUnreads={channelUnreads}
          channelUnreadsLoaded={channelUnreadsLoaded}
          channelsRaw={channels}
        />

        <ChannelSection
          title="Direct Messages"
          channels={unpinnedDms}
          activeChannelId={activeChannelId}
          onNavigate={onNavigate}
          channelUnreads={channelUnreads}
          channelUnreadsLoaded={channelUnreadsLoaded}
          channelsRaw={channels}
        />
      </div>
      <UserBar />
    </aside>
  );
};

export default DMSidebar;