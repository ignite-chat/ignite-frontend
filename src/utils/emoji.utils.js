import emojisData from '../assets/emojis/emojis.json';

// Import all local SVG files as URLs at build time
const svgModules = import.meta.glob('../assets/emojis/svg/*.svg', { eager: true, query: '?url', import: 'default' });
const localSvgLookup = new Map();
for (const [path, url] of Object.entries(svgModules)) {
  const filename = path.split('/').pop().replace('.svg', '');
  localSvgLookup.set(filename, url);
}

// Shared emoji shortcode ↔ unicode mapping
export const emojiMap = new Map();

// Reverse map: surrogate → canonical name (first listed name)
export const surrogateToName = new Map();

// Populate map synchronously from local JSON
// Comprehensive list of all unicode surrogates for regex
export const allUnicodeEmojis = [];

try {
  Object.values(emojisData).forEach((categoryEmojis) => {
    categoryEmojis.forEach((emoji) => {
      // Map each name to the surrogate
      if (emoji.names && emoji.surrogates) {
        allUnicodeEmojis.push(emoji.surrogates);
        if (!surrogateToName.has(emoji.surrogates)) {
          surrogateToName.set(emoji.surrogates, emoji.names[0]);
        }
        emoji.names.forEach((name) => {
          const shortcode = `:${name}:`;
          if (!emojiMap.has(shortcode)) {
            emojiMap.set(shortcode, emoji.surrogates);
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
  'g'
);

// Legacy function - kept for compatibility but does nothing now
export const loadEmojiData = async () => {
  // Data is already loaded synchronously
};

export const registerEmoji = (label, emoji) => {
  const shortcode = `:${label.toLowerCase().replace(/\s+/g, '_')}:`;
  if (!emojiMap.has(shortcode)) {
    emojiMap.set(shortcode, emoji);
  }
};

export const convertEmojiShortcodes = (text) => {
  return text.replace(/:[\w_+-]+:/g, (match) => {
    const surrogate = emojiMap.get(match);
    if (surrogate) {
      return `![${match}](${getTwemojiUrl(surrogate)})`;
    }
    return match;
  });
};

export const convertUnicodeEmojis = (text) => {
  if (!text) return '';
  return text.replace(unicodeEmojiRegex, (match) => {
    return `![${match}](${getTwemojiUrl(match)})`;
  });
};

const twemojiUrlCache = new Map();

export const getTwemojiUrl = (emoji) => {
  const cached = twemojiUrlCache.get(emoji);
  if (cached) return cached;

  const code = [...emoji]
    .map((char) => char.codePointAt(0).toString(16))
    .filter((hex) => hex !== 'fe0f') // Remove VS16
    .join('-');
  const url = localSvgLookup.get(code) || `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${code}.svg`;
  twemojiUrlCache.set(emoji, url);
  return url;
};
