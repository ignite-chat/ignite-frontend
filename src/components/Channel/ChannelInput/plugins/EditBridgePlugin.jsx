import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useCallback } from 'react';
import { $serializeEditorState } from '../utils/serializer';

export default function EditBridgePlugin({ setInputMessage }) {
  const onChange = useCallback(
    (editorState) => {
      editorState.read(() => {
        setInputMessage($serializeEditorState());
      });
    },
    [setInputMessage]
  );

  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
}
