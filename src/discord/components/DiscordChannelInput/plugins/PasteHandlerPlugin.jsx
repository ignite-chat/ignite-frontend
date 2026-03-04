import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
} from 'lexical';
import { useEffect } from 'react';
import { $createMentionNode } from '@/ignite/components/channel/ChannelInput/nodes/MentionNode';
import { $createChannelMentionNode } from '@/ignite/components/channel/ChannelInput/nodes/ChannelMentionNode';

export default function PasteHandlerPlugin({ members, resolveUser, channels }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event instanceof ClipboardEvent ? event.clipboardData : null;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        if (!text) return false;

        // Only intercept if the text contains mention tokens
        if (!/<@\d+>|<#\d+>/.test(text)) return false;

        event.preventDefault();

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          const tokenRegex = /<@(\d+)>|<#(\d+)>/g;
          let lastIndex = 0;
          let match;
          const nodes = [];

          while ((match = tokenRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              nodes.push($createTextNode(text.slice(lastIndex, match.index)));
            }

            if (match[1]) {
              const userId = match[1];
              const resolved = resolveUser
                ? resolveUser(userId)
                : { label: `@user`, color: 'inherit' };
              nodes.push($createMentionNode(userId, resolved.label, resolved.color));
            } else if (match[2]) {
              const channelId = match[2];
              const channel = channels?.find((c) => c.id === channelId);
              const channelName = channel?.name || 'unknown';
              nodes.push($createChannelMentionNode(channelId, channelName));
            }

            lastIndex = match.index + match[0].length;
          }

          if (lastIndex < text.length) {
            nodes.push($createTextNode(text.slice(lastIndex)));
          }

          if (nodes.length > 0) {
            selection.insertNodes(nodes);
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    return unregister;
  }, [editor, members, resolveUser, channels]);

  return null;
}
