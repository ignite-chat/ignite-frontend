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
import { useModalStore } from '@/store/modal.store';

const DefaultAvatar = ({ name }) => (
  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-sm font-semibold text-white select-none">
    {name?.slice(0, 1).toUpperCase() || '?'}
  </div>
);

const DeleteMessageModal = ({ modalId, message, nameColor, onConfirm }) => {
  const handleClose = (open) => {
    if (!open) useModalStore.getState().close(modalId);
  };

  const author = message?.author;
  const displayName = author?.global_name || author?.nick || author?.name || author?.username || 'Unknown';
  const avatarUrl = author?.avatar_url || null;

  return (
    <AlertDialog open onOpenChange={handleClose}>
      <AlertDialogContent className="!max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Message</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this message?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md bg-[#2b2d31] p-3">
          <div className="flex gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-10 shrink-0 rounded-full"
              />
            ) : (
              <DefaultAvatar name={displayName} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: nameColor || 'white' }}>{displayName}</span>
                <span className="text-[10px] text-gray-400">
                  {message?.timestamp
                    ? new Date(message.timestamp).toLocaleString([], {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-snug text-gray-300 break-words line-clamp-4">
                {message?.content || (message?.attachments?.length ? '[Attachment]' : '[No content]')}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => onConfirm?.()}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteMessageModal;
