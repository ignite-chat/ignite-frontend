import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical';
import { useEffect } from 'react';

export default function SendMessagePlugin({ onSend }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event?.shiftKey) return false;
        event?.preventDefault();
        onSend();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      unregisterEnter();
    };
  }, [editor, onSend]);

  return null;
}
