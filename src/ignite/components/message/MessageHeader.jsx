import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import GuildMemberContextMenu from '../context-menus/GuildMemberContextMenu';
import GuildMemberPopoverContent from '../popovers/GuildMemberPopoverContent';
import UserProfileModal from '@/ignite/components/modals/UserProfileModal';
import { useModalStore } from '../../store/modal.store';

const MessageHeader = ({ message }) => {
  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();
  const [popoverOpen, setPopoverOpen] = useState(false);

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

  const handleViewProfile = () => {
    setPopoverOpen(false);
    useModalStore.getState().push(UserProfileModal, { userId: message.author.id, guildId });
  };

  return (
    <div className="relative mb-1 flex justify-start leading-none">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <ContextMenu>
          <ContextMenuTrigger>
            <PopoverTrigger asChild>
              <button type="button" className="font-semibold leading-none" style={{ color: authorColor }}>
                {message?.author.name} {message?.author.is_webhook && <Badge>Webhook</Badge>}{' '}
                {message?.author.is_bot && <Badge>Bot</Badge>}
              </button>
            </PopoverTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <GuildMemberContextMenu user={message.author} onViewProfile={handleViewProfile} />
          </ContextMenuContent>
        </ContextMenu>
        <PopoverContent
          className="w-auto border-none bg-transparent p-0 shadow-none"
          align="start"
          alignOffset={0}
        >
          <GuildMemberPopoverContent
            userId={message.author.id}
            onOpenProfile={handleViewProfile}
          />
        </PopoverContent>
      </Popover>
      <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-500">
        {formattedDateTime}
      </p>
    </div>
  );
};

export default MessageHeader;
