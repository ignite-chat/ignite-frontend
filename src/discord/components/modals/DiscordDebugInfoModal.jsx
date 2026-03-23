import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useModalStore } from '@/store/modal.store';
import { Button } from '@/components/ui/button';

const DiscordDebugInfoModal = ({ modalId, data }) => {
  const json = JSON.stringify(data, null, 2);
  const [collapsed, setCollapsed] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    toast.success('Copied to clipboard.');
  };

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) useModalStore.getState().close(modalId); }}>
      <AlertDialogContent className="!max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-white">Debug Info</AlertDialogTitle>
        </AlertDialogHeader>
        <div className={`overflow-auto rounded bg-[#111214] p-3 font-mono text-xs text-gray-300 ${collapsed ? 'max-h-[400px]' : 'max-h-[70vh]'}`}>
          <pre className="whitespace-pre-wrap break-all">{json}</pre>
        </div>
        <AlertDialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            Copy JSON
          </Button>
          <Button size="sm" onClick={() => useModalStore.getState().close(modalId)}>
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DiscordDebugInfoModal;
