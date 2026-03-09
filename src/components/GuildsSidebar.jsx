import { useMemo, useState, useEffect, useCallback } from 'react';
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
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import GuildContextMenu from '@/ignite/components/context-menus/GuildContextMenu';
import DiscordGuildContextMenu from '@/discord/components/context-menus/DiscordGuildContextMenu';
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
import { useLastChannelStore } from '@/store/last-channel.store';
import { ChannelType } from '@/ignite/constants/ChannelType';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const SidebarIcon = ({
  icon = '',
  iconUrl = '',
  isActive = false,
  isServerIcon = false,
  isDm = false,
  text = 'tooltip',
  isUnread = false,
  mentionCount = 0,
}) => (
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
            className={`absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden ${isDm ? 'rounded-full' : `transition-all duration-300 ease-out ${isActive ? 'rounded-xl' : 'rounded-2xl hover:rounded-xl'} ${isServerIcon ? (iconUrl ? 'bg-[#1d1d1e] text-gray-100' : isActive ? 'bg-primary text-white' : 'bg-[#1d1d1e] text-gray-100 hover:bg-primary hover:text-white') : 'bg-[#1d1d1e] text-green-500 hover:bg-green-500 hover:text-white'}`}`}
          >
            {icon ? (
              icon
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
      {text}
    </TooltipContent>
  </Tooltip>
);

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

  const iconUrl = guild.icon_file_id ? `${CDN_BASE}/icons/${guild.icon_file_id}` : '';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            to={`/channels/${guild.id}${lastChannelId ? `/${lastChannelId}` : ''}`}
            draggable="false"
            style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
          >
            <SidebarIcon
              iconUrl={iconUrl}
              text={guild.name}
              isServerIcon={true}
              isActive={isActive}
              isUnread={isUnread}
              mentionCount={mentionCount}
            />
          </Link>
        </ContextMenuTrigger>
        <GuildContextMenu
          guild={guild}
          onLeave={() => onLeave(guild)}
          onInvite={() => onInvite(guild)}
        />
      </ContextMenu>
    </div>
  );
};

const DISCORD_EPOCH = 1420070400000;
const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

const DiscordGuildIcon = ({ guild, isActive }) => {
  const iconUrl = DiscordService.getGuildIconUrl(guild.id, guild.properties.icon, 128);
  const channels = useDiscordChannelsStore((s) => s.channels);
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const lastChannelId = useLastChannelStore((s) => s.lastChannels[guild.id]);

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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link to={`/discord/${guild.id}${lastChannelId ? `/${lastChannelId}` : ''}`} draggable="false">
          <SidebarIcon
            iconUrl={iconUrl || ''}
            text={guild.properties.name || guild.id}
            isServerIcon={true}
            isActive={isActive}
            isUnread={unread}
            mentionCount={mentions}
          />
        </Link>
      </ContextMenuTrigger>
      <DiscordGuildContextMenu guild={guild} />
    </ContextMenu>
  );
};

const GuildsSidebar = () => {
  const { guildId, channelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUsersStore((s) => s.getCurrentUser());
  const { guilds } = useGuildsStore();
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
  const discordUsersMap = useDiscordUsersStore((s) => s.users);
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordChannelMessages = useDiscordChannelsStore((s) => s.channelMessages);
  const discordReadStates = useDiscordReadStatesStore((s) => s.readStates);

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
    if (!user) return 0;
    const igniteCount = requests.filter((req) => req.sender_id != user.id).length;
    const discordCount = discordConnected
      ? discordRelationships.filter((r) => r.type === RelationshipType.INCOMING_REQUEST).length
      : 0;
    return igniteCount + discordCount;
  }, [requests, user, discordConnected, discordRelationships]);

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
      <div className="scrollbar-none relative left-0 top-0 m-0 flex h-full min-w-min flex-col items-center overflow-y-auto border-r border-white/5 bg-[#121214] pb-36 pt-3 text-white shadow">
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
        {unreadDmChannels.map((dm) => (
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

        <hr className="mx-auto mb-2 w-8 rounded-full border-1 border-white/5 bg-gray-800" />

        {/* Guilds — drag-to-reorder */}
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
                  iconUrl={activeGuild.icon_file_id ? `${CDN_BASE}/icons/${activeGuild.icon_file_id}` : ''}
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
              <>
                {discordGuilds.map((guild) => (
                  <DiscordGuildIcon
                    key={`discord-${guild.id}`}
                    guild={guild}
                    isActive={location.pathname.startsWith(`/discord/${guild.id}`)}
                  />
                ))}
              </>
            ) : (
              <div className="group relative mb-2 flex min-w-min items-center justify-center px-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1e]">
                  <div className="size-5 animate-spin rounded-full border-2 border-solid border-[#5865f2] border-t-transparent" />
                </div>
              </div>
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

        <button type="button" onClick={() => useModalStore.getState().push(GuildModal)}>
          <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
        </button>
        <Link to="/guild-discovery">
          <SidebarIcon icon={<Compass className="size-6" />} text="Discover Servers" />
        </Link>
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
                navigate('/channels/@me');
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
