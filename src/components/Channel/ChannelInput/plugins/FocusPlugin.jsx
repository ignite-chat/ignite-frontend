import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot } from 'lexical';

export default function FocusPlugin({ channelId, replyingId }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      editor.update(() => {
        const root = $getRoot();
        root.selectEnd();
      });
      editor.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [editor, channelId, replyingId]);

  return null;
}
