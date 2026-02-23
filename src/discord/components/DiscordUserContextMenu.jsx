import { toast } from 'sonner';
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { DiscordApiService } from '../services/discord-api.service';

const DiscordUserContextMenu = ({
  author,
  guildId,
  canKick,
  canBan,
  onViewProfile,
}) => {
  const displayName = author.global_name || author.username;

  const handleCopyId = () => {
    navigator.clipboard.writeText(author.id);
    toast.success('Copied User ID');
  };

  const handleKick = async () => {
    try {
      await DiscordApiService.kickMember(guildId, author.id);
      toast.success(`Kicked ${displayName}`);
    } catch {
      toast.error(`Failed to kick ${displayName}`);
    }
  };

  const handleBan = async () => {
    try {
      await DiscordApiService.banMember(guildId, author.id);
      toast.success(`Banned ${displayName}`);
    } catch {
      toast.error(`Failed to ban ${displayName}`);
    }
  };

  return (
    <>
      <ContextMenuItem onSelect={onViewProfile}>View Profile</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy User ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
      </ContextMenuItem>

      {guildId && (canKick || canBan) && (
        <>
          <ContextMenuSeparator />
          {canKick && (
            <ContextMenuItem
              onSelect={handleKick}
              className="text-[#f23f42] focus:bg-[#da373c] focus:text-white"
            >
              Kick {displayName}
            </ContextMenuItem>
          )}
          {canBan && (
            <ContextMenuItem
              onSelect={handleBan}
              className="text-[#f23f42] focus:bg-[#da373c] focus:text-white"
            >
              Ban {displayName}
            </ContextMenuItem>
          )}
        </>
      )}
    </>
  );
};

export default DiscordUserContextMenu;
