import { useMemo } from 'react';
import { useUsersStore } from '@/ignite/store/users.store';
import { useGuildsStore } from '@/ignite/store/guilds.store';
import { useGuildContext } from '../../../contexts/GuildContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useContextMenuStore } from '@/store/context-menu.store';
import GuildMemberPopoverContent from '../../popovers/GuildMemberPopoverContent';
import GuildMemberContextMenu from '../../context-menus/GuildMemberContextMenu';

const MentionText = ({ userId, isReply = false }) => {
  const { getUser } = useUsersStore();
  const user = useMemo(() => getUser(userId), [userId, getUser]);
  const { guildId } = useGuildContext();
  const { guildMembers } = useGuildsStore();
  const openContextMenu = useContextMenuStore((s) => s.open);

  const roleColor = useMemo(() => {
    const members = guildMembers[guildId] || [];
    const member = members.find((m) => m.user_id === userId);
    if (!member) return null;

    const role = [...(member.roles || [])]
      .sort((a, b) => b.position - a.position)
      .find((r) => r.color && r.color !== 0);

    return role ? `#${role.color.toString(16).padStart(6, '0')}` : null;
  }, [guildMembers, guildId, userId]);

  if (!user) {
    return <span className="text-blue-400">&lt;@{userId}&gt;</span>;
  }

  const mentionStyle = roleColor ? { color: roleColor, backgroundColor: `${roleColor}33` } : {};

  if (isReply) {
    return (
      <span className="font-medium" style={{ color: roleColor || 'rgb(148, 156, 247)' }}>
        {user.name && user.name !== user.username ? `@${user.name}` : `@${user.username}`}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline cursor-pointer rounded px-1 font-medium transition-colors ${roleColor ? 'hover:brightness-110' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'}`}
          style={mentionStyle}
          onContextMenu={(e) => openContextMenu(GuildMemberContextMenu, { user }, e)}
        >
          @{user.name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
        <GuildMemberPopoverContent userId={user.id} guild={null} />
      </PopoverContent>
    </Popover>
  );
};

export default MentionText;
