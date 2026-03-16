import emojisData from '@/assets/emojis/emojis.json';

interface EmojiEntry {
  names?: string[];
  surrogates?: string;
}

// Import all local SVG files as URLs at build time
const svgModules = import.meta.glob('../assets/emojis/svg/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const localSvgLookup = new Map<string, string>();
for (const [path, url] of Object.entries(svgModules)) {
  const filename = path.split('/').pop()!.replace('.svg', '');
  localSvgLookup.set(filename, url);
}

// Shared emoji shortcode ↔ unicode mapping
export const emojiMap = new Map<string, string>();

// Reverse map: surrogate → canonical name (first listed name)
export const surrogateToName = new Map<string, string>();

// Populate map synchronously from local JSON
// Comprehensive list of all unicode surrogates for regex
export const allUnicodeEmojis: string[] = [];

try {
  Object.values(emojisData).forEach((categoryEmojis) => {
    (categoryEmojis as EmojiEntry[]).forEach((emoji) => {
      // Map each name to the surrogate
      if (emoji.names && emoji.surrogates) {
        allUnicodeEmojis.push(emoji.surrogates);
        if (!surrogateToName.has(emoji.surrogates)) {
          surrogateToName.set(emoji.surrogates, emoji.names[0]);
        }
        emoji.names.forEach((name) => {
          const shortcode = `:${name}:`;
          if (!emojiMap.has(shortcode)) {
            emojiMap.set(shortcode, emoji.surrogates!);
          }
        });
      }
    });
  });
} catch (error) {
  console.error('Failed to load local emoji data:', error);
}

// Create a regex that matches any of the unicode emojis
// Sort by length descending to match longer sequences (like family emojis) first
export const unicodeEmojiRegex = new RegExp(
  allUnicodeEmojis
    .sort((a, b) => b.length - a.length)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape for regex
    .join('|'),
  'g',
);

// Legacy function - kept for compatibility but does nothing now
export const loadEmojiData = async () => {
  // Data is already loaded synchronously
};

export const registerEmoji = (label: string, emoji: string) => {
  const shortcode = `:${label.toLowerCase().replace(/\s+/g, '_')}:`;
  if (!emojiMap.has(shortcode)) {
    emojiMap.set(shortcode, emoji);
  }
};

export const convertEmojiShortcodes = (text: string): string => {
  return text.replace(/:[\w_+-]+:/g, (match) => {
    const surrogate = emojiMap.get(match);
    if (surrogate) {
      return `![${match}](${getTwemojiUrl(surrogate)})`;
    }
    return match;
  });
};

export const convertUnicodeEmojis = (text: string): string => {
  if (!text) return '';
  return text.replace(unicodeEmojiRegex, (match) => {
    return `![${match}](${getTwemojiUrl(match)})`;
  });
};

const twemojiUrlCache = new Map<string, string | null>();

export const getTwemojiUrl = (emoji: string): string | null => {
  const cached = twemojiUrlCache.get(emoji);
  if (cached !== undefined) return cached;

  const codepoints = [...emoji].map((char) => char.codePointAt(0)!.toString(16));
  const fullCode = codepoints.join('-');
  const strippedCode = codepoints.filter((hex) => hex !== 'fe0f').join('-');

  // Try full code with fe0f first (local files may include it), then stripped
  const url = localSvgLookup.get(fullCode) || localSvgLookup.get(strippedCode) || null;
  twemojiUrlCache.set(emoji, url);
  return url;
};
