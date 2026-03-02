import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { $getRoot } from 'lexical';
import { ChannelsService } from '../../../../services/channels.service';

export default function TypingIndicatorPlugin({ channelId, silentTyping }) {
  const [editor] = useLexicalComposerContext();
  const prevTextRef = useRef('');

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      if (silentTyping || !channelId) return;

      editorState.read(() => {
        const text = $getRoot().getTextContent();
        // Only send typing if text actually changed and is non-empty
        if (text !== prevTextRef.current && text.trim() !== '') {
          ChannelsService.sendTypingIndicator(channelId);
        }
        prevTextRef.current = text;
      });
    });

    return unregister;
  }, [editor, channelId, silentTyping]);

  return null;
}
