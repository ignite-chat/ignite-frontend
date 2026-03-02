import {
  $getRoot,
  $isTextNode,
  $isLineBreakNode,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { $isMentionNode, $createMentionNode } from '../nodes/MentionNode';
import {
  $isChannelMentionNode,
  $createChannelMentionNode,
} from '../nodes/ChannelMentionNode';

/**
 * Serializes the current Lexical editor state into the backend format.
 * Call inside editor.getEditorState().read() or editor.update().
 *
 * Output format: plain text with <@userId> and <#channelId> tokens.
 */
export function $serializeEditorState() {
  const root = $getRoot();
  let out = '';
  const paragraphs = root.getChildren();

  paragraphs.forEach((paragraph, pIdx) => {
    if (pIdx > 0) out += '\n';
    const children = paragraph.getChildren();
    children.forEach((node) => {
      if ($isMentionNode(node)) {
        out += `<@${node.getUserId()}>`;
      } else if ($isChannelMentionNode(node)) {
        out += `<#${node.getChannelId()}>`;
      } else if ($isLineBreakNode(node)) {
        out += '\n';
      } else if ($isTextNode(node)) {
        out += node.getTextContent();
      }
    });
  });

  return out;
}

/**
 * Parses serialized message text and populates the Lexical editor.
 * Call inside editor.update().
 *
 * Handles: <@userId>, <#channelId>, and plain text.
 */
export function $deserializeToEditor(text, members, resolveUser, channels) {
  const root = $getRoot();
  root.clear();

  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    const paragraph = $createParagraphNode();

    // Parse tokens: <@id>, <#id>, and plain text
    const tokenRegex = /<@(\d+)>|<#(\d+)>/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(line)) !== null) {
      // Add plain text before the match
      if (match.index > lastIndex) {
        paragraph.append($createTextNode(line.slice(lastIndex, match.index)));
      }

      if (match[1]) {
        // User mention <@id>
        const userId = match[1];
        const resolved = resolveUser ? resolveUser(userId) : { label: `@user`, color: 'inherit' };
        paragraph.append($createMentionNode(userId, resolved.label, resolved.color));
      } else if (match[2]) {
        // Channel mention <#id>
        const channelId = match[2];
        const channel = channels?.find(
          (c) => String(c.channel_id || c.id) === channelId
        );
        const channelName = channel?.name || 'unknown';
        paragraph.append($createChannelMentionNode(channelId, channelName));
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining plain text
    if (lastIndex < line.length) {
      paragraph.append($createTextNode(line.slice(lastIndex)));
    }

    root.append(paragraph);
  });
}
