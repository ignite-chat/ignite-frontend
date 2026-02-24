import { useState, useCallback, useEffect, useMemo, act } from 'react';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import GuildMemberContextMenu from '../GuildMember/GuildMemberContextMenu.jsx';
import GuildMemberPopoverContent from '../popovers/GuildMemberPopoverContent.jsx';
import UserProfileModal from '@/components/modals/UserProfileModal.jsx';
import { useModalStore } from '../../store/modal.store';
import Avatar from '../Avatar.jsx';
import { useRolesStore } from '../../store/roles.store.ts';
import { useGuildsStore } from '@/store/guilds.store.ts';
import { useUsersStore } from '@/store/users.store.ts';
import { GuildsService } from '@/services/guilds.service.ts';
import { CircleNotch, CaretDown, CaretRight } from '@phosphor-icons/react';

const StatusBadge = ({ status, className = '' }) => {
  if (status !== 'online') return null;
  return (
    <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#1a1a1e] bg-green-500 ${className}`} />
  );
};

const MemberListItem = ({ member, guildId, popoverOpen, setPopoverOpen }) => {
  const userFromStore = useUsersStore((state) => state.users[member.user.id]);
  const status = userFromStore?.status ?? member.user.status;

  const topColor = useMemo(() => {
    if (!member.roles || member.roles.length === 0) return 'inherit';

    // Sort by position descending (highest position first)
    const sorted = [...member.roles].sort((a, b) => b.position - a.position);

    // Find the first role that has a non-zero color
    const topRole = sorted.find((r) => r.color && r.color !== 0);

    if (!topRole) return 'inherit';

    // Convert integer color to Hex (e.g., 16711680 -> #ff0000)
    return `#${topRole.color.toString(16).padStart(6, '0')}`;
  }, [member.roles]);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <ContextMenu>
        <PopoverTrigger className="w-full text-left">
          <ContextMenuTrigger>
            <div className={`flex items-center gap-3 rounded-md p-2 transition hover:bg-gray-700/50 ${status === 'offline' ? 'opacity-40' : ''}`}>
              <div className="relative shrink-0">
                <Avatar user={member.user} className="size-8" />
                <StatusBadge status={status} />
              </div>
              <p
                className="min-w-0 flex-1 truncate text-sm font-medium"
                style={{ color: topColor }}
              >
                {member.user.name ?? member.user.username}
              </p>
            </div>
          </ContextMenuTrigger>
        </PopoverTrigger>
        <ContextMenuContent>
          <GuildMemberContextMenu
            user={member.user}
            onViewProfile={() => {
              setPopoverOpen(false);
              useModalStore.getState().push(UserProfileModal, { userId: member.user.id, guildId });
            }}
          />
        </ContextMenuContent>
      </ContextMenu>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0 shadow-none"
        align="start"
        alignOffset={0}
      >
        <GuildMemberPopoverContent
          userId={member.user.id}
          guild={null}
          onOpenProfile={() => {
            setPopoverOpen(false);
            useModalStore.getState().push(UserProfileModal, { userId: member.user.id, guildId });
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

const MemberList = ({ guildId }) => {
  const { memberListOpen } = useChannelContext();
  const { guildMembers, guilds } = useGuildsStore();
  const users = useUsersStore((state) => state.users);
  const [membersByRole, setMembersByRole] = useState({});
  const [membersWithoutRoles, setMembersWithoutRoles] = useState([]);
  const [offlineMembers, setOfflineMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedRoles, setCollapsedRoles] = useState({});
  const [openPopoverUserId, setOpenPopoverUserId] = useState(null);

  const activeGuild = guilds.find((g) => g.id === guildId);
  const activeGuildMembers = guildMembers[guildId];

  useEffect(() => {
    if (!guildId) return;

    setIsLoading(true);

    GuildsService.loadGuildMembers(guildId).finally(() => setIsLoading(false));
  }, [guildId]);

  const roles = useMemo(() => useRolesStore.getState().guildRoles[guildId] || [], [guildId]);

  const makePopoverHandler = useCallback((userId) => (open) => {
    setOpenPopoverUserId(open ? userId : null);
  }, []);

  const toggleRole = useCallback((roleId) => {
    setCollapsedRoles((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  }, []);

  useEffect(() => {
    const tempMembersByRole = {};
    const tempMembersWithoutRoles = [];
    const tempOfflineMembers = [];
    const assignedMemberIds = new Set();

    activeGuildMembers?.forEach((member) => {
      const userStatus = users[member.user.id]?.status ?? member.user.status;
      // Offline members
      if (userStatus === 'offline') {
        tempOfflineMembers.push(member);
        return;
      }

      if (member.roles && member.roles.length > 0) {
        // Map member's role ids to role objects, filter out missing, sort by position
        const firstRole = member.roles.sort((a, b) => b.position - a.position)[0];
        if (firstRole && !assignedMemberIds.has(member.user.id)) {
          if (!tempMembersByRole[firstRole.id]) tempMembersByRole[firstRole.id] = [];
          tempMembersByRole[firstRole.id].push(member);
          assignedMemberIds.add(member.user.id);
        }
      } else {
        tempMembersWithoutRoles.push(member);
      }
    });

    setMembersByRole(tempMembersByRole);
    setMembersWithoutRoles(tempMembersWithoutRoles);
    setOfflineMembers((activeGuild?.member_count ?? 0) < 200 ? tempOfflineMembers : []);

    // Auto-collapse groups with more than 100 members
    const autoCollapsed = {};
    for (const [roleId, members] of Object.entries(tempMembersByRole)) {
      if (members.length > 100) autoCollapsed[roleId] = true;
    }
    if (tempMembersWithoutRoles.length > 100) autoCollapsed['no-role'] = true;
    if (Object.keys(autoCollapsed).length > 0) {
      setCollapsedRoles((prev) => ({ ...autoCollapsed, ...prev }));
    }
  }, [activeGuildMembers, activeGuild, roles, users]);

  return (
    <div
      className={`relative z-0 transition-all duration-300 ${memberListOpen ? 'w-60 md:w-72' : 'w-0'}`}
    >
      {memberListOpen && (
        <div className="flex h-full flex-col border-l border-white/5 bg-[#1a1a1e]">
          <div className="flex h-12 items-center border-b border-white/5 px-4 text-sm font-semibold text-gray-300">
            Members - {activeGuild?.member_count}
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 text-gray-400">
            {isLoading ? (
              <CircleNotch size={32} className="mx-auto animate-spin text-gray-500" />
            ) : (
              <>
                {roles.map((role) =>
                  membersByRole[role.id] && membersByRole[role.id].length > 0 ? (
                    <div key={role.id}>
                      <div
                        className="flex cursor-pointer items-center gap-1 px-2 py-1 text-xs font-bold text-gray-400 transition hover:text-gray-300"
                        onClick={() => toggleRole(role.id)}
                      >
                        {collapsedRoles[role.id] ? (
                          <CaretRight size={12} weight="bold" />
                        ) : (
                          <CaretDown size={12} weight="bold" />
                        )}
                        {role.name} &mdash; {membersByRole[role.id].length}
                      </div>
                      {!collapsedRoles[role.id] &&
                        membersByRole[role.id].map((member) => (
                          <MemberListItem key={member.user.id} member={member} guildId={guildId} popoverOpen={openPopoverUserId === member.user.id} setPopoverOpen={makePopoverHandler(member.user.id)} />
                        ))}
                    </div>
                  ) : null
                )}
                {membersWithoutRoles.length > 0 && (
                  <div>
                    <div
                      className="flex cursor-pointer items-center gap-1 px-2 py-1 text-xs font-bold text-gray-400 transition hover:text-gray-300"
                      onClick={() => toggleRole('no-role')}
                    >
                      {collapsedRoles['no-role'] ? (
                        <CaretRight size={12} weight="bold" />
                      ) : (
                        <CaretDown size={12} weight="bold" />
                      )}
                      Members &mdash; {membersWithoutRoles.length}
                    </div>
                    {!collapsedRoles['no-role'] &&
                      membersWithoutRoles.map((member) => (
                        <MemberListItem key={member.user.id} member={member} guildId={guildId} popoverOpen={openPopoverUserId === member.user.id} setPopoverOpen={makePopoverHandler(member.user.id)} />
                      ))}
                  </div>
                )}
                {offlineMembers.length > 0 && (
                  <div>
                    <div
                      className="flex cursor-pointer items-center gap-1 px-2 py-1 text-xs font-bold text-gray-400 transition hover:text-gray-300"
                      onClick={() => toggleRole('offline')}
                    >
                      {collapsedRoles['offline'] ? (
                        <CaretRight size={12} weight="bold" />
                      ) : (
                        <CaretDown size={12} weight="bold" />
                      )}
                      Offline &mdash; {offlineMembers.length}
                    </div>
                    {!collapsedRoles['offline'] &&
                      offlineMembers.map((member) => (
                        <MemberListItem key={member.user.id} member={member} guildId={guildId} popoverOpen={openPopoverUserId === member.user.id} setPopoverOpen={makePopoverHandler(member.user.id)} />
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberList;
