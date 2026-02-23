import { useMemo, useState } from 'react';
import { useUsersStore } from '../../../store/users.store';
import { useGuildsStore } from '../../../store/guilds.store';
import { useGuildContext } from '../../../contexts/GuildContext';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../../ui/context-menu';
import GuildMemberPopoverContent from '../../GuildMember/GuildMemberPopoverContent';
import GuildMemberContextMenu, { KickBanDialog } from '../../GuildMember/GuildMemberContextMenu';

const MentionText = ({ userId, isReply = false }) => {
  const { getUser } = useUsersStore();
  const user = useMemo(() => getUser(userId), [userId, getUser]);
  const { guildId } = useGuildContext();
  const { guildMembers } = useGuildsStore();

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

  const [confirmAction, setConfirmAction] = useState(null);

  return (
    <>
      <ContextMenu>
        <Popover>
          <ContextMenuTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline cursor-pointer rounded px-1 font-medium transition-colors ${roleColor ? 'hover:brightness-110' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'}`}
                style={mentionStyle}
              >
                @{user.name}
              </button>
            </PopoverTrigger>
          </ContextMenuTrigger>
          <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
            <GuildMemberPopoverContent userId={user.id} guild={null} />
          </PopoverContent>
        </Popover>
        <ContextMenuContent>
          <GuildMemberContextMenu user={user} onConfirmAction={setConfirmAction} />
        </ContextMenuContent>
      </ContextMenu>
      <KickBanDialog user={user} confirmAction={confirmAction} setConfirmAction={setConfirmAction} />
    </>
  );
};

export default MentionText;
