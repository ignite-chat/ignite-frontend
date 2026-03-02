import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuildsService } from '@/ignite/services/guilds.service';
import { Permissions } from '@/ignite/constants/Permissions';
import { useHasPermission } from '@/ignite/hooks/useHasPermission';
import { useModalStore } from '@/ignite/store/modal.store';
import {
  CaretDown,
  Gear,
  UserPlus,
  SignOut,
  Hash,
  FolderPlus,
} from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import InviteModal from '@/ignite/components/modals/InviteModal';
import GuildMenuContent from './GuildMenuContent';

const GuildSidebarHeader = ({
  guildName = '',
  guild,
  onOpenServerSettings,
  onCreateChannel,
  onCreateCategory,
}) => {
  const navigate = useNavigate();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverView, setPopoverView] = useState('main');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const canOpenServerSettings = useHasPermission(guild?.id, null, Permissions.MANAGE_GUILD);
  const canInvite = useHasPermission(guild?.id, null, Permissions.CREATE_INSTANT_INVITE);

  const handleLeave = useCallback(
    (e) => {
      e?.stopPropagation();
      setShowLeaveDialog(true);
      setPopoverOpen(false);
    },
    []
  );

  const confirmLeave = async () => {
    if (!guild?.id) return;

    try {
      await GuildsService.leaveGuild(guild.id);
      navigate('/channels/@me');
    } catch (err) {
      console.error(err);
    } finally {
      setShowLeaveDialog(false);
    }
  };

  const handleInviteClick = () => {
    setPopoverOpen(false);
    useModalStore.getState().push(InviteModal, { guildId: guild?.id });
  };

  return (
    <div className="relative w-full">
      <div className="w-full p-2">
        <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) setPopoverView('main'); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors duration-100 hover:bg-[#1d1d1e]"
            >
              <div className="flex-1 truncate text-base font-semibold">{guildName}</div>
              <CaretDown
                className={`size-4 shrink-0 transition-transform ${popoverOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-56 border-white/5 bg-[#28282d] p-2" align="start">
            <GuildMenuContent
              guild={guild}
              view={popoverView}
              setView={setPopoverView}
              onLeave={handleLeave}
              topContent={
                <>
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
                    </>
                  )}

                  <Separator className="my-1 bg-white/5" />
                </>
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave &apos;{guildName}&apos;</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave <span className="font-bold text-white">{guildName}</span>? You won&apos;t be
              able to rejoin this server unless you are re-invited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeave}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Leave Server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GuildSidebarHeader;
