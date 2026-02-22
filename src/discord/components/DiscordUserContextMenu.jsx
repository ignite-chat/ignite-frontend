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
      <ContextMenuItem onSelect={handleCopyId}>Copy User ID</ContextMenuItem>

      {guildId && (canKick || canBan) && (
        <>
          <ContextMenuSeparator />
          {canKick && (
            <ContextMenuItem
              onSelect={handleKick}
              className="text-red-500 hover:bg-red-600/20"
            >
              Kick {displayName}
            </ContextMenuItem>
          )}
          {canBan && (
            <ContextMenuItem
              onSelect={handleBan}
              className="text-red-500 hover:bg-red-600/20"
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
