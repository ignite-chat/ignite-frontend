import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Fire, Plus, Compass, DiscordLogo, ChatCircle, SignOut } from '@phosphor-icons/react';
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
import { useGuildsStore } from '../store/guilds.store';
import GuildModal from '@/components/modals/GuildModal';
import { useUnreadsStore } from '../store/unreads.store';
import { useChannelsStore } from '../store/channels.store';
import { useUsersStore } from '../store/users.store';
import Avatar from '../components/Avatar';
import { useFriendsStore } from '../store/friends.store';
import { ChannelsService } from '../services/channels.service';
import { GuildsService } from '../services/guilds.service';
import { useGuildOrder } from '../hooks/useGuildOrder';
import {
  isChannelUnread as checkChannelUnread,
  getChannelMentionCount as getChannelMentions,
} from '../utils/unreads.utils';
import { ContextMenu, ContextMenuTrigger } from '../components/ui/context-menu';
import GuildContextMenu from '../components/Guild/GuildContextMenu';
import InviteModal from '@/components/modals/InviteModal';
import { useModalStore } from '../store/modal.store';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useDiscordStore } from '../discord/store/discord.store';
import { useDiscordGuildsStore } from '../discord/store/discord-guilds.store';
import { useDiscordChannelsStore } from '../discord/store/discord-channels.store';
import { useDiscordReadStatesStore } from '../discord/store/discord-readstates.store';
import { DiscordService } from '../discord/services/discord.service';
import { useLastChannelStore } from '../store/last-channel.store';
import { ChannelType } from '@/constants/ChannelType';

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
  <div className="group relative mb-2 min-w-min px-3">
    <div
      className={`absolute -left-1 top-1/2 block w-2 -translate-y-1/2 rounded-lg bg-white transition-all duration-200 ${
        isActive
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

        {/* Tooltip */}
        <span className="pointer-events-none absolute left-14 z-50 m-2 w-auto min-w-max origin-left scale-0 rounded-md bg-[#121214] p-2 text-sm font-bold text-white shadow-lg transition-all duration-100 group-hover:scale-100">
          {text}
        </span>
      </div>

      {mentionCount > 0 && (
        <div className="absolute -bottom-1 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1a1a1e] bg-destructive px-1 text-[11px] font-bold text-white">
          {mentionCount > 99 ? '99+' : mentionCount}
        </div>
      )}
    </div>
  </div>
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
  );
};

const DiscordDMsIcon = ({ isActive }) => {
  const channels = useDiscordChannelsStore((s) => s.channels);
  const readStates = useDiscordReadStatesStore((s) => s.readStates);

  const { unread, mentions } = useMemo(() => {
    const dmChannels = channels.filter((c) => c.type === 1 || c.type === 3);
    let hasUnread = false;
    let totalMentions = 0;
    for (const ch of dmChannels) {
      if (ch.last_message_id) {
        const entry = readStates[ch.id];
        if (!entry?.last_message_id || ch.last_message_id > entry.last_message_id) {
          hasUnread = true;
        }
      }
      totalMentions += readStates[ch.id]?.mention_count ?? 0;
    }
    return { unread: hasUnread, mentions: totalMentions };
  }, [channels, readStates]);

  return (
    <Link to="/discord/@me">
      <SidebarIcon
        icon={<ChatCircle className="size-6" />}
        text="Discord DMs"
        isServerIcon={true}
        isActive={isActive}
        isUnread={unread}
        mentionCount={mentions}
      />
    </Link>
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
  const [discordTokenInput, setDiscordTokenInput] = useState('');
  const [isDiscordLogoutOpen, setIsDiscordLogoutOpen] = useState(false);

  // Discord state
  const { token: discordToken, isConnected: discordConnected } = useDiscordStore();
  const { guilds: discordGuilds } = useDiscordGuildsStore();

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

  const pendingCount = useMemo(() => {
    if (!user) return 0;
    return requests.filter((req) => req.sender_id != user.id).length;
  }, [requests, user]);

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

        {/* Unread DMs */}
        {unreadDmChannels.map((dm) => (
          <Link key={dm.channel_id} to={`/channels/@me/${dm.channel_id}`}>
            <SidebarIcon
              icon={<Avatar user={dm.otherUser} className="size-full" />}
              text={dm.otherUser.username}
              isServerIcon={true}
              isDm={true}
              isActive={channelId === dm.channel_id}
              isUnread={true}
              mentionCount={dm.unreadCount}
            />
          </Link>
        ))}

        {unreadDmChannels.length > 0 && (
          <hr className="mx-auto mb-2 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
        )}

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

        <button type="button" onClick={() => useModalStore.getState().push(GuildModal)}>
          <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
        </button>
        <Link to="/guild-discovery">
          <SidebarIcon icon={<Compass className="size-6" />} text="Discover Servers" />
        </Link>

        {/* Discord */}
        {discordToken && (
          <>
            <hr className="mx-auto mb-2 mt-1 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
            {discordConnected ? (
              <>
                <DiscordDMsIcon isActive={location.pathname.startsWith('/discord/@me')} />
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
            <hr className="mx-auto mb-2 mt-1 w-8 rounded-full border-2 border-white/5 bg-gray-800" />
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
      </div>

      <Dialog
        open={isDiscordDialogOpen}
        onOpenChange={(open) => {
          setIsDiscordDialogOpen(open);
          if (!open) setDiscordTokenInput('');
        }}
      >
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect Discord</DialogTitle>
            <DialogDescription>Enter your Discord token to connect your account.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            name="ignite-discord-token"
            autoComplete="off"
            placeholder="Discord token"
            value={discordTokenInput}
            onChange={(e) => setDiscordTokenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && discordTokenInput.trim()) {
                useDiscordStore.getState().setToken(discordTokenInput.trim());
                setDiscordTokenInput('');
                setIsDiscordDialogOpen(false);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!discordTokenInput.trim()}
              onClick={() => {
                useDiscordStore.getState().setToken(discordTokenInput.trim());
                setDiscordTokenInput('');
                setIsDiscordDialogOpen(false);
              }}
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
