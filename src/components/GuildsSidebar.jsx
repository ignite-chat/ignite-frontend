import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Fire, Plus, Compass, DiscordLogo, TelegramLogo, SignOut, Power } from '@phosphor-icons/react';
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
import DiscordUserContextMenu from '@/discord/components/context-menus/DiscordUserContextMenu';
import { useDiscordPreferencesStore } from '../discord/store/discord-preferences.store';
import { snowflakeToTimestamp } from '../discord/utils/snowflake';
import { useLastChannelStore } from '@/store/last-channel.store';
import { ChannelType } from '@/ignite/constants/ChannelType';
import ConnectTelegramDialog from '../telegram/components/ConnectTelegramDialog';
import { useTelegramStore } from '../telegram/store/telegram.store';
import { useTelegramChatsStore } from '../telegram/store/telegram-chats.store';
import { TelegramService } from '../telegram/services/telegram.service';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { SpeakerSimpleHigh, Monitor, FolderSimple, Megaphone, UsersThree } from '@phosphor-icons/react';
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

  const currentDiscordUserId = guild._accountId || useDiscordStore.getState().user?.id;

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
 * Items stay static. Visual indicators show drop targets:
 * - Green line between items = insert here
 * - Green dot on folder/guild = merge into folder
 */
const DiscordGuildsDnd = ({ entries, folders, pathname }) => {
  const [draggingGuildId, setDraggingGuildId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const containerRef = useRef(null);
  const itemRefsMap = useRef({});
  const dragTimerRef = useRef(null);

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
    const draggedMeta = flatItems.find((i) => i.kind === 'guild' && i.guildId === draggingGuildId);

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
        const fromCenter = Math.abs(mouseY - center) / (rect.height / 2);

        if (item.kind === 'folder-header') {
          if (fromCenter <= 0.5) {
            bestTarget = { type: 'folder', folderId: item.folderId, key };
          } else if (mouseY < center) {
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position: 'before', key };
          } else {
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position: 'after', key };
          }
        } else if (item.folderId) {
          if (mouseY < center) {
            bestTarget = { type: 'within-folder', folderId: item.folderId, beforeGuildId: item.guildId, key };
          } else {
            bestTarget = { type: 'within-folder', folderId: item.folderId, afterGuildId: item.guildId, key };
          }
        } else {
          if (fromCenter <= 0.3) {
            bestTarget = { type: 'merge-guild', targetGuildId: item.guildId, entryIndex: item.entryIndex, key };
          } else {
            let position = mouseY < center ? 'before' : 'after';
            bestTarget = { type: 'between', entryIndex: item.entryIndex, position, key };
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
      console.log(dropTarget);

    if (dropTarget.type === 'merge-guild') {
      store.createFolderFromGuilds(draggingGuildId, dropTarget.targetGuildId);
    } else if (dropTarget.type === 'folder') {
      if (draggedMeta?.folderId !== dropTarget.folderId) {
        store.addGuildToFolder(draggingGuildId, dropTarget.folderId);
      }
    } else if (dropTarget.type === 'within-folder') {
      const targetGuildId = dropTarget.afterGuildId || dropTarget.beforeGuildId;
      const position = dropTarget.afterGuildId ? 'after' : 'before';
      if (draggedMeta?.folderId === dropTarget.folderId) {
        if (targetGuildId && targetGuildId !== draggingGuildId) {
          store.reorderWithinFolder(dropTarget.folderId, draggingGuildId, targetGuildId, position);
        }
      } else {
        store.addGuildToFolder(draggingGuildId, dropTarget.folderId, targetGuildId, position);
      }
    } else if (dropTarget.type === 'between') {
      let insertIdx = dropTarget.position === 'after' ? dropTarget.entryIndex + 1 : dropTarget.entryIndex;
      if (draggedMeta?.folderId) {
        store.removeGuildFromFolder(draggingGuildId, insertIdx);
      } else if (draggedMeta) {
        const fromIdx = draggedMeta.entryIndex;
        // Compute where the item would actually end up
        let finalIdx = insertIdx;
        if (fromIdx < insertIdx) finalIdx--;
        if (fromIdx !== finalIdx) {
          store.reorderFolders(fromIdx, finalIdx);
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
    dragTimerRef.current = setTimeout(() => {
      setDraggingGuildId(guildId);
      setDropTarget(null);
    }, 200);

    const cancelDrag = () => {
      clearTimeout(dragTimerRef.current);
      window.removeEventListener('pointerup', cancelDrag);
      window.removeEventListener('pointercancel', cancelDrag);
    };
    window.addEventListener('pointerup', cancelDrag, { once: true });
    window.addEventListener('pointercancel', cancelDrag, { once: true });
  }, []);

  const getIndicator = (guildId) => {
    if (!dropTarget || !draggingGuildId) return null;
    if (dropTarget.type === 'between' && dropTarget.key === `gi-${guildId}`) {
      return dropTarget.position;
    }
    if (dropTarget.type === 'merge-guild' && dropTarget.targetGuildId === guildId) {
      return 'merge';
    }
    return null;
  };

  const isFolderMergeTarget = (folderId) => {
    return dropTarget?.type === 'folder' && dropTarget.folderId === folderId;
  };

  const getWithinFolderIndicator = (guildId, folderId) => {
    if (!dropTarget || dropTarget.type !== 'within-folder') return null;
    if (dropTarget.folderId !== folderId) return null;
    if (dropTarget.beforeGuildId === guildId) return 'before';
    if (dropTarget.afterGuildId === guildId) return 'after';
    return null;
  };

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
      {entries.map((entry) => {
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

const DiscordAccountPopover = ({ account, onDisconnect, collapsed, onToggleCollapse }) => {
  const discordUser = account?.user;
  const avatarUrl = discordUser
    ? DiscordService.getUserAvatarUrl(discordUser.id, discordUser.avatar, 128)
    : null;
  const displayName = discordUser?.global_name || discordUser?.username || 'Discord';
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="group relative mb-2 min-w-min px-3"
              onClick={(e) => {
                e.preventDefault();
                onToggleCollapse();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setPopoverOpen(true);
              }}
            >
              <div className="relative mx-auto h-12 w-12">
                <div className={`absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-full transition-all duration-300 ease-out ring-2 ring-transparent hover:ring-[#5865f2] ${collapsed ? 'opacity-50' : ''}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="size-full object-cover" draggable="false" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[#5865f2] text-white">
                      <DiscordLogo className="size-6" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-bold">
          {displayName}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-56 rounded-lg border-white/10 bg-[#111214] p-1.5"
      >
        <div className="mb-1.5 flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="size-8 shrink-0 overflow-hidden rounded-full">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="size-full object-cover" draggable="false" />
            ) : (
              <div className="flex size-full items-center justify-center bg-[#5865f2] text-white">
                <DiscordLogo className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{displayName}</div>
            {discordUser?.username && discordUser.global_name && (
              <div className="truncate text-xs text-gray-400">{discordUser.username}</div>
            )}
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          onClick={() => { setPopoverOpen(false); onDisconnect(); }}
          className="mt-1.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
        >
          <SignOut className="size-4" />
          Disconnect
        </button>
      </PopoverContent>
    </Popover>
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
  const [disconnectingAccount, setDisconnectingAccount] = useState(null);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
  const [collapsedAccounts, setCollapsedAccounts] = useState({});
  const lastDmChannelId = useLastChannelStore((s) => s.lastChannels['@me']);

  // Telegram state
  const telegramSession = useTelegramStore((s) => s.session);
  const telegramUser = useTelegramStore((s) => s.user);
  const telegramConnected = useTelegramStore((s) => s.isConnected);
  const telegramConnecting = useTelegramStore((s) => s.isConnecting);
  const telegramChats = useTelegramChatsStore((s) => s.chats);

  // Discord state — multi-account
  const discordAccounts = useDiscordStore((s) => s.accounts);
  const discordConnected = useDiscordStore((s) => s.isConnected);
  const { guilds: discordGuilds } = useDiscordGuildsStore();
  const discordFoldersByAccount = useDiscordGuildFoldersStore((s) => s.foldersByAccount);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordReadStates = useDiscordReadStatesStore((s) => s.readStates);

  // Build ordered Discord sidebar entries per account
  const discordAccountSections = useMemo(() => {
    if (discordAccounts.length === 0) return [];

    const guildsById = {};
    for (const g of discordGuilds) {
      guildsById[g.id] = g;
    }

    return discordAccounts.map((account) => {
      const accountUserId = account.user?.id;
      const accountGuilds = discordGuilds.filter((g) => g._accountId === accountUserId);
      const accountFolders = accountUserId ? (discordFoldersByAccount[accountUserId] || []) : [];

      let entries = [];

      if (accountFolders.length > 0) {
        const placed = new Set();

        for (const folder of accountFolders) {
          const folderGuilds = folder.guild_ids
            .map((id) => guildsById[id])
            .filter(Boolean);

          for (const g of folderGuilds) placed.add(g.id);

          if (folderGuilds.length === 0) continue;

          if (folder.id != null) {
            entries.push({ type: 'folder', folder, guilds: folderGuilds });
          } else {
            for (const g of folderGuilds) {
              entries.push({ type: 'guild', guild: g });
            }
          }
        }

        // Any guilds not in folders go at the top
        const unplaced = [];
        for (const g of accountGuilds) {
          if (!placed.has(g.id)) {
            unplaced.push({ type: 'guild', guild: g });
          }
        }
        if (unplaced.length > 0) {
          entries = [...unplaced, ...entries];
        }
      } else {
        entries = accountGuilds.map((g) => ({ type: 'guild', guild: g }));
      }

      return { account, entries, folders: accountFolders };
    });
  }, [discordAccounts, discordGuilds, discordFoldersByAccount]);

  // Auto-connect all Discord accounts
  useEffect(() => {
    if (discordAccounts.length > 0) {
      const hasUnconnected = discordAccounts.some((a) => !a.isConnected);
      if (hasUnconnected) {
        DiscordService.connectAll();
      }
    }
  }, [discordAccounts.length]);

  // Auto-connect Telegram if session exists (Electron only)
  useEffect(() => {
    if (window.IgniteNative && telegramSession && !telegramConnected) {
      TelegramService.connect();
    }
  }, [telegramSession]);

  const { orderedGuilds, reorder } = useGuildOrder(guilds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 2000, tolerance: 5 },
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
  const disableMessageRequests = useDiscordPreferencesStore((s) => s.disableMessageRequests);

  const pendingCount = useMemo(() => {
    const igniteCount = user
      ? requests.filter((req) => req.sender_id != user.id).length
      : 0;
    const discordCount = discordConnected
      ? discordRelationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length
      : 0;
    const discordMessageRequestCount = discordConnected && !disableMessageRequests
      ? discordChannels.filter((c) => (c.type === 1 || c.type === 3) && c.is_message_request).length
      : 0;
    return igniteCount + discordCount + discordMessageRequestCount;
  }, [requests, user, discordConnected, discordRelationships, discordChannels, disableMessageRequests]);

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

  const discordUserIds = useMemo(() => new Set(discordAccounts.map((a) => a.user?.id).filter(Boolean)), [discordAccounts]);

  const unreadDiscordDmChannels = useMemo(() => {
    if (!discordConnected || discordUserIds.size === 0) return [];

    return discordChannels
      .filter((c) => (c.type === 1 || c.type === 3) && c.last_message_id)
      .filter((c) => {
        const entry = discordReadStates[c.id];
        return !entry?.last_message_id || c.last_message_id > entry.last_message_id;
      })
      .map((channel) => {
        const recipientIds = channel.recipient_ids || [];
        const entry = discordReadStates[channel.id];

        // Use mention_count from the read state, fallback to 1 if unread but no count
        const unreadCount = entry?.mention_count > 0 ? entry.mention_count : 1;

        let name, icon, user;
        if (channel.type === 3) {
          const recipients = recipientIds.map((id) => discordUsersMap[id]).filter(Boolean);
          name = channel.name || recipients.map((r) => r.global_name || r.username).join(', ');
          icon = channel.icon
            ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png?size=64`
            : null;
        } else {
          const otherId = recipientIds.find((id) => !discordUserIds.has(id)) || recipientIds[0];
          const other = otherId ? discordUsersMap[otherId] : null;
          user = other;
          name = other?.global_name || other?.username || 'Unknown User';
          icon = other ? DiscordService.getUserAvatarUrl(other.id, other.avatar, 64) : null;
        }

        return { id: channel.id, name, icon, mentionCount: unreadCount, user, isGroup: channel.type === 3 };
      });
  }, [discordConnected, discordUserIds, discordChannels, discordReadStates, discordUsersMap]);

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
      <div className="scrollbar-none relative left-0 top-0 m-0 flex h-full min-w-min select-none flex-col items-center overflow-y-auto bg-[#121214] pb-36 text-white shadow">
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
          <Link
            key={`discord-dm-${dm.id}`}
            to={`/channels/@me/${dm.id}`}
            onContextMenu={(e) => {
              if (dm.user && !dm.isGroup) {
                useContextMenuStore.getState().open(DiscordUserContextMenu, { author: dm.user, channelId: dm.id }, e);
              }
            }}
          >
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

        {/* Discord accounts — desktop only */}
        {!!window.IgniteNative && (
          <>
            {discordAccountSections.map(({ account, entries, folders: accountFolders }, idx) => {
              const accountKey = account.user?.id || account.token;
              const isCollapsed = discordAccountSections.length > 1 && collapsedAccounts[accountKey] !== false;
              return (
              <div key={account.token}>
                {idx > 0 && (
                  <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
                )}
                <DiscordAccountPopover
                  account={account}
                  onDisconnect={() => setDisconnectingAccount(account)}
                  collapsed={isCollapsed}
                  onToggleCollapse={() => setCollapsedAccounts((prev) => ({ ...prev, [accountKey]: prev[accountKey] === false }))}
                />
                {/* {!account.isConnected && (
                  <div className="mx-3 mb-2 flex items-center justify-center gap-1.5 rounded-lg bg-yellow-500/10 px-2 py-1.5">
                    <div className="size-1.5 shrink-0 animate-pulse rounded-full bg-yellow-500" />
                    <span className="text-[10px] font-medium text-yellow-500">Reconnecting…</span>
                  </div>
                )} */}
                {!isCollapsed && entries.length > 0 && (
                  <div className={!account.isConnected ? 'opacity-50' : undefined}>
                    <DiscordGuildsDnd
                      entries={entries}
                      folders={accountFolders}
                      pathname={location.pathname}
                    />
                  </div>
                )}
              </div>
              );
            })}

            {/* Telegram section — above Connect Discord when connected */}
            {telegramConnected && telegramUser ? (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="group relative mb-2 flex w-full justify-center px-3"
                    >
                      <div
                        className={`flex size-12 items-center justify-center rounded-2xl bg-[#2AABEE] text-white transition-all hover:rounded-xl ${
                          location.pathname.startsWith('/telegram') ? 'rounded-xl' : ''
                        }`}
                      >
                        <TelegramLogo className="size-6" weight="fill" />
                      </div>
                      {telegramChats.some((c) => c.unreadCount > 0) && (
                        <div className="absolute -bottom-0.5 right-2 size-2.5 rounded-full bg-white" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="center" className="w-56 p-0" sideOffset={8}>
                    <div className="flex flex-col">
                      <div className="border-b border-white/5 px-3 py-2.5">
                        <div className="text-sm font-semibold text-white">{telegramUser.firstName} {telegramUser.lastName || ''}</div>
                        {telegramUser.username && (
                          <div className="text-xs text-gray-400">@{telegramUser.username}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
                        onClick={() => {
                          if (telegramChats.length > 0) {
                            navigate(`/telegram/${telegramChats[0].id}`);
                          } else {
                            navigate('/telegram');
                          }
                        }}
                      >
                        <TelegramLogo className="size-4" />
                        Open Telegram
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                        onClick={() => setDisconnectingTelegram(true)}
                      >
                        <Power className="size-4" />
                        Disconnect
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                {telegramChats.filter((c) => c.pinned).map((chat) => {
                  const tgFallbackIcon = !chat.photo ? (
                    <div className={`flex size-full items-center justify-center ${
                      chat.type === 'channel' ? 'bg-rose-500' :
                      chat.type === 'group' || chat.type === 'supergroup' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}>
                      {chat.type === 'channel' ? (
                        <Megaphone size={22} weight="fill" className="text-white" />
                      ) : chat.type === 'group' || chat.type === 'supergroup' ? (
                        <UsersThree size={22} weight="fill" className="text-white" />
                      ) : (
                        <span className="text-base font-semibold text-white">{chat.title?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                  ) : null;
                  return (
                    <Link key={`tg-pinned-${chat.id}`} to={`/telegram/${chat.id}`}>
                      <SidebarIcon
                        {...(chat.photo ? { iconUrl: chat.photo } : { icon: tgFallbackIcon })}
                        text={chat.title}
                        isServerIcon={true}
                        isDm={chat.type === 'private'}
                        isActive={location.pathname === `/telegram/${chat.id}`}
                        isUnread={chat.unreadCount > 0}
                        mentionCount={chat.unreadMentionCount}
                      />
                    </Link>
                  );
                })}
                
                <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
              </>
            ) : telegramSession ? (
              <>
                <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="group relative mb-2 flex w-full justify-center px-3"
                    >
                      <div
                        className={`flex size-12 items-center justify-center rounded-2xl bg-[#2AABEE] text-white transition-all hover:rounded-xl ${
                          telegramConnecting ? 'opacity-50' : ''
                        }`}
                      >
                        <TelegramLogo className="size-6" weight="fill" />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="center" className="w-56 p-0" sideOffset={8}>
                    <div className="flex flex-col">
                      <div className="border-b border-white/5 px-3 py-2.5">
                        <div className="text-sm font-semibold text-white">
                          {telegramConnecting ? 'Connecting...' : 'Connection failed'}
                        </div>
                      </div>
                      {!telegramConnecting && (
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
                          onClick={() => TelegramService.connect()}
                        >
                          <TelegramLogo className="size-4" />
                          Reconnect
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                        onClick={() => setDisconnectingTelegram(true)}
                      >
                        <Power className="size-4" />
                        Disconnect
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : null}

            {/* Connect buttons */}
            <button
              type="button"
              onClick={() => setIsDiscordDialogOpen(true)}
            >
              <SidebarIcon
                icon={<DiscordLogo className="size-6" />}
                text="Connect Discord"
              />
            </button>

            {!telegramSession && (
              <button
                type="button"
                onClick={() => setIsTelegramDialogOpen(true)}
              >
                <SidebarIcon
                  icon={<TelegramLogo className="size-6" />}
                  text="Connect Telegram"
                />
              </button>
            )}
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

      <ConnectTelegramDialog
        open={isTelegramDialogOpen}
        onOpenChange={setIsTelegramDialogOpen}
      />

      <AlertDialog open={disconnectingTelegram} onOpenChange={setDisconnectingTelegram}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Telegram</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{' '}
              <span className="font-bold text-white">
                {telegramUser?.firstName || 'your Telegram account'}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await TelegramService.logout();
                setDisconnectingTelegram(false);
                if (location.pathname.startsWith('/telegram')) {
                  navigate('/channels/@me');
                }
              }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!disconnectingAccount} onOpenChange={(open) => !open && setDisconnectingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Discord</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{' '}
              <span className="font-bold text-white">
                {disconnectingAccount?.user?.global_name || disconnectingAccount?.user?.username || 'this Discord account'}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectingAccount) {
                  DiscordService.logoutAccount(disconnectingAccount.token);
                  // If no accounts left and no ignite token, redirect
                  const remaining = useDiscordStore.getState().accounts;
                  if (remaining.length === 0 && !hasIgniteToken) {
                    navigate('/channels/@me');
                  } else if (location.pathname.startsWith('/discord')) {
                    navigate(hasIgniteToken ? '/channels/@me' : '/discord');
                  }
                }
                setDisconnectingAccount(null);
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
