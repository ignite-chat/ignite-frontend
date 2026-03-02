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
import { FriendsService } from '@/ignite/services/friends.service';
import { useModalStore } from '@/ignite/store/modal.store';
import { toast } from 'sonner';

type RemoveFriendModalProps = {
  modalId: number;
  userId: string;
  username: string;
};

const RemoveFriendModal = ({ modalId, userId, username }: RemoveFriendModalProps) => {
  const handleClose = (open: boolean) => {
    if (!open) {
      useModalStore.getState().close(modalId);
    }
  };

  return (
    <AlertDialog open onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Friend</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{username}</strong> from your friends?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              FriendsService.deleteFriend(userId)
                .then(() => toast.success('Friend removed'))
                .catch(() => toast.error('Failed to remove friend'));
            }}
          >
            Remove Friend
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveFriendModal;
