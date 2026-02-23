import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
} from 'lexical';
import { useEffect } from 'react';
import { $createMentionNode } from '../nodes/MentionNode';
import { $createChannelMentionNode } from '../nodes/ChannelMentionNode';

export default function PasteHandlerPlugin({ addFiles, members, resolveUser, channels }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event instanceof ClipboardEvent ? event.clipboardData : null;
        if (!clipboardData) return false;

        // Handle file paste
        const files = Array.from(clipboardData.files);
        if (files.length > 0) {
          event.preventDefault();
          addFiles(files);
          return true;
        }

        // Handle text paste - parse for mention/channel tokens
        const text = clipboardData.getData('text/plain');
        if (!text) return false;

        event.preventDefault();

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          // Parse text for <@id> and <#id> tokens
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
              const channel = channels?.find(
                (c) => String(c.channel_id || c.id) === channelId
              );
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
  }, [editor, addFiles, members, resolveUser, channels]);

  return null;
}
