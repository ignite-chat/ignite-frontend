import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot } from 'lexical';

const INTERACTIVE_SELECTORS = 'input, textarea, [contenteditable="true"], [role="textbox"], select';

export default function FocusPlugin({ channelId, replyingId }) {
  const [editor] = useLexicalComposerContext();

  // Focus the editor on channel switch or reply
  useEffect(() => {
    const delay = replyingId ? 50 : 0;
    const timer = setTimeout(() => {
      editor.update(() => {
        const root = $getRoot();
        root.selectEnd();
      });
      editor.focus();
    }, delay);

    return () => clearTimeout(timer);
  }, [editor, channelId, replyingId]);

  // Re-focus the editor whenever focus leaves it, unless another
  // interactive element (search box, modal input, etc.) took focus.
  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const handleBlur = () => {
      // Wait a frame so the browser can move focus to the new target.
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) {
          editor.focus();
        }
        // If focus moved to another interactive element, leave it alone.
      });
    };

    rootEl.addEventListener('focusout', handleBlur);
    return () => rootEl.removeEventListener('focusout', handleBlur);
  }, [editor]);

  // Reclaim focus when clicking anywhere that isn't interactive
  // (e.g. the message list, sidebar chrome, etc.).
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest(INTERACTIVE_SELECTORS)) return;
      // Don't steal focus from buttons (emoji picker, action bars, etc.)
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
