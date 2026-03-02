import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, CaretDown, CaretRight } from '@phosphor-icons/react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import api from '@/ignite/api';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUnreadsStore } from '@/ignite/store/unreads.store';
import { UnreadsService } from '@/ignite/services/unreads.service';
import { isChannelUnread as checkChannelUnread, getChannelMentionCount as getChannelMentions } from '@/ignite/utils/unreads.utils';
import { ChannelsService } from '@/ignite/services/channels.service';
import { useChannelsStore } from '@/ignite/store/channels.store';
import { useVoiceStore } from '@/ignite/store/voice.store';
import { ChannelType } from '@/ignite/constants/ChannelType';
import { scrollPositions } from '@/store/last-channel.store';
import ChannelItem from '@/ignite/components/channel/ChannelItem';
import ChannelRow from '@/ignite/components/channel/ChannelRow';
import GuildSidebarHeader from './GuildSidebarHeader';

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
  overId,
  activeId,
  dropPosition,
}) => {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const sectionName = category?.name;
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { channelId: voiceChannelId, voiceStates } = useVoiceStore();

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

  const [pendingDeleteChannel, setPendingDeleteChannel] = useState(null);

  const handleDeleteChannel = useCallback(
    (channel) => {
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
      setPendingDeleteChannel(channel);
    },
    [canManageChannels, guild?.id, channels]
  );

  const confirmDeleteChannel = useCallback(() => {
    if (pendingDeleteChannel && guild?.id) {
      ChannelsService.deleteGuildChannel(guild.id, pendingDeleteChannel.channel_id);
    }
    setPendingDeleteChannel(null);
  }, [pendingDeleteChannel, guild?.id]);

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
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => onEditChannel?.(category)}>
                  Edit Category
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => handleDeleteChannel(category)}
                  className="text-red-500 hover:bg-red-600/20"
                >
                  Delete Category
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      )}

      {/* Drop indicator when dropping directly on category header */}
      {overId === category?.channel_id && activeId && category && (
        <div className="mx-2 my-1 h-0.5 rounded-full bg-primary" />
      )}

      <SortableContext
        items={sortedChannels.map((c) => c.channel_id)}
        strategy={verticalListSortingStrategy}
      >
        {sortedChannels.map((channel, index) => {
          const isUnread =
            channel.type === ChannelType.GUILD_VOICE ? false : isChannelUnread(channel);
          const isActive =
            channel.type === ChannelType.GUILD_VOICE
              ? channel.channel_id == activeChannelId ||
                voiceChannelId === String(channel.channel_id)
              : channel.channel_id == activeChannelId;
          const mentionsCount =
            channel.type === ChannelType.GUILD_VOICE ? 0 : getMentionsCount(channel);

          const dropIndicator = (channel.channel_id === overId && activeId) ? dropPosition : null;

          return (
            <ChannelItem
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
              dropIndicator={dropIndicator}
              voiceParticipants={
                channel.type === ChannelType.GUILD_VOICE
                  ? voiceStates.filter((vs) => String(vs.channel_id) === String(channel.channel_id))
                  : []
              }
            />
          );
        })}
      </SortableContext>

      <AlertDialog
        open={!!pendingDeleteChannel}
        onOpenChange={(open) => { if (!open) setPendingDeleteChannel(null); }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteChannel}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const GuildChannelsSidebar = ({
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
  const [dropPosition, setDropPosition] = useState(null);
  const dropPositionRef = useRef(null);
  const sidebarRef = useRef();

  const guildChannels = useMemo(() => {
    return (channels || []).filter((c) => String(c.guild_id) === String(guild?.id));
  }, [channels, guild?.id]);

  const categories = (guildChannels || []).filter((c) => c.type === 3);

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

  // Save sidebar scroll position on every scroll
  const onSidebarScroll = useCallback(() => {
    if (guild?.id && sidebarRef.current) {
      scrollPositions.saveSidebar(guild.id, sidebarRef.current.scrollTop);
    }
  }, [guild?.id]);

  // Restore sidebar scroll position when guild changes
  useEffect(() => {
    if (!guild?.id) return;
    const saved = scrollPositions.getSidebar(guild.id);
    if (saved != null) {
      requestAnimationFrame(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = saved;
        }
      });
    }
  }, [guild?.id]);

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
    const { over, active } = event;
    setOverId(over?.id || null);

    if (over && active) {
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      if (activeRect && overRect) {
        const activeCenter = activeRect.top + activeRect.height / 2;
        const overCenter = overRect.top + overRect.height / 2;
        const pos = activeCenter > overCenter ? 'below' : 'above';
        setDropPosition(pos);
        dropPositionRef.current = pos;
      }
    } else {
      setDropPosition(null);
      dropPositionRef.current = null;
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    setDropPosition(null);
    dropPositionRef.current = null;
  };

  const handleDragEnd = async (event) => {
    const currentDropPosition = dropPositionRef.current;
    setActiveId(null);
    setOverId(null);
    setDropPosition(null);
    dropPositionRef.current = null;

    const { active, over } = event;

    if (!over || active.id === over.id || !canManageChannels) {
      return;
    }

    const activeChannel = channels.find((c) => c.channel_id === active.id);
    const overChannel = channels.find((c) => c.channel_id === over.id);

    if (!activeChannel || !overChannel) return;

    // Determine target category
    const targetParentId = overChannel.type === 3
      ? overChannel.channel_id
      : overChannel.parent_id;
    const oldParentId = activeChannel.parent_id;

    // Helper: sort channels by position then name
    const sortByPosition = (a, b) => {
      const aPos = Number(a.position ?? 0);
      const bPos = Number(b.position ?? 0);
      if (aPos === bPos) {
        return String(a.name || a.channel_name || '').localeCompare(
          String(b.name || b.channel_name || '')
        );
      }
      return aPos - bPos;
    };

    // Get sorted channels of the target category, excluding the dragged channel
    const targetChannels = channels
      .filter(
        (c) =>
          c.channel_id !== active.id &&
          // eslint-disable-next-line eqeqeq
          c.parent_id == targetParentId &&
          (c.type === ChannelType.GUILD_TEXT || c.type === ChannelType.GUILD_VOICE)
      )
      .sort(sortByPosition);

    // Determine insertion index
    let insertIndex;
    if (overChannel.type === 3) {
      // Dropped on category header → insert at top of category
      insertIndex = 0;
    } else {
      const overIndex = targetChannels.findIndex((c) => c.channel_id === over.id);
      if (overIndex === -1) {
        insertIndex = targetChannels.length;
      } else {
        insertIndex = currentDropPosition === 'below' ? overIndex + 1 : overIndex;
      }
    }

    // Build the new ordered list for the target category
    const newOrderedTarget = [...targetChannels];
    newOrderedTarget.splice(insertIndex, 0, { ...activeChannel, parent_id: targetParentId });

    // eslint-disable-next-line eqeqeq
    const isCrossCategory = oldParentId != targetParentId;

    // Prepare API payload
    const payload = newOrderedTarget.map((c, idx) => ({
      id: c.channel_id,
      position: idx,
      parent_id: targetParentId,
    }));

    if (isCrossCategory) {
      const oldCategorySiblings = channels
        .filter(
          (c) =>
            c.channel_id !== active.id &&
            // eslint-disable-next-line eqeqeq
            c.parent_id == oldParentId &&
            (c.type === ChannelType.GUILD_TEXT || c.type === ChannelType.GUILD_VOICE)
        )
        .sort(sortByPosition);

      oldCategorySiblings.forEach((c, idx) => {
        payload.push({
          id: c.channel_id,
          position: idx,
          parent_id: oldParentId,
        });
      });
    }

    try {
      await api.patch(`/guilds/${guild.id}/channels`, payload);
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
          <div className="relative top-0 flex h-full w-80 flex-col bg-[#121214] text-gray-100 select-none">
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pb-36" ref={sidebarRef} onScroll={onSidebarScroll}>
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
                overId={overId}
                activeId={activeId}
                dropPosition={dropPosition}
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
                  overId={overId}
                  activeId={activeId}
                  dropPosition={dropPosition}
                />
              ))}
            </div>
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

      <DragOverlay dropAnimation={null}>
        {activeId ? (() => {
          const ch = guildChannels.find((c) => c.channel_id === activeId);
          return ch ? (
            <div className="w-[240px] rounded bg-[#1e1f22] shadow-lg">
              <ChannelRow channel={ch} isActive={false} isUnread={false} mentionsCount={0} />
            </div>
          ) : null;
        })() : null}
      </DragOverlay>
    </DndContext>
  );
};

export default GuildChannelsSidebar;
