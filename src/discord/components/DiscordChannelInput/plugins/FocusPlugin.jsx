import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot } from 'lexical';

const INTERACTIVE_SELECTORS = 'input, textarea, [contenteditable="true"], [role="textbox"], select';

export default function FocusPlugin({ channelId, replyingMessageId }) {
  const [editor] = useLexicalComposerContext();

  // Focus the editor when switching channels or starting a reply
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

  // When the user types a printable character and no other input is focused,
  // redirect focus to the channel input so they can type without clicking it first.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore modifier-only keys and shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore non-printable keys
      if (e.key.length !== 1) return;

      const active = document.activeElement;
      // Already focused on an input — don't steal focus
      if (active && active.closest(INTERACTIVE_SELECTORS)) return;

      editor.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  return null;
}
