import { CopySimple, DownloadSimple, Link, ArrowSquareOut } from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

const AttachmentContextMenu = ({ url, onCopyImage, onDownload, onCopyUrl, onOpenOriginal }) => {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={onCopyImage}>
        <CopySimple className="mr-2 size-4" />
        Copy Image
      </ContextMenuItem>
      <ContextMenuItem onClick={onDownload}>
        <DownloadSimple className="mr-2 size-4" />
        Save Image
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onCopyUrl}>
        <Link className="mr-2 size-4" />
        Copy Image URL
      </ContextMenuItem>
      <ContextMenuItem onClick={onOpenOriginal}>
        <ArrowSquareOut className="mr-2 size-4" />
        Open in Browser
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default AttachmentContextMenu;
