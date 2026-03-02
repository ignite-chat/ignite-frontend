import { useMemo } from 'react';
import { PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import GuildMemberContextMenu from '../guild-member/GuildMemberContextMenu';

const MessageHeader = ({ message, onViewProfile }) => {
  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();

  const authorColor = useMemo(() => {
    const members = guildsStore.guildMembers[guildId] || [];
    const member = members.find((m) => m.user_id === message.author.id);

    if (!member || !member.roles || member.roles.length === 0) return 'inherit';

    const sortedRoles = [...member.roles].sort((a, b) => b.position - a.position);
    const topRole = sortedRoles.find((r) => r.color && r.color !== 0);

    return topRole ? `#${topRole.color.toString(16).padStart(6, '0')}` : 'inherit';
  }, [guildId, guildsStore.guildMembers, message.author.id]);

  const formattedDateTime = useMemo(() => {
    const date = new Date(message.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const day = isToday
      ? 'Today'
      : isYesterday
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${day} at ${time}`;
  }, [message.created_at]);

  return (
    <div className="relative mb-1 flex justify-start leading-none">
      <ContextMenu>
        <ContextMenuTrigger>
          <PopoverTrigger>
            <span className="font-semibold leading-none" style={{ color: authorColor }}>
              {message?.author.name} {message?.author.is_webhook && <Badge>Webhook</Badge>}{' '}
              {message?.author.is_bot && <Badge>Bot</Badge>}
            </span>
          </PopoverTrigger>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <GuildMemberContextMenu user={message.author} onViewProfile={onViewProfile} />
        </ContextMenuContent>
      </ContextMenu>
      <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-500">
        {formattedDateTime}
      </p>
    </div>
  );
};

export default MessageHeader;
