import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Fire, Plus, Compass, DiscordLogo, SignOut } from '@phosphor-icons/react';
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
import { useGuildsStore } from '@/ignite/store/guilds.store';
import GuildModal from '@/ignite/components/modals/GuildModal';
import { useUnreadsStore } from '@/ignite/store/unreads.store';
import { useChannelsStore } from '@/ignite/store/channels.store';
import { useUsersStore } from '@/ignite/store/users.store';
import Avatar from '@/ignite/components/Avatar';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { ChannelsService } from '@/ignite/services/channels.service';
import { GuildsService } from '@/ignite/services/guilds.service';
import { useGuildOrder } from '@/ignite/hooks/useGuildOrder';
import {
  isChannelUnread as checkChannelUnread,
  getChannelMentionCount as getChannelMentions,
} from '@/ignite/utils/unreads.utils';
import { useContextMenuStore } from '@/store/context-menu.store';
import GuildContextMenu from '@/ignite/components/context-menus/GuildContextMenu';
import DiscordGuildContextMenu from '@/discord/components/context-menus/DiscordGuildContextMenu';
import DiscordFolderContextMenu from '@/discord/components/context-menus/DiscordFolderContextMenu';
import InviteModal from '@/ignite/components/modals/InviteModal';
import { useModalStore } from '@/ignite/store/modal.store';
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
import { Button } from '@/components/ui/button';
import ConnectDiscordDialog from '../discord/components/ConnectDiscordDialog';
import { useDiscordStore } from '../discord/store/discord.store';
import { useDiscordGuildsStore } from '../discord/store/discord-guilds.store';
import { useDiscordChannelsStore } from '../discord/store/discord-channels.store';
import { useDiscordReadStatesStore } from '../discord/store/discord-readstates.store';
import { DiscordService } from '../discord/services/discord.service';
import { useDiscordRelationshipsStore, RelationshipType } from '../discord/store/discord-relationships.store';
import { useDiscordUsersStore } from '../discord/store/discord-users.store';
import { useDiscordVoiceStatesStore } from '../discord/store/discord-voice-states.store';
import { useDiscordGuildFoldersStore } from '../discord/store/discord-guild-folders.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import { ChannelType } from '@/ignite/constants/ChannelType';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SpeakerSimpleHigh, Monitor, FolderSimple } from '@phosphor-icons/react';
import GuildIcon from '@/ignite/components/GuildIcon';
import { Skeleton } from '@/components/ui/skeleton';

const SidebarIcon = ({
  icon = '',
  iconUrl = '',
  guild = null,
  isActive = false,
  isServerIcon = false,
  isDm = false,
  text = 'tooltip',
  isUnread = false,
  mentionCount = 0,
  tooltipContent = null,
}) => {
  const hasIcon = icon || iconUrl || guild?.icon_file_id;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative mb-2 min-w-min px-3">
          <div
            className={`absolute -left-1 top-1/2 block w-2 -translate-y-1/2 rounded-lg bg-white transition-all duration-200 ${isActive
              ? 'h-10'
              : `group-hover:h-5 ${isUnread ? 'h-2' : 'h-0'}`
              }`}
          />

          <div className="relative mx-auto h-12 w-12">
            <div
              className={`absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden ${isDm ? 'rounded-full' : `transition-all duration-300 ease-out ${isActive ? 'rounded-xl' : 'rounded-2xl hover:rounded-xl'} ${isServerIcon ? (hasIcon ? 'bg-[#1d1d1e] text-gray-100' : isActive ? 'bg-primary text-white' : 'bg-[#1d1d1e] text-gray-100 hover:bg-primary hover:text-white') : 'bg-[#1d1d1e] text-green-500 hover:bg-green-500 hover:text-white'}`}`}
            >
              {icon ? (
                icon
              ) : guild ? (
                <GuildIcon guild={guild} size={12} className="!rounded-none !bg-transparent" />
              ) : iconUrl ? (
                <img src={iconUrl} alt={text} className="size-full object-cover" />
              ) : (
                <span className="text-xl leading-none text-gray-400">{text.slice(0, 2)}</span>
              )}
            </div>

            {mentionCount > 0 && (
              <div className="absolute -bottom-1 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1a1a1e] bg-destructive px-1 text-[11px] font-bold text-white">
                {mentionCount > 99 ? '99+' : mentionCount}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-bold">
        {tooltipContent || text}
      </TooltipContent>
    </Tooltip>
  );
};

const SortableGuildIcon = ({ guild, isActive, isUnread, mentionCount, isDragging: globalDragging, onLeave, onInvite }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(guild.id),
  });
  const lastChannelId = useLastChannelStore((s) => s.lastChannels[guild.id]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 0 : 'auto',
  };

  const openContextMenu = (e) => {
    useContextMenuStore.getState().open(GuildContextMenu, {
      guild,
      onLeave: () => onLeave(guild),
      onInvite: () => onInvite(guild),
    }, e);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link
        to={`/channels/${guild.id}${lastChannelId ? `/${lastChannelId}` : ''}`}
        draggable="false"
        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
        onContextMenu={openContextMenu}
      >
        <SidebarIcon
          guild={guild}
          text={guild.name}
          isServerIcon={true}
          isActive={isActive}
          isUnread={isUnread}
          mentionCount={mentionCount}
        />
      </Link>
    </div>
  );
};

const DISCORD_EPOCH = 1420070400000;
const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

const VoiceAvatarStack = ({ voiceMembers }) => {
  const usersMap = useDiscordUsersStore((s) => s.users);
  const shown = voiceMembers.slice(0, 3);
  const extra = voiceMembers.length - 3;

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <SpeakerSimpleHigh size={16} weight="fill" className="shrink-0" />
      <div className="flex -space-x-1.5">
        {shown.map((vs) => {
          const user = usersMap[vs.user_id] || vs.member?.user;
          const avatarUrl = user
            ? DiscordService.getUserAvatarUrl(user.id, user.avatar, 32)
            : null;
          return (
            <div key={vs.user_id} className="size-5 overflow-hidden rounded-full ring-1 ring-[#1a1a1e]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" draggable="false" />
              ) : (
                <div className="flex size-full items-center justify-center bg-[#5865f2] text-[8px] font-bold text-white">
                  ?
                </div>
              )}
            </div>
          );
        })}
        {extra > 0 && (
          <div className="flex size-5 items-center justify-center rounded-full bg-[#2b2d31] text-[8px] font-bold text-gray-300 ring-1 ring-[#1a1a1e]">
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
};

const DiscordGuildIcon = ({ guild, isActive }) => {
  const iconUrl = DiscordService.getGuildIconUrl(guild.id, guild.properties.icon, 128);
  const channels = useDiscordChannelsStore((s) => s.channels);
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const lastChannelId = useLastChannelStore((s) => s.lastChannels[guild.id]);
  const guildVoiceStates = useDiscordVoiceStatesStore((s) => s.voiceStates[guild.id]);

  const joinedAtMs = useMemo(() => {
    return guild.joined_at ? new Date(guild.joined_at).getTime() : null;
  }, [guild.joined_at]);

  const { unread, mentions } = useMemo(() => {
    const guildChannels = channels.filter((c) => c.guild_id === guild.id);
    let hasUnread = false;
    let totalMentions = 0;
    for (const ch of guildChannels) {
      if (ch.last_message_id) {
        const entry = readStates[ch.id];
        if (entry?.last_message_id) {
          if (BigInt(ch.last_message_id) > BigInt(entry.last_message_id)) hasUnread = true;
        } else if (joinedAtMs && snowflakeToTimestamp(ch.last_message_id) > joinedAtMs) {
          hasUnread = true;
        }
      }
      totalMentions += readStates[ch.id]?.mention_count ?? 0;
    }
    return { unread: hasUnread, mentions: totalMentions };
  }, [channels, guild.id, readStates, joinedAtMs]);

  const currentDiscordUserId = useDiscordStore((s) => s.user?.id);

  const voiceMembers = useMemo(() => {
    if (!guildVoiceStates) return [];
    return Object.values(guildVoiceStates).filter((vs) => vs.channel_id);
  }, [guildVoiceStates]);

  const voiceBadge = useMemo(() => {
    if (voiceMembers.length === 0) return null;
    const selfInVoice = voiceMembers.some((vs) => vs.user_id === currentDiscordUserId);
    const hasScreenshare = voiceMembers.some((vs) => vs.self_stream);
    if (selfInVoice) return 'active';
    if (hasScreenshare) return 'screenshare';
    return 'idle';
  }, [voiceMembers, currentDiscordUserId]);

  const guildName = guild.properties.name || guild.id;

  const tooltipContent = voiceMembers.length > 0 ? (
    <div>
      <span>{guildName}</span>
      <VoiceAvatarStack voiceMembers={voiceMembers} />
    </div>
  ) : null;

  const openContextMenu = (e) => {
    useContextMenuStore.getState().open(DiscordGuildContextMenu, { guild }, e);
  };

  return (
    <Link to={`/discord/${guild.id}${lastChannelId ? `/${lastChannelId}` : ''}`} draggable="false" onContextMenu={openContextMenu}>
      <div className="relative">
        <SidebarIcon
          iconUrl={iconUrl || ''}
          text={guildName}
          isServerIcon={true}
          isActive={isActive}
          isUnread={unread}
          mentionCount={mentions}
          tooltipContent={tooltipContent}
        />
        {voiceBadge === 'active' && (
          <div className="absolute right-1.5 top-0 z-20 flex size-4 items-center justify-center rounded-full bg-[#248046] text-white shadow-md ring-2 ring-[#121214]">
            <SpeakerSimpleHigh size={9} weight="fill" />
          </div>
        )}
        {voiceBadge === 'screenshare' && (
          <div className="absolute right-1.5 top-0 z-20 flex size-4 items-center justify-center rounded-full bg-discord-secondary text-white shadow-md ring-2 ring-[#121214]">
            <Monitor size={9} weight="fill" />
          </div>
        )}
        {voiceBadge === 'idle' && (
          <div className="absolute right-1.5 top-0 z-20 flex size-4 items-center justify-center rounded-full bg-discord-secondary text-white shadow-md ring-2 ring-[#121214]">
            <SpeakerSimpleHigh size={9} weight="fill" />
          </div>
        )}
      </div>
    </Link>
  );
};

const DiscordFolderIcon = ({ folder, guilds, isExpanded, onToggle, totalMentions, hasUnread }) => {
  // Show a mini grid of up to 4 guild icons when collapsed
  const folderColor = folder.color != null ? `#${folder.color.toString(16).padStart(6, '0')}` : '#5865f2';
  const folderName = folder.name || 'Server Folder';

  const openContextMenu = (e) => {
    e.preventDefault();
    useContextMenuStore.getState().open(DiscordFolderContextMenu, { folder }, e);
  };

  if (isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group relative mb-2 min-w-min px-3" onContextMenu={openContextMenu}>
            <div className="relative mx-auto h-12 w-12">
              <button
                type="button"
                onClick={onToggle}
                className="absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#1d1d1e] transition-all duration-300 ease-out hover:rounded-xl"
              >
                <FolderSimple size={24} weight="fill" style={{ color: folderColor }} />
              </button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-bold">
          {folderName}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Collapsed: show 2x2 mini grid of guild icons
  const previewGuilds = guilds.slice(0, 4);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative mb-2 min-w-min px-3" onContextMenu={openContextMenu}>
          <div
            className={`absolute -left-1 top-1/2 block w-2 -translate-y-1/2 rounded-lg bg-white transition-all duration-200 ${
              hasUnread ? 'h-2 group-hover:h-5' : 'h-0 group-hover:h-5'
            }`}
          />
          <div className="relative mx-auto h-12 w-12">
            <button
              type="button"
              onClick={onToggle}
              className="absolute inset-0 grid cursor-pointer grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl p-2 transition-all duration-300 ease-out hover:rounded-xl"
              style={{ backgroundColor: `${folderColor}20` }}
            >
              {previewGuilds.map((g) => {
                const iconUrl = DiscordService.getGuildIconUrl(g.id, g.properties?.icon, 64);
                return iconUrl ? (
                  <img key={g.id} src={iconUrl} alt="" className="size-4 rounded-sm object-cover" />
                ) : (
                  <div key={g.id} className="flex size-4 items-center justify-center rounded-sm bg-[#2b2d31] text-[6px] font-bold text-gray-400">
                    {(g.properties?.name || '?').charAt(0)}
                  </div>
                );
              })}
            </button>
            {totalMentions > 0 && (
              <div className="absolute -bottom-1 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1a1a1e] bg-destructive px-1 text-[11px] font-bold text-white">
                {totalMentions > 99 ? '99+' : totalMentions}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-bold">
        {folderName}
      </TooltipContent>
    </Tooltip>
  );
};

const DiscordGuildFolderGroup = ({ folder, guilds, activeGuildPath, renderGuildItem, isMergeTarget, folderHeaderRef }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const channels = useDiscordChannelsStore((s) => s.channels);
  const readStates = useDiscordReadStatesStore((s) => s.readStates);

  const { totalMentions, hasUnread } = useMemo(() => {
    let mentions = 0;
    let unread = false;
    for (const guild of guilds) {
      const guildChannels = channels.filter((c) => c.guild_id === guild.id);
      const joinedAtMs = guild.joined_at ? new Date(guild.joined_at).getTime() : null;
      for (const ch of guildChannels) {
        if (ch.last_message_id) {
          const entry = readStates[ch.id];
          if (entry?.last_message_id) {
            if (BigInt(ch.last_message_id) > BigInt(entry.last_message_id)) unread = true;
          } else if (joinedAtMs && snowflakeToTimestamp(ch.last_message_id) > joinedAtMs) {
            unread = true;
          }
        }
        mentions += readStates[ch.id]?.mention_count ?? 0;
      }
    }
    return { totalMentions: mentions, hasUnread: unread };
  }, [guilds, channels, readStates]);

  // Auto-expand if a guild in this folder is active
  const hasActiveGuild = guilds.some((g) => activeGuildPath.startsWith(`/discord/${g.id}`));

  useEffect(() => {
    if (hasActiveGuild && !isExpanded) {
      setIsExpanded(true);
    }
  }, [hasActiveGuild]);

  const folderColor = folder.color != null ? `#${folder.color.toString(16).padStart(6, '0')}` : '#5865f2';

  return (
    <div>
      <div ref={folderHeaderRef} className="relative">
        {isMergeTarget && (
          <div className="pointer-events-none absolute -left-0.5 top-1/2 z-10 size-3 -translate-y-1/2 rounded-full bg-green-500" />
        )}
        <DiscordFolderIcon
          folder={folder}
          guilds={guilds}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
          totalMentions={totalMentions}
          hasUnread={hasUnread}
        />
      </div>
      {isExpanded && (
        <div className="relative mb-1">
          {/* Colored background pill behind guild icons */}
          <div
            className="absolute left-1/2 -top-1 -bottom-1 -translate-x-1/2 rounded-[20px]"
            style={{
              width: 56,
              backgroundColor: `${folderColor}25`,
            }}
          />
          {renderGuildItem
            ? guilds.map((guild) => renderGuildItem(guild))
            : guilds.map((guild) => (
                <DiscordGuildIcon
                  key={`discord-${guild.id}`}
                  guild={guild}
                  isActive={activeGuildPath.startsWith(`/discord/${guild.id}`)}
                />
              ))}
        </div>
      )}
    </div>
  );
};

/**
 * Custom drag-and-drop for Discord guilds/folders.
 * No SortableContext — items stay static. Visual indicators show drop targets:
 * - Green line between items = insert here
 * - Green dot on folder = drop into folder
 */
const DiscordGuildsDnd = ({ entries, folders, pathname }) => {
  const [draggingGuildId, setDraggingGuildId] = useState(null);
  // dropTarget: { type: 'between', entryIndex } or { type: 'folder', folderId } or { type: 'within-folder', folderId, afterGuildId } or null
  const [dropTarget, setDropTarget] = useState(null);
  const containerRef = useRef(null);
  const itemRefsMap = useRef({});

  // Build a flat list of all rendered items with their refs and metadata
  const flatItems = useMemo(() => {
    const items = [];
    for (let ei = 0; ei < entries.length; ei++) {
      const entry = entries[ei];
      if (entry.type === 'guild') {
        items.push({ kind: 'guild', guildId: entry.guild.id, guild: entry.guild, folderId: null, entryIndex: ei });
      } else if (entry.type === 'folder') {
        items.push({ kind: 'folder-header', folderId: entry.folder.id, folder: entry.folder, entryIndex: ei });
        for (const guild of entry.guilds) {
          items.push({ kind: 'guild', guildId: guild.id, guild, folderId: entry.folder.id, entryIndex: ei });
        }
      }
    }
    return items;
  }, [entries]);

  const setItemRef = useCallback((key, el) => {
    if (el) itemRefsMap.current[key] = el;
    else delete itemRefsMap.current[key];
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!draggingGuildId || !containerRef.current) return;

    const mouseY = e.clientY;

    // Find the closest item the pointer is over
    let bestTarget = null;
    let bestDist = Infinity;

    for (const item of flatItems) {
      if (item.kind === 'guild' && item.guildId === draggingGuildId) continue;

      const key = item.kind === 'folder-header' ? `fh-${item.folderId}` : `gi-${item.guildId}`;
      const el = itemRefsMap.current[key];
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(mouseY - center);

      if (dist < bestDist) {
        bestDist = dist;
        const h = rect.height;
        // How far from center (0 = center, 1 = edge)
        const fromCenter = Math.abs(mouseY - center) / (h / 2);

        if (item.kind === 'folder-header') {
          // Folder header: inner 50% = merge into folder, outer = insert before/after
          if (fromCenter <= 0.5) {
            bestTarget = { type: 'folder', folderId: item.folderId, key };
          } else if (mouseY < center) {
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position: 'before', key };
          } else {
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position: 'after', key };
          }
        } else if (item.folderId) {
          // Guild inside a folder: inner 50% = stay in folder (reorder), outer = insert before/after in folder
          if (mouseY < center) {
            bestTarget = { type: 'within-folder', folderId: item.folderId, beforeGuildId: item.guildId, key };
          } else {
            bestTarget = { type: 'within-folder', folderId: item.folderId, afterGuildId: item.guildId, key };
          }
        } else {
          // Standalone guild: inner 50% = create folder together, outer = insert before/after
          if (fromCenter <= 0.5) {
            bestTarget = { type: 'merge-guild', targetGuildId: item.guildId, entryIndex: item.entryIndex, key };
          } else if (mouseY < center) {
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position: 'before', key };
          } else {
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position: 'after', key };
          }
        }
      }
    }

    setDropTarget(bestTarget);
  }, [draggingGuildId, flatItems]);

  const handlePointerUp = useCallback(() => {
    if (!draggingGuildId || !dropTarget) {
      setDraggingGuildId(null);
      setDropTarget(null);
      return;
    }

    const store = useDiscordGuildFoldersStore.getState();
    const draggedMeta = flatItems.find((i) => i.kind === 'guild' && i.guildId === draggingGuildId);

    if (dropTarget.type === 'merge-guild') {
      // Merge two guilds into a new folder
      store.createFolderFromGuilds(draggingGuildId, dropTarget.targetGuildId);
    } else if (dropTarget.type === 'folder') {
      // Drop into existing folder
      if (draggedMeta?.folderId !== dropTarget.folderId) {
        store.addGuildToFolder(draggingGuildId, dropTarget.folderId);
      }
    } else if (dropTarget.type === 'within-folder') {
      if (draggedMeta?.folderId === dropTarget.folderId) {
        // Reorder within same folder
        const targetGuildId = dropTarget.afterGuildId || dropTarget.beforeGuildId;
        if (targetGuildId && targetGuildId !== draggingGuildId) {
          store.reorderWithinFolder(dropTarget.folderId, draggingGuildId, targetGuildId);
        }
      } else {
        // Move into this folder
        store.addGuildToFolder(draggingGuildId, dropTarget.folderId);
      }
    } else if (dropTarget.type === 'between') {
      let insertIdx = dropTarget.position === 'after' ? dropTarget.entryIndex + 1 : dropTarget.entryIndex;
      if (draggedMeta?.folderId) {
        // Pull out of folder — adjust if dragged item's folder is before the insert point
        store.removeGuildFromFolder(draggingGuildId, insertIdx);
      } else if (draggedMeta) {
        // Reorder standalone — convert insert position to a move target
        // After removing from `fromIndex`, indices shift, so adjust
        const fromIdx = draggedMeta.entryIndex;
        if (fromIdx < insertIdx) insertIdx--;
        if (fromIdx !== insertIdx) {
          store.reorderFolders(fromIdx, insertIdx);
        }
      }
    }

    setDraggingGuildId(null);
    setDropTarget(null);
  }, [draggingGuildId, dropTarget, flatItems]);

  useEffect(() => {
    if (!draggingGuildId) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingGuildId, handlePointerMove, handlePointerUp]);

  const startDrag = useCallback((guildId, e) => {
    e.preventDefault();
    setDraggingGuildId(guildId);
    setDropTarget(null);
  }, []);

  // Determine indicator for a standalone guild: 'before', 'after', 'merge', or null
  const getIndicator = (guildId) => {
    if (!dropTarget || !draggingGuildId) return null;
    if (dropTarget.type === 'between' && dropTarget.key === `gi-${guildId}`) {
      return dropTarget.position; // 'before' or 'after'
    }
    if (dropTarget.type === 'merge-guild' && dropTarget.targetGuildId === guildId) {
      return 'merge';
    }
    return null;
  };

  const isFolderMergeTarget = (folderId) => {
    if (!dropTarget || !draggingGuildId) return false;
    if (dropTarget.type === 'folder' && dropTarget.folderId === folderId) return true;
    return false;
  };

  const getWithinFolderIndicator = (guildId, folderId) => {
    if (!dropTarget || dropTarget.type !== 'within-folder') return null;
    if (dropTarget.folderId !== folderId) return null;
    if (dropTarget.beforeGuildId === guildId) return 'before';
    if (dropTarget.afterGuildId === guildId) return 'after';
    return null;
  };

  // Indicator for folder entries (before/after the whole folder)
  const getFolderIndicator = (folderId) => {
    if (!dropTarget || !draggingGuildId) return null;
    if (dropTarget.type === 'between' && dropTarget.key === `fh-${folderId}`) {
      return dropTarget.position;
    }
    return null;
  };

  const GreenLine = () => (
    <div className="flex items-center justify-center py-1">
      <div className="h-[3px] w-10 rounded-full bg-green-500" />
    </div>
  );

  return (
    <div ref={containerRef}>
      {entries.map((entry, ei) => {
        if (entry.type === 'guild') {
          const isDragging = draggingGuildId === entry.guild.id;
          const indicator = getIndicator(entry.guild.id);
          return (
            <div key={`dg-${entry.guild.id}`}>
              {indicator === 'before' && <GreenLine />}
              <div
                ref={(el) => setItemRef(`gi-${entry.guild.id}`, el)}
                onPointerDown={(e) => startDrag(entry.guild.id, e)}
                className="relative"
                style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab', userSelect: 'none' }}
              >
                {indicator === 'merge' && (
                  <div className="pointer-events-none absolute -left-0.5 top-1/2 z-10 size-3 -translate-y-1/2 rounded-full bg-green-500" />
                )}
                <DiscordGuildIcon
                  guild={entry.guild}
                  isActive={pathname.startsWith(`/discord/${entry.guild.id}`)}
                />
              </div>
              {indicator === 'after' && <GreenLine />}
            </div>
          );
        }

        // Folder
        const folderMerge = isFolderMergeTarget(entry.folder.id);
        const folderIndicator = getFolderIndicator(entry.folder.id);
        return (
          <div key={`folder-${entry.folder.id}`}>
            {folderIndicator === 'before' && <GreenLine />}
            <DiscordGuildFolderGroup
              folder={entry.folder}
              guilds={entry.guilds}
              activeGuildPath={pathname}
              isMergeTarget={folderMerge}
              renderGuildItem={(guild) => {
                const isDragging = draggingGuildId === guild.id;
                const indicator = getWithinFolderIndicator(guild.id, entry.folder.id);
                return (
                  <div key={`dg-${guild.id}`}>
                    {indicator === 'before' && <GreenLine />}
                    <div
                      ref={(el) => setItemRef(`gi-${guild.id}`, el)}
                      onPointerDown={(e) => startDrag(guild.id, e)}
                      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab', userSelect: 'none' }}
                    >
                      <DiscordGuildIcon
                        guild={guild}
                        isActive={pathname.startsWith(`/discord/${guild.id}`)}
                      />
                    </div>
                    {indicator === 'after' && <GreenLine />}
                  </div>
                );
              }}
              folderHeaderRef={(el) => setItemRef(`fh-${entry.folder.id}`, el)}
            />
            {folderIndicator === 'after' && <GreenLine />}
          </div>
        );
      })}
    </div>
  );
};

const GuildsSidebar = () => {
  const { guildId, channelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUsersStore((s) => s.getCurrentUser());
  const { guilds } = useGuildsStore();
  const hasIgniteToken = !!localStorage.getItem('token');
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { channels, channelMessages } = useChannelsStore();
  const { requests } = useFriendsStore();
  const [activeId, setActiveId] = useState(null);
  const [leaveGuild, setLeaveGuild] = useState(null);
  const [isDiscordDialogOpen, setIsDiscordDialogOpen] = useState(false);
  const [isDiscordLogoutOpen, setIsDiscordLogoutOpen] = useState(false);
  const lastDmChannelId = useLastChannelStore((s) => s.lastChannels['@me']);

  // Discord state
  const { token: discordToken, isConnected: discordConnected, user: discordUser } = useDiscordStore();
  const { guilds: discordGuilds } = useDiscordGuildsStore();
  const discordGuildFolders = useDiscordGuildFoldersStore((s) => s.folders);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordChannelMessages = useDiscordChannelsStore((s) => s.channelMessages);
  const discordReadStates = useDiscordReadStatesStore((s) => s.readStates);

  // Build ordered Discord sidebar entries from guild folders
  const discordSidebarEntries = useMemo(() => {
    if (!discordConnected || discordGuilds.length === 0) return [];

    const guildsById = {};
    for (const g of discordGuilds) {
      guildsById[g.id] = g;
    }

    // If we have folder data, use it for ordering
    if (discordGuildFolders.length > 0) {
      const entries = [];
      const placed = new Set();

      for (const folder of discordGuildFolders) {
        const folderGuilds = folder.guild_ids
          .map((id) => guildsById[id])
          .filter(Boolean);

        for (const g of folderGuilds) placed.add(g.id);

        if (folderGuilds.length === 0) continue;

        // id !== null = real folder, id === null = standalone guild
        if (folder.id != null) {
          entries.push({ type: 'folder', folder, guilds: folderGuilds });
        } else {
          for (const g of folderGuilds) {
            entries.push({ type: 'guild', guild: g });
          }
        }
      }

      // Any guilds not in folders (shouldn't happen but be safe)
      for (const g of discordGuilds) {
        if (!placed.has(g.id)) {
          entries.push({ type: 'guild', guild: g });
        }
      }

      return entries;
    }

    // No folder data — render guilds in original order
    return discordGuilds.map((g) => ({ type: 'guild', guild: g }));
  }, [discordConnected, discordGuilds, discordGuildFolders]);

  // Auto-connect to Discord if token exists
  useEffect(() => {
    if (discordToken && !discordConnected) {
      DiscordService.connect();
    }
  }, [discordToken, discordConnected]);

  const { orderedGuilds, reorder } = useGuildOrder(guilds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeGuild = useMemo(() => {
    if (!activeId) return null;
    return guilds.find((g) => String(g.id) === String(activeId));
  }, [activeId, guilds]);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(active.id, over.id);
  };

  const handleDragCancel = () => setActiveId(null);

  const isChannelUnread = useCallback(
    (channel) => checkChannelUnread(channel, channelUnreads, channelUnreadsLoaded),
    [channelUnreads, channelUnreadsLoaded]
  );

  const getChannelMentionCount = useCallback(
    (channelId) => getChannelMentions(channelId, channelUnreads, channelUnreadsLoaded),
    [channelUnreads, channelUnreadsLoaded]
  );

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
        if (isChannelUnread(channel)) return true;
      }
      return false;
    },
    [channels, isChannelUnread]
  );

  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);

  const pendingCount = useMemo(() => {
    const igniteCount = user
      ? requests.filter((req) => req.sender_id != user.id).length
      : 0;
    const discordCount = discordConnected
      ? discordRelationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length
      : 0;
    const discordMessageRequestCount = discordConnected
      ? discordChannels.filter((c) => (c.type === 1 || c.type === 3) && c.is_message_request).length
      : 0;
    return igniteCount + discordCount + discordMessageRequestCount;
  }, [requests, user, discordConnected, discordRelationships, discordChannels]);

  const unreadDmChannels = useMemo(() => {
    if (!channelUnreadsLoaded || !user) return [];

    return channels
      .filter((c) => c.type === ChannelType.DM && isChannelUnread(c))
      .map((channel) => {
        const otherUser =
          (channel.recipients || []).find((r) => r.id !== user.id) ||
          channel.user || { username: 'Unknown' };

        const messages = channelMessages[channel.channel_id];
        if (!messages || messages.length === 0) {
          ChannelsService.loadChannelMessages(channel.channel_id);
        }

        let unreadCount = messages?.length || 0;
        const channelUnread = channelUnreads.find(
          (cu) => String(cu.channel_id) === String(channel.channel_id)
        );

        if (channelUnread?.last_read_message_id && messages?.length > 0) {
          const lastReadId = BigInt(channelUnread.last_read_message_id);
          unreadCount = messages.filter((msg) => {
            try {
              return BigInt(msg.id) > lastReadId;
            } catch {
              return false;
            }
          }).length;
        }

        return { ...channel, otherUser, unreadCount: unreadCount > 0 ? unreadCount : 1 };
      });
  }, [channelUnreadsLoaded, channels, channelUnreads, channelMessages, user]);

  const unreadDiscordDmChannels = useMemo(() => {
    if (!discordConnected || !discordUser) return [];

    return discordChannels
      .filter((c) => (c.type === 1 || c.type === 3) && c.last_message_id)
      .filter((c) => {
        const entry = discordReadStates[c.id];
        return !entry?.last_message_id || c.last_message_id > entry.last_message_id;
      })
      .map((channel) => {
        const recipientIds = channel.recipient_ids || [];
        const entry = discordReadStates[channel.id];

        // Count unread messages from loaded messages
        const messages = discordChannelMessages[channel.id];
        let unreadCount = 0;
        if (entry?.last_message_id && messages?.length > 0) {
          unreadCount = messages.filter((msg) => msg.id > entry.last_message_id).length;
        }
        if (unreadCount === 0) unreadCount = 1; // fallback if messages aren't loaded

        let name, icon;
        if (channel.type === 3) {
          const recipients = recipientIds.map((id) => discordUsersMap[id]).filter(Boolean);
          name = channel.name || recipients.map((r) => r.global_name || r.username).join(', ');
          icon = channel.icon
            ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64`
            : null;
        } else {
          const otherId = recipientIds.find((id) => id !== discordUser.id) || recipientIds[0];
          const other = otherId ? discordUsersMap[otherId] : null;
          name = other?.global_name || other?.username || 'Unknown User';
          icon = other ? DiscordService.getUserAvatarUrl(other.id, other.avatar, 64) : null;
        }

        return { id: channel.id, name, icon, mentionCount: unreadCount };
      });
  }, [discordConnected, discordUser, discordChannels, discordReadStates, discordUsersMap, discordChannelMessages]);

  const confirmLeave = async () => {
    if (!leaveGuild?.id) return;
    try {
      await GuildsService.leaveGuild(leaveGuild.id);
      navigate('/channels/@me');
    } catch (err) {
      console.error(err);
    } finally {
      setLeaveGuild(null);
    }
  };

  return (
    <>
      <div className="scrollbar-none relative left-0 top-0 m-0 flex h-full min-w-min flex-col items-center overflow-y-auto bg-[#121214] pb-36 text-white shadow">
        {/* Home / Friends */}
        <Link to={lastDmChannelId ? `/channels/@me/${lastDmChannelId}` : '/channels/@me'}>
          <SidebarIcon
            icon={<Fire className="size-6" />}
            text="Friends"
            isServerIcon={true}
            isActive={!guildId}
            mentionCount={pendingCount}
          />
        </Link>

        {/* Unread DMs */}
        {hasIgniteToken && unreadDmChannels.map((dm) => (
          <Link key={dm.channel_id} to={`/channels/@me/${dm.channel_id}`}>
            <SidebarIcon
              icon={<Avatar user={dm.otherUser} className="size-full" />}
              text={dm.otherUser.name}
              isServerIcon={true}
              isDm={true}
              isActive={channelId === dm.channel_id}
              isUnread={true}
              mentionCount={dm.unreadCount}
            />
          </Link>
        ))}
        {unreadDiscordDmChannels.map((dm) => (
          <Link key={`discord-dm-${dm.id}`} to={`/channels/@me/${dm.id}`}>
            <SidebarIcon
              iconUrl={dm.icon || ''}
              text={dm.name}
              isServerIcon={true}
              isDm={true}
              isActive={channelId === dm.id}
              isUnread={true}
              mentionCount={dm.mentionCount}
            />
          </Link>
        ))}

        {hasIgniteToken && (
          <hr className="mx-auto mb-2 w-8 rounded-full border-1 border-white/5 bg-gray-800" />
        )}

        {/* Guilds — drag-to-reorder */}
        {hasIgniteToken && orderedGuilds.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-2 flex justify-center px-3">
              <Skeleton className="size-12 rounded-2xl" />
            </div>
          ))}
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
                onLeave={setLeaveGuild}
                onInvite={(g) => useModalStore.getState().push(InviteModal, { guildId: g.id })}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeGuild ? (
              <div style={{ pointerEvents: 'none' }}>
                <SidebarIcon
                  guild={activeGuild}
                  text={activeGuild.name}
                  isServerIcon={true}
                  isActive={false}
                  isUnread={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />

        {/* Discord */}
        {discordToken && (
          <>
            {discordConnected ? (
              <DiscordGuildsDnd
                entries={discordSidebarEntries}
                folders={discordGuildFolders}
                pathname={location.pathname}
              />
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="mb-2 flex justify-center px-3">
                  <Skeleton className="size-12 rounded-2xl" />
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => setIsDiscordLogoutOpen(true)}
            >
              <SidebarIcon
                icon={<SignOut className="size-5" />}
                text="Disconnect Discord"
              />
            </button>
          </>
        )}

        {!discordToken && (
          <>
            <button
              type="button"
              onClick={() => setIsDiscordDialogOpen(true)}
            >
              <SidebarIcon
                icon={<DiscordLogo className="size-6" />}
                text="Connect Discord"
              />
            </button>
          </>
        )}

        {hasIgniteToken && (
          <>
            <button type="button" onClick={() => useModalStore.getState().push(GuildModal)}>
              <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
            </button>
            <Link to="/guild-discovery">
              <SidebarIcon icon={<Compass className="size-6" />} text="Discover Servers" />
            </Link>
          </>
        )}
      </div>

      <ConnectDiscordDialog
        open={isDiscordDialogOpen}
        onOpenChange={setIsDiscordDialogOpen}
      />

      <AlertDialog open={isDiscordLogoutOpen} onOpenChange={setIsDiscordLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Discord</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your Discord account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                DiscordService.logout();
                navigate(hasIgniteToken ? '/channels/@me' : '/login');
              }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!leaveGuild} onOpenChange={(open) => !open && setLeaveGuild(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave &apos;{leaveGuild?.name}&apos;</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave <span className="font-bold text-white">{leaveGuild?.name}</span>? You won&apos;t be
              able to rejoin this server unless you are re-invited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeave}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Leave Server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GuildsSidebar;
