import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/api';
import { GuildsService } from '@/services/guilds.service';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';
import {
  CaretDown,
  Gear,
  UserPlus,
  SignOut,
  Hash,
  FolderPlus,
  Bell,
  Lock,
} from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import InviteDialog from './InviteDialog';

const GuildSidebarHeader = ({
  guildName = '',
  guild,
  onOpenServerSettings,
  onCreateChannel,
  onCreateCategory,
}) => {
  const navigate = useNavigate();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const canOpenServerSettings = useMemo(() => {
    return PermissionsService.hasPermission(guild?.id, null, Permissions.MANAGE_GUILD);
  }, [guild?.id]);

  const canInvite = useMemo(() => {
    return PermissionsService.hasPermission(guild?.id, null, Permissions.CREATE_INSTANT_INVITE);
  }, [guild?.id]);

  const handleLeave = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!guild?.id || leaving) return;

      setLeaving(true);

      try {
        await api.delete(`@me/guilds/${guild.id}/`);
        toast.success('Left server.');
        setPopoverOpen(false);
        navigate('/channels/@me');
        await GuildsService.loadGuilds();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Unknown error';
        toast.error(msg);
      } finally {
        setLeaving(false);
      }
    },
    [guild?.id, leaving, navigate]
  );

  const handleInviteClick = () => {
    setPopoverOpen(false);
    setInviteDialogOpen(true);
  };

  const handleQuickInvite = (e) => {
    e.stopPropagation();
    setInviteDialogOpen(true);
  };

  return (
    <div className="relative w-full">
      <div className="flex w-full justify-between gap-2 p-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-100 hover:bg-[#1d1d1e]"
            >
              <div className="flex-1 truncate text-base font-semibold">{guildName}</div>
              <CaretDown
                className={`size-4 transition-transform ${popoverOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-56 border-white/5 bg-[#28282d] p-2" align="start">
            {canInvite && (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
                onClick={handleInviteClick}
              >
                <span>Invite to Server</span>
                <UserPlus className="ml-2 size-4" />
              </button>
            )}

            {canOpenServerSettings && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
                  onClick={() => {
                    setPopoverOpen(false);
                    onOpenServerSettings();
                  }}
                >
                  <span>Server Settings</span>
                  <Gear className="ml-2 size-4" />
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
                  onClick={() => {
                    setPopoverOpen(false);
                    onCreateChannel(null);
                  }}
                >
                  <span>Create Channel</span>
                  <Hash className="ml-2 size-4" />
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-100 hover:bg-white/5"
                  onClick={() => {
                    setPopoverOpen(false);
                    onCreateCategory();
                  }}
                >
                  <span>Create Category</span>
                  <FolderPlus className="ml-2 size-4" />
                </button>

                <Separator className="my-1 bg-white/5" />
              </>
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-400 hover:bg-white/5 disabled:cursor-not-allowed"
              disabled
            >
              <span>Notification Settings</span>
              <Bell className="ml-2 size-4" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-gray-400 hover:bg-white/5 disabled:cursor-not-allowed"
              disabled
            >
              <span>Privacy Settings</span>
              <Lock className="ml-2 size-4" />
            </button>

            <Separator className="my-1 bg-white/5" />

            <button
              type="button"
              className="flex w-full items-center justify-between rounded p-2 text-left text-sm font-medium text-red-300 hover:bg-white/5 disabled:opacity-60"
              onClick={handleLeave}
              disabled={leaving}
            >
              <span>{leaving ? 'Leaving…' : 'Leave Server'}</span>
              <SignOut className="ml-2 size-4" />
            </button>
          </PopoverContent>
        </Popover>
        {canInvite && (
          <button
            type="button"
            className="ml-auto mr-2 rounded p-1 transition-colors hover:bg-white/5"
            onClick={handleQuickInvite}
          >
            <UserPlus className="size-4" />
          </button>
        )}
      </div>

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        guildId={guild?.id}
      />
    </div>
  );
};

export default GuildSidebarHeader;
