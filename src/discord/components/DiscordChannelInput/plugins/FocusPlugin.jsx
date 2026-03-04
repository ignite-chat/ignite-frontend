import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot } from 'lexical';

const INTERACTIVE_SELECTORS = 'input, textarea, [contenteditable="true"], [role="textbox"], select';

export default function FocusPlugin({ channelId, replyingMessageId }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const delay = replyingMessageId ? 50 : 0;
    const timer = setTimeout(() => {
      editor.update(() => {
        const root = $getRoot();
        root.selectEnd();
      });
      editor.focus();
    }, delay);

    return () => clearTimeout(timer);
  }, [editor, channelId, replyingMessageId]);

  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const handleBlur = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) {
          editor.focus();
        }
      });
    };

    rootEl.addEventListener('focusout', handleBlur);
    return () => rootEl.removeEventListener('focusout', handleBlur);
  }, [editor]);

  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest(INTERACTIVE_SELECTORS)) return;
      if (e.target.closest('button, [role="menuitem"], [role="option"], a')) return;

      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) {
          editor.focus();
        }
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [editor]);

  return null;
}
