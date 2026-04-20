import { useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { GameController, MusicNote, Broadcast, Eye, Trophy } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useContextMenuStore } from '@/store/context-menu.store';
import { useModalStore } from '@/store/modal.store';
import { useDiscordMemberListStore } from '../store/discord-member-list.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordActivitiesStore, ActivityType } from '../store/discord-activities.store';
import { DiscordService } from '../services/discord.service';
import DiscordUserPopoverContent from './popovers/DiscordUserPopoverContent';
import DiscordUserContextMenu from './context-menus/DiscordUserContextMenu';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import OwnerCrown from '@/components/OwnerCrown';
import DiscordStatusIndicator from './DiscordStatusIndicator';

const ActivityIcon = ({ type, size = 12 }) => {
  const style = { color: '#22c55e' };
  switch (type) {
    case ActivityType.PLAYING: return <GameController size={size} weight="fill" style={style} />;
    case ActivityType.STREAMING: return <Broadcast size={size} weight="fill" style={style} />;
    case ActivityType.LISTENING: return <MusicNote size={size} weight="fill" style={style} />;
    case ActivityType.WATCHING: return <Eye size={size} weight="fill" style={style} />;
    case ActivityType.COMPETING: return <Trophy size={size} weight="fill" style={style} />;
    default: return null;
  }
};

const MemberItem = ({ member: rawMember, guildId, ownerId, popoverOpen, setPopoverOpen }) => {
  // Resolve the user ID from whatever shape the SYNC item has
  const userId = rawMember.user?.id || rawMember.user_id;
  if (!userId) return null;

  // Enrich with full data from dedicated stores
  const storeMember = useDiscordMembersStore((s) => s.members[guildId]?.[userId]);
  const storeUser = useDiscordUsersStore((s) => s.users[userId]);

  // Merge: SYNC item → stored member → stored user (most specific wins)
  const member = { ...storeMember, ...rawMember };
  const user = { id: userId, ...storeUser, ...storeMember?.user, ...rawMember.user };

  const status = member.presence?.status || storeUser?.status || 'offline';
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 32);

  const activities = useDiscordActivitiesStore((s) => s.activities[userId]);
  const nonCustomActivities = useMemo(() => {
    const activityPriority = { [ActivityType.PLAYING]: 0, [ActivityType.STREAMING]: 1, [ActivityType.COMPETING]: 2, [ActivityType.LISTENING]: 3, [ActivityType.WATCHING]: 4 };
    return (activities || [])
      .filter((a) => a.type !== ActivityType.CUSTOM && a.type !== 6)
      .sort((a, b) => (activityPriority[a.type] ?? 99) - (activityPriority[b.type] ?? 99));
  }, [activities]);
  const customStatus = useMemo(
    () => (activities || []).find((a) => a.type === ActivityType.CUSTOM),
    [activities]
  );
  const primaryActivity = nonCustomActivities[0];
  const extraCount = nonCustomActivities.length - 1;

  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const guildRoles = guild?.roles || guild?.properties?.roles || [];
  const memberRoles = member.roles || [];
  const nameColor = useMemo(() => {
    if (!guildRoles.length || !memberRoles.length) return null;
    const topRole = guildRoles
      .filter((r) => memberRoles.includes(r.id) && r.color && r.color !== 0)
      .sort((a, b) => b.position - a.position)[0];
    if (!topRole) return null;
    return `#${topRole.color.toString(16).padStart(6, '0')}`;
  }, [guildRoles, memberRoles]);

  const displayName = member.nick || user.global_name || user.username;
  const isOwner = userId === ownerId;
  const isBot = user.bot;
  const isVerifiedBot = isBot && (user.public_flags & 65536) !== 0;

  const openProfile = () => {
    useModalStore.getState().push(DiscordUserProfileModal, {
      userId,
      guildId,
    });
  };

  const handleContextMenu = (e) => {
    useContextMenuStore.getState().open(DiscordUserContextMenu, {
      author: user,
      guildId,
      onViewProfile: openProfile,
    }, e);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger className="w-full text-left" onContextMenu={handleContextMenu}>
        <div className={`flex items-center gap-2 rounded px-2 py-1 transition hover:bg-white/[0.06] ${status === 'offline' ? 'opacity-30' : ''}`}>
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt=""
              className="size-8 rounded-full object-cover"
            />
            <DiscordStatusIndicator status={status} clientStatus={storeUser?.client_status} processedAt={storeUser?.processed_at_timestamp} invisible={storeUser?.invisible} size="xs" borderColor="#1a1a1e" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1">
              <span
                className="min-w-0 truncate text-sm font-medium text-gray-300"
                style={nameColor ? { color: nameColor } : undefined}
              >
                {displayName}
              </span>
              {isOwner && <OwnerCrown />}
              {isBot && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium text-white">
                  {isVerifiedBot && (
                    <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" />
                    </svg>
                  )}
                  {userId === '643945264868098049' ? 'OFFICIAL' : 'APP'}
                </span>
              )}
            </div>
            {userId !== '643945264868098049' && (primaryActivity || customStatus?.state) && (
              <div className="flex items-center gap-1 truncate text-[11px] text-gray-400">
                {primaryActivity && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-green-500">
                        <ActivityIcon type={primaryActivity.type} size={12} />
                        {extraCount > 0 && (
                          <span className="text-[10px] font-medium text-green-500">+{extraCount}</span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="p-2">
                      <div className="flex flex-col gap-1.5">
                        {nonCustomActivities.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="shrink-0 text-green-500">
                              <ActivityIcon type={a.type} size={14} />
                            </span>
                            <div className="min-w-0">
                              <div className="text-gray-200">{a.name}</div>
                              {a.details && (
                                <div className="text-[11px] text-gray-400">{a.details}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                {primaryActivity && (customStatus?.state || primaryActivity.details) && (
                  <span className="text-gray-600">·</span>
                )}
                {primaryActivity?.type === ActivityType.LISTENING && primaryActivity.details ? (
                  <span className="truncate">{primaryActivity.details}</span>
                ) : customStatus?.state ? (
                  <span className="truncate">{customStatus.state}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0 shadow-none"
        align="start"
        side="left"
        alignOffset={0}
      >
        <DiscordUserPopoverContent
          author={user}
          member={{ ...member, user }}
          guildId={guildId}
        />
      </PopoverContent>
    </Popover>
  );
};

const DiscordMemberList = ({ guildId, recipientIds, ownerId: ownerIdProp }) => {
  const memberList = useDiscordMemberListStore((s) => s.memberLists[guildId]);
  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const [openPopoverUserId, setOpenPopoverUserId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const makePopoverHandler = useCallback(
    (userId) => (open) => {
      setOpenPopoverUserId(open ? userId : null);
    },
    []
  );

  // Group DM: flat list of recipients, no roles/grouping
  if (recipientIds) {
    return (
      <div className="flex h-full w-60 shrink-0 flex-col border-l border-white/5">
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <div className="mb-0.5 px-1 text-xs font-semibold tracking-wide text-gray-400">
            Members — {recipientIds.length}
          </div>
          {recipientIds.map((userId) => (
            <MemberItem
              key={userId}
              member={{ user_id: userId }}
              guildId={undefined}
              ownerId={ownerIdProp}
              popoverOpen={openPopoverUserId === userId}
              setPopoverOpen={makePopoverHandler(userId)}
            />
          ))}
        </div>
      </div>
    );
  }

  const ownerId = guild?.owner_id || guild?.properties?.owner_id;

  // Build a role lookup from guild data
  const guildRoles = guild?.roles || guild?.properties?.roles || [];
  const roleMap = useMemo(() => {
    const map = {};
    for (const role of guildRoles) {
      map[role.id] = role;
    }
    return map;
  }, [guildRoles]);

  // Build a group count lookup from the authoritative top-level groups
  const groupCounts = useMemo(() => {
    const map = {};
    for (const g of memberList?.groups || []) {
      map[g.id] = g.count;
    }
    return map;
  }, [memberList?.groups]);

  // The items array from the store is a flat list of {group: ...} and {member: ...} entries
  const items = memberList?.items || [];

  //if (items.length === 0) return null;

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-l border-white/5">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {items.map((item, index) => {
          if ('group' in item && item.group) {
            const group = item.group;
            const role = roleMap[group.id];
            const label =
              group.id === 'online'
                ? 'Online'
                : group.id === 'offline'
                  ? 'Offline'
                  : role?.name || group.id;
            const collapsed = !!collapsedGroups[group.id];

            return (
              <button
                type="button"
                key={`group-${group.id}-${index}`}
                className="mb-0.5 mt-4 flex w-full items-center gap-0.5 px-1 text-xs font-semibold tracking-wide text-gray-400 first:mt-0 hover:text-gray-300"
                onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
              >
                <svg
                  className={`size-2.5 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <path d="M1 3l4 4 4-4H1z" />
                </svg>
                {label} — {groupCounts[group.id] ?? group.count}
              </button>
            );
          }

          if ('member' in item && item.member) {
            // Find which group this member belongs to by scanning backwards
            let currentGroupId = null;
            for (let j = index - 1; j >= 0; j--) {
              if ('group' in items[j] && items[j].group) {
                currentGroupId = items[j].group.id;
                break;
              }
            }
            if (currentGroupId && collapsedGroups[currentGroupId]) return null;

            const member = item.member;
            const userId = member.user?.id || member.user_id;
            if (!userId) return null;

            return (
              <MemberItem
                key={userId}
                member={member}
                guildId={guildId}
                ownerId={ownerId}
                popoverOpen={openPopoverUserId === userId}
                setPopoverOpen={makePopoverHandler(userId)}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default DiscordMemberList;
