import { useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDiscordMemberListStore } from '../store/discord-member-list.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { DiscordService } from '../services/discord.service';
import DiscordUserPopoverContent from './popovers/DiscordUserPopoverContent';

const statusColors = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

const MemberItem = ({ member: rawMember, guildId, popoverOpen, setPopoverOpen }) => {
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
  const isBot = user.bot;
  const isVerifiedBot = isBot && (user.public_flags & 65536) !== 0;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger className="w-full text-left">
        <div className={`flex items-center gap-2 rounded px-2 py-1 transition hover:bg-white/[0.06] ${status === 'offline' ? 'opacity-30' : ''}`}>
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt=""
              className="size-8 rounded-full object-cover"
            />
            <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#1a1a1e] ${statusColors[status] || statusColors.offline}`} />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span
              className="min-w-0 truncate text-sm font-medium text-gray-300"
              style={nameColor ? { color: nameColor } : undefined}
            >
              {displayName}
            </span>
            {isBot && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium text-white">
                {isVerifiedBot && (
                  <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" />
                  </svg>
                )}
                APP
              </span>
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

const DiscordMemberList = ({ guildId }) => {
  const memberList = useDiscordMemberListStore((s) => s.memberLists[guildId]);
  const guild = useDiscordGuildsStore((s) => s.guilds.find((g) => g.id === guildId));
  const [openPopoverUserId, setOpenPopoverUserId] = useState(null);

  const makePopoverHandler = useCallback(
    (userId) => (open) => {
      setOpenPopoverUserId(open ? userId : null);
    },
    []
  );

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
    <div className="flex h-full w-60 shrink-0 flex-col border-l border-white/5 bg-[#1a1a1e]">
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

            return (
              <div
                key={`group-${group.id}-${index}`}
                className="mb-0.5 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 first:mt-0"
              >
                {label} — {groupCounts[group.id] ?? group.count}
              </div>
            );
          }

          if ('member' in item && item.member) {
            const member = item.member;
            const userId = member.user?.id || member.user_id;
            if (!userId) return null;

            return (
              <MemberItem
                key={userId}
                member={member}
                guildId={guildId}
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
