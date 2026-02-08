import { useMemo, useCallback } from 'react';
import { UserStarIcon, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useChannelsStore } from '@/store/channels.store';
import useStore from '@/hooks/useStore';
import { useUnreadsStore } from '@/store/unreads.store';
import DMChannelItem from './DMChannelItem';
import { useFriendsStore } from '@/store/friends.store';
import { Badge } from '../ui/badge';

const DMSidebar = ({ activeChannelId, onNavigate }) => {
  const store = useStore();
  const currentUser = store.user || { id: 'me' };
  const { channels, pinnedChannelIds } = useChannelsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { requests } = useFriendsStore();

  // Helper to normalize thread data
  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const otherUser = (thread.recipients || []).find(r => r.id !== currentUser.id) || thread.user || {};
    const isPinned = pinnedChannelIds.includes(thread.channel_id);
    return { ...thread, user: otherUser, isPinned };
  }, [currentUser.id, pinnedChannelIds]);

  // Sort and prep channels
  const dmChannels = useMemo(() => {
    const allDms = channels
      .filter(c => c.type === 1)
      .map(normalizeThread);

    const pinned = allDms.filter(c => c.isPinned).sort((a, b) => {
      if (!a.last_message_id) return 1;
      if (!b.last_message_id) return -1;
      return BigInt(a.last_message_id) < BigInt(b.last_message_id) ? 1 : -1;
    });

    const unpinned = allDms.filter(c => !c.isPinned).sort((a, b) => {
      if (!a.last_message_id) return 1;
      if (!b.last_message_id) return -1;
      return BigInt(a.last_message_id) < BigInt(b.last_message_id) ? 1 : -1;
    });

    return [...pinned, ...unpinned];
  }, [channels, normalizeThread]);

  // Find Pending Friend Requests Count
  const pendingCount = requests.filter(req => req.sender_id != currentUser.id).length;

  // Separate into pinned and unpinned for rendering
  const pinnedDms = useMemo(() => dmChannels.filter(c => c.isPinned), [dmChannels]);
  const unpinnedDms = useMemo(() => dmChannels.filter(c => !c.isPinned), [dmChannels]);

  return (
    <aside className="flex w-80 flex-col bg-gray-800">
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

        {pinnedDms.length > 0 && (
          <>
            <div className="mt-4 flex items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Pinned
            </div>
            <div className="mt-2 space-y-0.5">
              {pinnedDms.map((channel) => (
                <DMChannelItem
                  key={channel.channel_id}
                  channel={channel}
                  isActive={activeChannelId === channel.channel_id}
                  onClick={() => onNavigate(channel.channel_id)}
                  channelUnreads={channelUnreads}
                  channelUnreadsLoaded={channelUnreadsLoaded}
                  channelsRaw={channels}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Direct Messages
        </div>

        <div className="mt-2 space-y-0.5">
          {unpinnedDms.map((channel) => (
            <DMChannelItem
              key={channel.channel_id}
              channel={channel}
              isActive={activeChannelId === channel.channel_id}
              onClick={() => onNavigate(channel.channel_id)}
              channelUnreads={channelUnreads}
              channelUnreadsLoaded={channelUnreadsLoaded}
              channelsRaw={channels}
            />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default DMSidebar;