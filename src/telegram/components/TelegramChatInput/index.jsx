import { useState, useCallback, useRef, useEffect } from 'react';
import { PaperPlaneRight, X, ArrowBendUpLeft, PencilSimple } from '@phosphor-icons/react';
import { TelegramService } from '../../services/telegram.service';
import { useTelegramInteractionStore } from '../../store/telegram-interaction.store';

const TYPING_DEBOUNCE = 3000;

const TelegramChatInput = ({ chatId, chatName, onMessageSent }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const lastTypingRef = useRef(0);

  const replyingTo = useTelegramInteractionStore((s) => s.replyingTo);
  const editing = useTelegramInteractionStore((s) => s.editing);

  const isReplyingToThisChat = replyingTo?.chatId === chatId;
  const isEditingInThisChat = editing?.chatId === chatId;

  // Populate text when editing
  useEffect(() => {
    if (isEditingInThisChat && editing?.message?.text) {
      setText(editing.message.text);
      textareaRef.current?.focus();
    }
  }, [isEditingInThisChat, editing]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Focus textarea on chat change
  useEffect(() => {
    textareaRef.current?.focus();
    setText('');
    useTelegramInteractionStore.getState().clearAll();
  }, [chatId]);

  const sendTypingAction = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current > TYPING_DEBOUNCE) {
      lastTypingRef.current = now;
      TelegramService.sendTypingAction(chatId);
    }
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !chatId) return;

    setText('');
    lastTypingRef.current = 0;

    if (isEditingInThisChat && editing?.message) {
      const success = await TelegramService.editMessage(chatId, editing.message.id, trimmed);
      useTelegramInteractionStore.getState().clearEditing();
      if (success) onMessageSent?.();
    } else {
      const replyToId = isReplyingToThisChat ? replyingTo?.message?.id : undefined;
      useTelegramInteractionStore.getState().clearReplyingTo();
      const success = await TelegramService.sendMessage(chatId, trimmed, replyToId);
      if (success) onMessageSent?.();
    }

    textareaRef.current?.focus();
  }, [text, chatId, onMessageSent, isEditingInThisChat, editing, isReplyingToThisChat, replyingTo]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'Escape') {
        useTelegramInteractionStore.getState().clearAll();
        setText('');
      }
    },
    [handleSend],
  );

  const handleChange = useCallback(
    (e) => {
      setText(e.target.value);
      if (!isEditingInThisChat) {
        sendTypingAction();
      }
    },
    [sendTypingAction, isEditingInThisChat],
  );

  const handleCancelReply = useCallback(() => {
    useTelegramInteractionStore.getState().clearReplyingTo();
  }, []);

  const handleCancelEdit = useCallback(() => {
    useTelegramInteractionStore.getState().clearEditing();
    setText('');
  }, []);

  return (
    <div className="shrink-0 border-t border-white/5 px-4 py-3">
      {/* Reply/Edit banner */}
      {isReplyingToThisChat && replyingTo?.message && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#1e1f22] px-3 py-2">
          <ArrowBendUpLeft size={16} className="shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-blue-400">
              Reply to {replyingTo.message.senderName || 'message'}
            </div>
            <div className="truncate text-xs text-gray-400">
              {replyingTo.message.text || (replyingTo.message.media ? `[${replyingTo.message.media.type}]` : '')}
            </div>
          </div>
          <button type="button" onClick={handleCancelReply} className="shrink-0 text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {isEditingInThisChat && editing?.message && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#1e1f22] px-3 py-2">
          <PencilSimple size={16} className="shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-blue-400">Editing message</div>
            <div className="truncate text-xs text-gray-400">{editing.message.text}</div>
          </div>
          <button type="button" onClick={handleCancelEdit} className="shrink-0 text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-lg bg-[#1e1f22] px-3 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          placeholder={
            isEditingInThisChat
              ? 'Edit message...'
              : isReplyingToThisChat
                ? `Reply to ${replyingTo?.message?.senderName || 'message'}...`
                : `Message ${chatName || ''}`
          }
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-white disabled:opacity-30"
          disabled={!text.trim()}
          onClick={handleSend}
        >
          <PaperPlaneRight size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
};

export default TelegramChatInput;
