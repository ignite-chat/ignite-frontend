import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_ENTER_COMMAND,
  KEY_ARROW_UP_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  $getRoot,
} from 'lexical';
import { useEffect } from 'react';

export default function SendMessagePlugin({ onSend, onEditLast }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event?.shiftKey) return false; // allow default line break
        event?.preventDefault();
        onSend();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    const unregisterUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        const isEmpty = editor.getEditorState().read(() => {
          return $getRoot().getTextContent().trim() === '';
        });
        if (isEmpty) {
          onEditLast();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      unregisterEnter();
      unregisterUp();
    };
  }, [editor, onSend, onEditLast]);

  return null;
}
