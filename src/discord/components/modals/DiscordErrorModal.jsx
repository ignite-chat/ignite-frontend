import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useModalStore } from '@/store/modal.store';

const DiscordErrorModal = ({ modalId, title, description }) => {
  const handleClose = (open) => {
    if (!open) useModalStore.getState().close(modalId);
  };

  return (
    <AlertDialog open onOpenChange={handleClose}>
      <AlertDialogContent className="!max-w-sm">
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-lg font-bold text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="!justify-center">
          <AlertDialogAction
            className="w-full"
            onClick={() => useModalStore.getState().close(modalId)}
          >
            Okay
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DiscordErrorModal;
