import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GuildIcon from '@/ignite/components/GuildIcon';

const InvitePreviewCard = ({ invite, code }) => {
  const guild = invite.guild;

  return (
    <div className="mt-2 flex max-w-[420px] items-center gap-4 rounded-lg border border-white/10 bg-[#2b2d31] p-4 select-none">
      <GuildIcon guild={guild} size={12} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#b5bac1]">
          {invite.user ? `${invite.user.name} invited you to join` : "You've been invited to join"}
        </p>
        <p className="truncate font-semibold text-white">{guild.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#b5bac1]">
          <div className="size-1.5 rounded-full bg-[#3ba55d]" />
          <span>{guild.member_count ?? 0} Members</span>
        </div>
      </div>

      <Button size="sm" className="shrink-0" asChild>
        <Link to={`/invite/${code}`}>Join</Link>
      </Button>
    </div>
  );
};

export default InvitePreviewCard;
