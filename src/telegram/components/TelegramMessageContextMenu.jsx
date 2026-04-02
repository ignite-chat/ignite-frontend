import { ArrowBendUpLeft, PencilSimple, Trash, Copy } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { useTelegramInteractionStore } from '../store/telegram-interaction.store';
import { TelegramService } from '../services/telegram.service';

const TelegramMessageContextMenu = ({ message, isOut }) => {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem
        className="justify-between"
        onSelect={() => {
          useTelegramInteractionStore.getState().setReplyingTo(message.chatId, message);
        }}
      >
        Reply
        <ArrowBendUpLeft className="ml-auto size-[18px]" />
      </ContextMenuItem>

      {isOut && message.text && (
        <ContextMenuItem
          className="justify-between"
          onSelect={() => {
            useTelegramInteractionStore.getState().setEditing(message.chatId, message);
          }}
        >
          Edit
          <PencilSimple className="ml-auto size-[18px]" />
        </ContextMenuItem>
      )}

      {message.text && (
        <ContextMenuItem
          className="justify-between"
          onSelect={() => {
            navigator.clipboard.writeText(message.text);
            toast.success('Copied to clipboard');
          }}
        >
          Copy Text
          <Copy className="ml-auto size-[18px]" />
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />

      <ContextMenuItem
        className="justify-between text-red-400 focus:text-red-400"
        onSelect={() => {
          TelegramService.deleteMessages(message.chatId, [message.id], true);
        }}
      >
        Delete
        <Trash className="ml-auto size-[18px]" />
      </ContextMenuItem>
    </ContextMenuContent>
  );
};

export default TelegramMessageContextMenu;
