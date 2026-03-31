import { useState, useCallback, useRef, useEffect } from 'react';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { TelegramService } from '../../services/telegram.service';

const TYPING_DEBOUNCE = 3000;

const TelegramChatInput = ({ chatId, chatName, onMessageSent }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const lastTypingRef = useRef(0);

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

    const success = await TelegramService.sendMessage(chatId, trimmed);
    if (success) {
      onMessageSent?.();
    }

    textareaRef.current?.focus();
  }, [text, chatId, onMessageSent]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChange = useCallback(
    (e) => {
      setText(e.target.value);
      sendTypingAction();
    },
    [sendTypingAction],
  );

  return (
    <div className="shrink-0 border-t border-white/5 px-4 py-3">
      <div className="flex items-end gap-2 rounded-lg bg-[#1e1f22] px-3 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          placeholder={`Message ${chatName || ''}`}
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
