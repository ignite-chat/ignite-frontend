import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Hash, Plus, CaretDown, CaretRight, SpeakerHigh } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import api from '@/api';
import { GuildsService } from '@/services/guilds.service';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useUnreadsStore } from '@/store/unreads.store';
import { UnreadsService } from '@/services/unreads.service';
import { isChannelUnread as checkChannelUnread, getChannelMentionCount as getChannelMentions } from '@/utils/unreads.utils';
import { ChannelsService } from '@/services/channels.service';
import { useChannelsStore } from '@/store/channels.store';
import { useVoiceStore } from '@/store/voice.store';
import { VoiceService } from '@/services/voice.service';
import { ChannelType } from '@/constants/ChannelType';
import { useUsersStore } from '@/store/users.store';
import useStore from '@/hooks/useStore';
import VoiceControls from '@/components/Voice/VoiceControls';
import VoiceParticipant from '@/components/Voice/VoiceParticipant';
import UserBar from '@/components/UserBar';
import GuildSidebarHeader from './GuildSidebarHeader';

// Presentational channel row, used both in SortableChannel and DragOverlay
const ChannelRow = ({ channel, isActive, isUnread, mentionsCount, isDragOverlay }) => {
  const isVoice = channel.type === ChannelType.GUILD_VOICE;
  const Icon = isVoice ? SpeakerHigh : Hash;

  return (
    <div
      className={`relative mx-2 my-0.5 flex items-center rounded-sm px-2 py-1 transition-colors ${
        isDragOverlay
          ? 'bg-white/[0.11] text-gray-100 shadow-md shadow-black/40 ring-1 ring-gray-500/40'
          : isActive
            ? 'bg-white/[0.11] text-gray-100'
            : isUnread
              ? 'text-gray-100 hover:bg-white/5'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-100'
      }`}
    >
      <Icon
        className={`size-5 shrink-0 ${
          isDragOverlay ? 'text-gray-300' : isActive || isUnread ? 'text-gray-200' : 'text-gray-500'
        }`}
      />
      <p
        className={`ml-1 flex-1 select-none truncate text-base ${
          isDragOverlay
            ? 'font-medium text-gray-100'
            : isActive || isUnread
              ? 'font-semibold text-white'
              : 'font-medium'
        }`}
      >
        {channel.name}
      </p>
      {mentionsCount > 0 && (
        <div className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm">
          {mentionsCount}
        </div>
      )}
    </div>
  );
};

const SortableChannel = ({
  channel,
  isActive,
  isUnread,
  mentionsCount,
  expanded,
  canManageChannels,
  onEditChannel,
  handleDeleteChannel,
  navigate,
  globalIsDragging,
  guild,
  voiceParticipants,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.channel_id,
    disabled: !canManageChannels,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none',
    position: 'relative',
  };

  const handleMarkAsRead = async () => {
    await UnreadsService.setLastReadMessageId(channel.channel_id, channel.last_message_id || null);
    await ChannelsService.acknowledgeChannelMessage(
      channel.channel_id,
      channel.last_message_id || null
    );
    toast.success('Channel marked as read.');
  };

  const handleCopyLink = async () => {
    const channelLink = `${window.location.origin}/channels/${channel.guild_id}/${channel.channel_id}`;
    try {
      await navigator.clipboard.writeText(channelLink);
      toast.success('Channel link copied to clipboard.');
    } catch {
      toast.error('Could not copy channel link to clipboard.');
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(String(channel.channel_id));
      toast.success('Channel ID copied to clipboard.');
    } catch {
      toast.error('Could not copy channel ID to clipboard.');
    }
  };

  const isVoice = channel.type === ChannelType.GUILD_VOICE;

  const handleVoiceClick = (e) => {
    if (isDragging) return;
    VoiceService.joinVoiceChannel(
      channel.channel_id,
      channel.guild_id,
      guild?.name || '',
      channel.name
    );
  };

  const channelContent = (
    <>
      {/* Unread indicator bar */}
      {isUnread && !isActive && (
        <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}

      <ChannelRow
        channel={channel}
        isActive={isActive}
        isUnread={isUnread}
        mentionsCount={mentionsCount}
      />
    </>
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ContextMenu>
        <ContextMenuTrigger>
          {isVoice ? (
            <div>
              <Link
                to={`/channels/${channel.guild_id}/${channel.channel_id}`}
                onClick={handleVoiceClick}
                className={`${!expanded && !isActive ? 'hidden' : ''} group relative block`}
                draggable="false"
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              >
                {channelContent}
              </Link>
              {/* Voice participants */}
              {voiceParticipants?.length > 0 && (
                <div className="pb-1">
                  {voiceParticipants.map((p) => (
                    <VoiceParticipant key={p.identity} participant={p} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              to={`/channels/${channel.guild_id}/${channel.channel_id}`}
              className={`${!expanded && !isActive ? 'hidden' : ''} group relative block`}
              draggable="false"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              {channelContent}
            </Link>
          )}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {!isVoice && (
            <ContextMenuItem disabled={!isUnread} onSelect={handleMarkAsRead}>
              Mark as Read
            </ContextMenuItem>
          )}
          {!isVoice && <ContextMenuSeparator />}
          {isVoice ? (
            <ContextMenuItem
              onSelect={() => {
                handleVoiceClick();
                navigate(`/channels/${channel.guild_id}/${channel.channel_id}`);
              }}
            >
              Join Voice Channel
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onSelect={() => navigate(`/channels/${channel.guild_id}/${channel.channel_id}`)}
            >
              Go to Channel
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={handleCopyLink}>Copy Link</ContextMenuItem>

          {canManageChannels && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onEditChannel?.(channel)}>
                Edit Channel
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => handleDeleteChannel(channel)}
                className="text-red-500 hover:bg-red-600/20"
              >
                Delete Channel
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleCopyId}>Copy Channel ID</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

const GuildSidebarCategory = ({
  category,
  channels,
  activeChannelId,
  openCreateChannelDialog,
  guild,
  onEditChannel,
  canManageChannels,
  isDropTarget,
  globalIsDragging,
}) => {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const sectionName = category?.name;
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { channelId: voiceChannelId, participants: voiceParticipants } = useVoiceStore();
  const currentUser = useStore((s) => s.user);
  const usersStore = useUsersStore();

  const { setNodeRef } = useDroppable({
    id: category?.channel_id,
    disabled: !category,
    data: {
      type: 'category',
      category,
    },
  });

  // Local state for optimistic sorting updates
  const [sortedChannels, setSortedChannels] = useState([]);

  // Filter and sort initially based on props
  useEffect(() => {
    const filtered = [...(channels || [])]
      .filter((c) => c.type === ChannelType.GUILD_TEXT || c.type === ChannelType.GUILD_VOICE)
      .filter((c) => c.parent_id == category?.channel_id)
      .sort((a, b) => {
        const aPos = Number(a.position ?? 0);
        const bPos = Number(b.position ?? 0);
        if (aPos === bPos) {
          return String(a.name || a.channel_name || '').localeCompare(
            String(b.name || b.channel_name || '')
          );
        }
        return aPos - bPos;
      });
    setSortedChannels(filtered);
  }, [channels, category?.channel_id]);

  const isChannelUnread = useCallback(
    (channel) => checkChannelUnread(channel, channelUnreads, channelUnreadsLoaded),
    [channelUnreads, channelUnreadsLoaded]
  );

  const getMentionsCount = useCallback(
    (channel) => getChannelMentions(channel.channel_id, channelUnreads, channelUnreadsLoaded),
    [channelUnreads, channelUnreadsLoaded]
  );

  const handleDeleteChannel = useCallback(
    async (channel) => {
      if (!canManageChannels) {
        toast.error('Only the server owner can manage channels.');
        return;
      }
      if (!guild?.id || !channel) return;
      if (channel.type === 3) {
        const childChannels = channels.filter((c) => c.parent_id === channel.channel_id);
        if (childChannels.length > 0) {
          toast.error(
            'Cannot delete category with existing channels. Please delete its channels first.'
          );
          return;
        }
      }
      const confirmDelete = window.confirm('Delete this channel?');
      if (!confirmDelete) return;
      ChannelsService.deleteGuildChannel(guild.id, channel.channel_id);
    },
    [canManageChannels, guild?.id]
  );

  const markChannelsAsRead = useCallback(async () => {
    const unreadChannels = sortedChannels.filter(isChannelUnread);
    await Promise.all(
      unreadChannels.map(async (channel) => {
        await UnreadsService.setLastReadMessageId(
          channel.channel_id,
          channel.last_message_id || null
        );
        await ChannelsService.acknowledgeChannelMessage(
          channel.channel_id,
          channel.last_message_id || null
        );
      })
    );
    toast.success('Channels marked as read.');
  }, [sortedChannels, isChannelUnread]);

  const anyChannelUnread = useMemo(() => {
    return sortedChannels.some(isChannelUnread);
  }, [sortedChannels, isChannelUnread]);

  return (
    <div className="flex w-full flex-col">
      {category && (
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              ref={setNodeRef}
              className={`mb-1 flex items-center pt-4 transition-colors duration-150 ${
                isDropTarget
                  ? 'rounded bg-gray-700/60 text-gray-100'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              <button
                type="button"
                className="flex flex-auto items-center"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
              >
                <div className="flex w-6 items-center justify-center">
                  {expanded ? <CaretDown className="size-2" /> : <CaretRight className="size-2" />}
                </div>
                <span className="text-xs font-bold uppercase">{sectionName}</span>
              </button>

              {canManageChannels && (
                <button type="button" onClick={openCreateChannelDialog} aria-label="Create channel">
                  <Plus className="mr-2 size-3 text-gray-400" />
                </button>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem disabled={!anyChannelUnread} onSelect={markChannelsAsRead}>
              Mark as Read
            </ContextMenuItem>

            {canManageChannels && (
              <ContextMenuItem
                onSelect={() => handleDeleteChannel(category)}
                className="text-red-500 hover:bg-red-600/20"
              >
                Delete Category
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      )}

      <SortableContext
        items={sortedChannels.map((c) => c.channel_id)}
        strategy={verticalListSortingStrategy}
      >
        {sortedChannels.map((channel) => {
          const isUnread =
            channel.type === ChannelType.GUILD_VOICE ? false : isChannelUnread(channel);
          const isActive =
            channel.type === ChannelType.GUILD_VOICE
              ? channel.channel_id == activeChannelId ||
                voiceChannelId === String(channel.channel_id)
              : channel.channel_id == activeChannelId;
          const mentionsCount =
            channel.type === ChannelType.GUILD_VOICE ? 0 : getMentionsCount(channel);

          return (
            <SortableChannel
              key={channel.channel_id}
              channel={channel}
              isActive={isActive}
              isUnread={isUnread}
              mentionsCount={mentionsCount}
              expanded={expanded}
              canManageChannels={canManageChannels}
              onEditChannel={onEditChannel}
              handleDeleteChannel={handleDeleteChannel}
              navigate={navigate}
              globalIsDragging={globalIsDragging}
              guild={guild}
              voiceParticipants={
                channel.type === ChannelType.GUILD_VOICE
                  ? voiceChannelId === String(channel.channel_id)
                    ? voiceParticipants
                    : (channel.voice_states || []).map((vs) => {
                        const user =
                          String(vs.user_id) === String(currentUser?.id)
                            ? currentUser
                            : usersStore.getUser(String(vs.user_id));
                        return {
                          identity: String(vs.user_id),
                          name: user?.name || user?.username || String(vs.user_id),
                          isSpeaking: false,
                          isMuted: vs.self_mute,
                        };
                      })
                  : []
              }
            />
          );
        })}
      </SortableContext>
    </div>
  );
};

const GuildSidebar = ({
  guild,
  onOpenServerSettings,
  onEditChannel,
  onCreateChannel,
  onCreateCategory,
  canOpenServerSettings,
  canManageChannels,
}) => {
  const { channelId } = useParams();
  const { channels, setChannels } = useChannelsStore();
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const guildChannels = useMemo(() => {
    return (channels || []).filter((c) => String(c.guild_id) === String(guild?.id));
  }, [channels, guild?.id]);

  const categories = (guildChannels || []).filter((c) => c.type === 3);

  // Find the active channel data for the drag overlay
  const activeChannel = useMemo(() => {
    if (!activeId) return null;
    return channels.find((c) => c.channel_id === activeId);
  }, [activeId, channels]);

  // Determine which category is being hovered over
  const dropTargetCategoryId = useMemo(() => {
    if (!overId || !activeId) return null;
    const overItem = channels.find((c) => c.channel_id === overId);
    if (!overItem) return null;
    // If hovering over a category header directly
    if (overItem.type === 3) return overItem.channel_id;
    // If hovering over a channel, highlight its parent category
    return overItem.parent_id;
  }, [overId, activeId, channels]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    setOverId(event.over?.id || null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = event;

    if (!over || active.id === over.id || !canManageChannels) {
      return;
    }

    const activeChannel = channels.find((c) => c.channel_id === active.id);
    const overChannel = channels.find((c) => c.channel_id === over.id);

    if (!activeChannel || !overChannel) return;

    let newChannels = [...channels];
    const oldIndex = newChannels.findIndex((c) => c.channel_id === active.id);

    let newParentId;

    // Case 1: Drop on a Category Header (Type 3)
    if (overChannel.type === 3) {
      newParentId = overChannel.channel_id;

      // Update parent_id of the active channel
      newChannels[oldIndex] = {
        ...newChannels[oldIndex],
        parent_id: newParentId,
        // We don't set position here, will rely on API/sibling finding or append
      };

      // Move the channel to the end of the new list in UI (simplest optimistic update)
      // Or filter out and push.
      // But simplest way for optimistic UI is just update parent_id.
      // The sort logic in GuildSidebarCategory handles visual placement (based on position).
      // Since we didn't update position, it might look odd.
      // Let's rely on setting a high position?
      newChannels[oldIndex].position = 9999;
    }
    // Case 2: Drop on another Channel (Sortable)
    else {
      newParentId = overChannel.parent_id;

      // Update active channel parent
      newChannels[oldIndex] = { ...newChannels[oldIndex], parent_id: newParentId };

      // Find target index in global list
      const newIndex = newChannels.findIndex((c) => c.channel_id === over.id);

      // Reorder
      newChannels = arrayMove(newChannels, oldIndex, newIndex);
    }

    // Recalculate positions for all sibling channels in the target parent group
    // Filter to only text channels (type 0) in the same parent, preserving array order
    const siblingsInOrder = newChannels.filter(
      (c) => c.parent_id === newParentId && (c.type === 0 || c.type === 2)
    );

    // Update position fields on the channel objects so the UI sorts correctly
    siblingsInOrder.forEach((sibling, index) => {
      const channelIndex = newChannels.findIndex((c) => c.channel_id === sibling.channel_id);
      if (channelIndex !== -1) {
        newChannels[channelIndex] = { ...newChannels[channelIndex], position: index };
      }
    });

    // Update local state immediately (now with correct position values)
    setChannels([...newChannels]);

    // Prepare API payload
    const siblings = siblingsInOrder.map((c, index) => ({
      id: c.channel_id,
      position: index,
      parent_id: newParentId,
    }));

    try {
      await api.patch(`/guilds/${guild.id}/channels`, siblings);
      toast.success('Channel moved.');
    } catch (err) {
      console.error('Failed to move channel', err);
      toast.error('Failed to move channel');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToVerticalAxis]}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="relative top-0 flex h-full min-w-[240px] flex-col bg-[#121214] text-gray-100">
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
              <GuildSidebarHeader
                guildName={guild?.name}
                guild={guild}
                onOpenServerSettings={onOpenServerSettings}
                canOpenServerSettings={canOpenServerSettings}
                onCreateChannel={onCreateChannel}
                onCreateCategory={onCreateCategory}
              />
              <hr className="m-0 w-full border border-t-0 border-white/5 bg-[#121214] p-0" />

              {/* Root Channels (No Category) */}
              <GuildSidebarCategory
                category={null}
                channels={guildChannels}
                activeChannelId={channelId}
                openCreateChannelDialog={() => onCreateChannel(null)}
                guild={guild}
                onEditChannel={onEditChannel}
                canManageChannels={canManageChannels}
                isDropTarget={dropTargetCategoryId === null && !!activeId}
                globalIsDragging={!!activeId}
              />

              {categories.map((category) => (
                <GuildSidebarCategory
                  key={category.channel_id || category.id}
                  category={category}
                  channels={guildChannels}
                  activeChannelId={channelId}
                  openCreateChannelDialog={() => onCreateChannel(category.channel_id)}
                  guild={guild}
                  onEditChannel={onEditChannel}
                  canManageChannels={canManageChannels}
                  isDropTarget={dropTargetCategoryId === category.channel_id}
                  globalIsDragging={!!activeId}
                />
              ))}
            </div>
            <UserBar />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {canManageChannels && (
            <ContextMenuItem onSelect={() => onCreateChannel(null)}>Create Channel</ContextMenuItem>
          )}
          {canManageChannels && (
            <ContextMenuItem onSelect={() => onCreateCategory()}>Create Category</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Drag overlay - floating ghost preview */}
      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: 'ease',
        }}
      >
        {activeChannel ? (
          <div className="w-[240px]" style={{ pointerEvents: 'none' }}>
            <ChannelRow
              channel={activeChannel}
              isActive={false}
              isUnread={false}
              mentionsCount={0}
              isDragOverlay={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default GuildSidebar;
