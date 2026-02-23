import { emojiMap, surrogateToName, unicodeEmojiRegex } from '../../../utils/emoji.utils';

// ─── Constants ───────────────────────────────────────────────────

const TIMESTAMP_STYLES = {
  R: 'RelativeTime',
  T: 'LongTime',
  t: 'ShortTime',
  d: 'ShortDate',
  D: 'LongDate',
  f: 'ShortDateTime',
  F: 'LongDateTime',
};

const INLINE_MARKERS = [
  { marker: '**', type: 'Bold' },
  { marker: '__', type: 'Underline' },
  { marker: '~~', type: 'Strikethrough' },
  { marker: '||', type: 'Spoiler' },
];

// ─── Block-level parser ─────────────────────────────────────────

/**
 * Parse message content into an AST.
 * @param {string} content - The raw message content
 * @param {{ guildEmojis?: Record<string, Array<{id: string, name: string}>>, currentGuildId?: string }} [emojiContext]
 * @returns {Array} AST nodes
 */
export function parseMarkdown(content, emojiContext) {
  if (!content) return [];

  const nodes = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      nodes.push({
        type: 'CodeBlock',
        content: codeLines.join('\n') + (codeLines.length > 0 ? '\n' : ''),
        ...(language ? { language } : {}),
      });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      nodes.push({
        type: 'Heading',
        level: headingMatch[1].length,
        children: parseInline(headingMatch[2], emojiContext),
      });
      i++;
      continue;
    }

    // Blockquote / Alert
    if (line.startsWith('> ') || line === '>') {
      const quoteLines = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].startsWith('> ') ? lines[i].slice(2) : '');
        i++;
      }
      const quoteContent = quoteLines.join('\n');
      const alertMatch = quoteContent.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)/i,
      );
      if (alertMatch) {
        const raw = alertMatch[1];
        const alertType = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        const body = alertMatch[2].trim();
        nodes.push({
          type: 'Alert',
          alertType,
          children: body ? parseInline(body, emojiContext) : [],
        });
      } else {
        nodes.push({ type: 'Blockquote', children: parseInline(quoteContent, emojiContext) });
      }
      continue;
    }

    // Subtext (must precede unordered list check)
    if (line.startsWith('-# ')) {
      nodes.push({ type: 'Subtext', children: parseInline(line.slice(3), emojiContext) });
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push({ children: parseInline(lines[i].slice(2), emojiContext) });
        i++;
      }
      nodes.push({ type: 'List', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      let ordinal = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const m = lines[i].match(/^\d+\.\s(.+)/);
        items.push({ children: parseInline(m ? m[1] : '', emojiContext), ordinal });
        ordinal++;
        i++;
      }
      nodes.push({ type: 'List', ordered: true, items });
      continue;
    }

    // Regular text — accumulate consecutive non-block lines (including empty lines)
    const textLines = [];
    while (i < lines.length && !isBlockStart(lines[i])) {
      textLines.push(lines[i]);
      i++;
    }
    if (textLines.length > 0) {
      nodes.push(...parseInline(textLines.join('\n'), emojiContext));
    }
  }

  return nodes;
}

function isBlockStart(line) {
  if (line.startsWith('```')) return true;
  if (/^#{1,6}\s/.test(line)) return true;
  if (line.startsWith('> ') || line === '>') return true;
  if (line.startsWith('-# ')) return true;
  if (line.startsWith('- ')) return true;
  if (/^\d+\.\s/.test(line)) return true;
  return false;
}

// ─── Inline-level parser ────────────────────────────────────────

export function parseInline(text, emojiContext) {
  if (!text) return [];

  const nodes = [];
  let i = 0;
  let buf = '';

  const guildEmojis = emojiContext?.guildEmojis;
  const currentGuildId = emojiContext?.currentGuildId;

  function flush() {
    if (buf) {
      nodes.push({ type: 'Text', content: buf });
      buf = '';
    }
  }

  while (i < text.length) {
    // Inline code — highest priority, no nesting
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({ type: 'InlineCode', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // URL auto-linking
    if (text[i] === 'h' && (text.slice(i, i + 8) === 'https://' || text.slice(i, i + 7) === 'http://')) {
      const rest = text.slice(i);
      const urlMatch = rest.match(/^https?:\/\/[^\s<>\])"']+/);
      if (urlMatch) {
        flush();
        let href = urlMatch[0];
        // Strip trailing punctuation that's likely not part of the URL
        while (href.length > 0 && /[.,;:!?)]+$/.test(href)) {
          const lastChar = href[href.length - 1];
          // Keep ) if there's a matching ( in the URL (e.g. Wikipedia links)
          if (lastChar === ')' && href.includes('(')) break;
          href = href.slice(0, -1);
        }
        nodes.push({
          type: 'Link',
          href,
          children: [{ type: 'Text', content: href }],
        });
        i += href.length;
        continue;
      }
    }

    // Masked links [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket > i + 1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen > closeBracket + 2) {
          const linkText = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          if (/^https?:\/\//.test(href)) {
            flush();
            nodes.push({
              type: 'Link',
              href,
              children: parseInline(linkText, emojiContext),
            });
            i = closeParen + 1;
            continue;
          }
        }
      }
    }

    // Angle-bracket tokens: timestamps and mentions
    if (text[i] === '<') {
      const rest = text.slice(i);

      // Timestamp <t:1234567890:R>
      const tsMatch = rest.match(/^<t:(\d+):([a-zA-Z])>/);
      if (tsMatch) {
        flush();
        nodes.push({
          type: 'Timestamp',
          timestamp: parseInt(tsMatch[1], 10),
          style: TIMESTAMP_STYLES[tsMatch[2]] || 'ShortDateTime',
        });
        i += tsMatch[0].length;
        continue;
      }

      // Role mention <@&id> (must precede user mention)
      const roleMatch = rest.match(/^<@&(\d+)>/);
      if (roleMatch) {
        flush();
        nodes.push({ type: 'Mention', kind: { kind: 'Role', id: roleMatch[1] } });
        i += roleMatch[0].length;
        continue;
      }

      // User mention <@id>
      const userMatch = rest.match(/^<@(\d+)>/);
      if (userMatch) {
        flush();
        nodes.push({ type: 'Mention', kind: { kind: 'User', id: userMatch[1] } });
        i += userMatch[0].length;
        continue;
      }

      // Channel mention <#id>
      const chanMatch = rest.match(/^<#(\d+)>/);
      if (chanMatch) {
        flush();
        nodes.push({ type: 'Mention', kind: { kind: 'Channel', id: chanMatch[1] } });
        i += chanMatch[0].length;
        continue;
      }

      // Custom emoji — animated format <a:name:id>
      const animEmojiMatch = rest.match(/^<a:([\w_+-]+):(\d+)>/);
      if (animEmojiMatch) {
        flush();
        nodes.push({ type: 'Emoji', kind: { kind: 'Custom', name: animEmojiMatch[1], id: animEmojiMatch[2], animated: true } });
        i += animEmojiMatch[0].length;
        continue;
      }

      // Custom emoji — static format <:name:id> (Discord)
      const staticEmojiMatch = rest.match(/^<:([\w_+-]+):(\d+)>/);
      if (staticEmojiMatch) {
        flush();
        nodes.push({ type: 'Emoji', kind: { kind: 'Custom', name: staticEmojiMatch[1], id: staticEmojiMatch[2], animated: false } });
        i += staticEmojiMatch[0].length;
        continue;
      }

      // Custom emoji — web format <id:name> (Ignite)
      const webEmojiMatch = rest.match(/^<(\d+):([\w_+-]+)>/);
      if (webEmojiMatch) {
        flush();
        nodes.push({ type: 'Emoji', kind: { kind: 'Custom', name: webEmojiMatch[2], id: webEmojiMatch[1] } });
        i += webEmojiMatch[0].length;
        continue;
      }
    }

    // @everyone / @here mentions
    if (text[i] === '@') {
      const rest = text.slice(i);
      if (rest.startsWith('@everyone')) {
        flush();
        nodes.push({ type: 'Mention', kind: { kind: 'Everyone' } });
        i += 9;
        continue;
      }
      if (rest.startsWith('@here')) {
        flush();
        nodes.push({ type: 'Mention', kind: { kind: 'Here' } });
        i += 5;
        continue;
      }
    }

    // Emoji shortcode :name:
    if (text[i] === ':') {
      const end = text.indexOf(':', i + 1);
      if (end > i + 1 && end - i < 40 && !/\s/.test(text.slice(i + 1, end))) {
        const name = text.slice(i + 1, end);

        // Check custom guild emojis
        if (guildEmojis) {
          const currentEmojis = guildEmojis[currentGuildId] || [];
          const custom = currentEmojis.find(
            (e) => e.name.toLowerCase() === name.toLowerCase(),
          );
          if (custom) {
            flush();
            nodes.push({ type: 'Emoji', kind: { kind: 'Custom', name: custom.name, id: custom.id } });
            i = end + 1;
            continue;
          }
        }

        // Check unicode emoji shortcodes
        const surrogates = emojiMap.get(`:${name}:`);
        if (surrogates) {
          flush();
          nodes.push({ type: 'Emoji', kind: { kind: 'Unicode', name, surrogates } });
          i = end + 1;
          continue;
        }
      }
    }

    // Multi-char markers: ** __ ~~ ||
    let matched = false;
    for (const { marker, type } of INLINE_MARKERS) {
      if (text.slice(i, i + marker.length) === marker) {
        const end = text.indexOf(marker, i + marker.length);
        if (end > i + marker.length) {
          flush();
          nodes.push({ type, children: parseInline(text.slice(i + marker.length, end), emojiContext) });
          i = end + marker.length;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // Single * for italic (only when next char is not also *)
    if (text[i] === '*' && (i + 1 >= text.length || text[i + 1] !== '*')) {
      const end = text.indexOf('*', i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({ type: 'Italic', children: parseInline(text.slice(i + 1, end), emojiContext) });
        i = end + 1;
        continue;
      }
    }

    buf += text[i];
    i++;
  }

  flush();

  // Post-process: split Text nodes that contain unicode emojis
  return splitTextWithUnicodeEmojis(nodes);
}

// ─── Unicode emoji post-processing ──────────────────────────────

function splitTextWithUnicodeEmojis(nodes) {
  return nodes.flatMap((node) => {
    if (node.type !== 'Text') return [node];

    const result = [];
    let lastIndex = 0;
    // Reset global regex state
    unicodeEmojiRegex.lastIndex = 0;

    let match;
    while ((match = unicodeEmojiRegex.exec(node.content)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'Text', content: node.content.slice(lastIndex, match.index) });
      }
      const surrogates = match[0];
      const name = surrogateToName.get(surrogates) || surrogates;
      result.push({ type: 'Emoji', kind: { kind: 'Unicode', name, surrogates } });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex === 0) return [node]; // no emoji found, return original
    if (lastIndex < node.content.length) {
      result.push({ type: 'Text', content: node.content.slice(lastIndex) });
    }
    return result;
  });
}
