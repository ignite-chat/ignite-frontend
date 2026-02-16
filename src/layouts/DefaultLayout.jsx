import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Fire, Plus } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../store/guilds.store';
import GuildDialog from '../components/GuildDialog';
import GuildContextMenu from '../components/Guild/GuildContextMenu';
import { ContextMenu, ContextMenuTrigger } from '../components/ui/context-menu';

import { useUnreadsStore } from '../store/unreads.store';
import { useChannelsStore } from '../store/channels.store';
import useStore from '../hooks/useStore';
import Avatar from '../components/Avatar';
import { GuildContextProvider } from '@/contexts/GuildContext';
import { useFriendsStore } from '../store/friends.store';
import { ChannelsService } from '../services/channels.service';
import { useGuildOrder } from '../hooks/useGuildOrder';
import { isChannelUnread as checkChannelUnread, getChannelMentionCount as getChannelMentions } from '../utils/unreads.utils';

const SidebarIcon = ({
  icon = '',
  iconUrl = '',
  isActive = false,
  isServerIcon = false,
  text = 'tooltip',
  isUnread = false,
  mentionCount = 0,
}) => (
  <div className="group relative mb-2 min-w-min px-3">
    <div
      className={`absolute -left-1 top-1/2 block w-2 -translate-y-1/2 rounded-lg bg-white transition-all duration-200 ${
        isActive
          ? 'h-10' // Active: Full height (40px)
          : `group-hover:h-5 ${isUnread ? 'h-2' : 'h-0'}` // Inactive: Hover = Medium (20px), Base = Small (8px) if unread, else hidden
      } `}
    ></div>

    <div className="relative mx-auto h-12 w-12">
      <div
        className={`absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 ease-out hover:bg-primary hover:text-white ${isActive ? 'bg-primary text-white' : 'bg-[#1d1d1e] text-gray-100'} ${!isServerIcon ? 'text-green-500 hover:bg-green-500 hover:text-white' : ''}`}
      >
        {icon ? (
          icon
        ) : iconUrl ? (
          <img src={iconUrl} alt={text} className="size-full object-cover" />
        ) : (
          <span className="text-xl leading-none text-gray-400">{text.slice(0, 2)}</span>
        )}

        {/* Tooltip */}
        <span className="pointer-events-none absolute left-14 z-50 m-2 w-auto min-w-max origin-left scale-0 rounded-md bg-[#121214] p-2 text-sm font-bold text-white shadow-lg transition-all duration-100 group-hover:scale-100">
          {text}
        </span>
      </div>

      {/* Notification Badge - positioned relative to icon */}
      {mentionCount > 0 && (
        <div className="absolute -bottom-1 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white/5 bg-destructive px-1 text-[11px] font-bold text-white">
          {mentionCount > 99 ? '99+' : mentionCount}
        </div>
      )}
    </div>
  </div>
);

const SortableGuildIcon = ({
  guild,
  isActive,
  isUnread,
  mentionCount,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(guild.id),
  });
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 0 : 'auto',
  };

  const handleLeaveServer = async () => {
    await GuildsService.leaveGuild(guild.id);
    navigate('/channels/@me');
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ContextMenu>
        <ContextMenuTrigger>
          <Link
            to={`/channels/${guild.id}`}
            draggable="false"
            style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
          >
            <SidebarIcon
              iconUrl={guild.icon || ''}
              text={guild.name}
              isServerIcon={true}
              isActive={isActive}
              isUnread={isUnread}
              mentionCount={mentionCount}
            />
          </Link>
        </ContextMenuTrigger>
        <GuildContextMenu guild={guild} onLeave={() => setShowLeaveDialog(true)} />
      </ContextMenu>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave &apos;{guild.name}&apos;</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave <span className="font-bold text-white">{guild.name}</span>? You won&apos;t be
              able to rejoin this server unless you are re-invited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveServer}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Leave Server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Sidebar = () => {
  const { guildId, channelId } = useParams();
  const { user } = useStore();
  const { guilds } = useGuildsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { channels, channelMessages } = useChannelsStore();
  const { requests } = useFriendsStore();
  const [isGuildDialogOpen, setIsGuildDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const { orderedGuilds, reorder } = useGuildOrder(guilds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeGuild = useMemo(() => {
    if (!activeId) return null;
    return guilds.find((g) => String(g.id) === String(activeId));
  }, [activeId, guilds]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(active.id, over.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const isChannelUnread = useCallback(
    (channel) => checkChannelUnread(channel, channelUnreads, channelUnreadsLoaded),
    [channelUnreads, channelUnreadsLoaded]
  );

  const getChannelMentionCount = useCallback(
    (channelId) => getChannelMentions(channelId, channelUnreads, channelUnreadsLoaded),
    [channelUnreads, channelUnreadsLoaded]
  );

  // Get total mention count for a guild
  const getGuildMentionCount = useCallback(
    (guild) => {
      if (!channelUnreadsLoaded) return 0;

      const guildChannels = channels.filter(
        (c) => String(c.guild_id) === String(guild.id) && c.type === 0
      );
      let totalMentions = 0;

      for (const channel of guildChannels) {
        totalMentions += getChannelMentionCount(channel.channel_id);
      }

      return totalMentions;
    },
    [channels, channelUnreadsLoaded, getChannelMentionCount]
  );

  const isGuildUnread = useCallback(
    (guild) => {
      const guildChannels = channels.filter(
        (c) => String(c.guild_id) === String(guild.id) && c.type === 0
      );
      for (const channel of guildChannels) {
        if (isChannelUnread(channel)) {
          return true;
        }
      }
      return false;
    },
    [channels, isChannelUnread]
  );

  // Calculate pending friend requests count (incoming requests only)
  const pendingCount = useMemo(() => {
    if (!user) return 0;
    return requests.filter((req) => req.sender_id != user.id).length;
  }, [requests, user]);

  // Get a list of actual DM Channel Objects that are unread
  const unreadDmChannels = useMemo(() => {
    if (!channelUnreadsLoaded || !user) return [];

    return channels
      .filter((c) => c.type === 1 && isChannelUnread(c))
      .map((channel) => {
        // Resolve the "other" user for avatar/name display
        const otherUser = (channel.recipients || []).find((r) => r.id !== user.id) ||
          channel.user || { username: 'Unknown' };

        // Calculate unread count
        let unreadCount = 0;
        const channelUnread = channelUnreads.find(
          (cu) => String(cu.channel_id) === String(channel.channel_id)
        );
        if (channelUnread && channelUnread.last_read_message_id) {
          const messages = channelMessages[channel.channel_id];
          if (messages && messages.length > 0) {
            const lastReadId = BigInt(channelUnread.last_read_message_id);
            unreadCount = messages.filter((msg) => {
              try {
                return BigInt(msg.id) > lastReadId;
              } catch {
                return false;
              }
            }).length;
          }
        }

        return {
          ...channel,
          otherUser: otherUser,
          unreadCount: unreadCount,
        };
      });
  }, [channelUnreadsLoaded, channels, channelUnreads, channelMessages, user]);

  // Load messages for unread DM channels that don't have messages loaded
  useEffect(() => {
    if (!channelUnreadsLoaded) return;

    unreadDmChannels.forEach((dm) => {
      // Check if messages are not loaded for this channel
      if (!channelMessages[dm.channel_id] || channelMessages[dm.channel_id].length === 0) {
        // Load messages for this channel
        ChannelsService.loadChannelMessages(dm.channel_id);
      }
    });
  }, [unreadDmChannels, channelMessages, channelUnreadsLoaded]);

  return (
    <>
      <div className="scrollbar-none relative left-0 top-0 m-0 flex h-full min-w-min flex-col items-center overflow-y-auto border-r border-white/5 bg-[#121214] pt-3 text-white shadow">
        {/* Main Home / Friends Button */}
        <Link to="/channels/@me">
          <SidebarIcon
            icon={<Fire className="size-6" />}
            text="Friends"
            isServerIcon={true}
            isActive={!guildId}
            mentionCount={pendingCount}
          />
        </Link>

        <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />

        {/* List of Unread DMs */}
        {unreadDmChannels.map((dm) => (
          <Link key={dm.channel_id} to={`/channels/@me/${dm.channel_id}`}>
            <SidebarIcon
              // render Avatar as the icon
              icon={<Avatar user={dm.otherUser} className="size-full" />}
              text={dm.otherUser.username}
              isServerIcon={true}
              isActive={channelId === dm.channel_id}
              isUnread={true} // It's in this list because it is unread
              mentionCount={dm.unreadCount}
            />
          </Link>
        ))}

        {unreadDmChannels.length > 0 && (
          <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
        )}

        {/* Guilds List — Draggable */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={orderedGuilds.map((g) => String(g.id))}
            strategy={verticalListSortingStrategy}
          >
            {orderedGuilds.map((guild) => (
              <SortableGuildIcon
                key={guild.id}
                guild={guild}
                isActive={guildId === guild.id}
                isUnread={isGuildUnread(guild)}
                mentionCount={getGuildMentionCount(guild)}
                isDragging={!!activeId}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeGuild ? (
              <div style={{ pointerEvents: 'none' }}>
                <SidebarIcon
                  iconUrl={activeGuild.icon || ''}
                  text={activeGuild.name}
                  isServerIcon={true}
                  isActive={false}
                  isUnread={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <button type="button" onClick={() => setIsGuildDialogOpen(true)}>
          <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
        </button>
      </div>
      <GuildDialog open={isGuildDialogOpen} onOpenChange={setIsGuildDialogOpen} />
    </>
  );
};

const DefaultLayout = ({ children }) => {
  return (
    <GuildContextProvider>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </GuildContextProvider>
  );
};

export default DefaultLayout;
