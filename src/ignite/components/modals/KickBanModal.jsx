import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GuildsService } from '@/ignite/services/guilds.service';
import { useModalStore } from '@/ignite/store/modal.store';

const DELETE_MESSAGE_OPTIONS = [
  { value: '0', label: "Don't delete any" },
  { value: '3600', label: 'Last hour' },
  { value: '21600', label: 'Last 6 hours' },
  { value: '43200', label: 'Last 12 hours' },
  { value: '86400', label: 'Last 24 hours' },
  { value: '259200', label: 'Last 3 days' },
  { value: '604800', label: 'Last 7 days' },
];

/**
 * Confirmation dialog for kick/ban actions.
 * Pushed via useModalStore.push(KickBanModal, { user, guildId, action }).
 */
export const KickBanModal = ({ modalId, user, guildId, action }) => {
  const [reason, setReason] = useState('');
  const [deleteSeconds, setDeleteSeconds] = useState('0');
  const isBan = action === 'ban';

  if (!user) return null;

  const handleClose = (open) => {
    if (!open) {
      useModalStore.getState().close(modalId);
    }
  };

  return (
    <AlertDialog open onOpenChange={handleClose}>
      <AlertDialogContent className={isBan ? '!max-w-md' : undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBan ? `Ban ${user.username}` : `Kick ${user.username}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBan
              ? `Are you sure you want to ban ${user.username}? They will not be able to rejoin unless unbanned.`
              : `Are you sure you want to kick ${user.username} from the server? They can rejoin with a new invite.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isBan && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for the ban"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={512}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Delete message history</label>
              <Select value={deleteSeconds} onValueChange={setDeleteSeconds}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELETE_MESSAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (isBan) {
                GuildsService.banMember(guildId, user.id, reason || undefined, parseInt(deleteSeconds) || undefined);
              } else {
                GuildsService.kickMember(guildId, user.id);
              }
            }}
          >
            {isBan ? 'Ban' : 'Kick'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
