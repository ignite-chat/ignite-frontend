import { toast } from 'sonner';
import {
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';

const EmojiContextMenu = ({ emojiId }) => {
  if (!emojiId) return null;

  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(emojiId);
          toast.success('Emoji ID copied to clipboard');
        }}
      >
        Copy Emoji ID
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default EmojiContextMenu;
