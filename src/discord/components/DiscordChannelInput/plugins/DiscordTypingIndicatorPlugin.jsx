import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { $getRoot } from 'lexical';
import { DiscordApiService } from '@/discord/services/discord-api.service';

export default function DiscordTypingIndicatorPlugin({ channelId, silentTyping }) {
  const [editor] = useLexicalComposerContext();
  const prevTextRef = useRef('');
  const lastSentRef = useRef(0);

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      if (silentTyping || !channelId) return;

      editorState.read(() => {
        const text = $getRoot().getTextContent();
        if (text !== prevTextRef.current && text.trim() !== '') {
          // Discord typing indicator lasts 10 seconds, throttle to every 8s
          const now = Date.now();
          if (now - lastSentRef.current > 8000) {
            lastSentRef.current = now;
            DiscordApiService.sendTyping(channelId).catch(() => {});
          }
        }
        prevTextRef.current = text;
      });
    });

    return unregister;
  }, [editor, channelId, silentTyping]);

  return null;
}
