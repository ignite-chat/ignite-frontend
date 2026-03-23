import emojisData from '@/assets/emojis/emojis.json';
import spriteMapData from '@/assets/emoji-sprites/sprite-map.json';
import {
  SPRITE_EMOJI_SIZE,
  SPRITE_COLS,
  SPRITE_ROWS,
} from '@/assets/emoji-sprites/constants';
import spriteSheet1x from '@/assets/emoji-sprites/spritesheet.png';
import spriteSheet2x from '@/assets/emoji-sprites/spritesheet@2x.png';

interface EmojiEntry {
  names?: string[];
  surrogates?: string;
}

// ---------------------------------------------------------------------------
// Sprite sheet exports (used by the emoji picker for zero-request rendering)
// ---------------------------------------------------------------------------

const spriteMap = spriteMapData as Record<string, { index: number; row: number; col: number }>;

const supportsImageSet =
  typeof CSS !== 'undefined' && CSS.supports?.('background-image', "image-set(url('data:,') 1x)");

export const SPRITE_SHEET_BG = supportsImageSet
  ? `image-set(url(${spriteSheet1x}) 1x, url(${spriteSheet2x}) 2x)`
  : `url(${spriteSheet1x})`;

export interface SpritePosition {
  x: number;
  y: number;
}

const spritePosCache = new Map<string, SpritePosition | null>();

export const getEmojiSpritePosition = (emoji: string): SpritePosition | null => {
  const cached = spritePosCache.get(emoji);
  if (cached !== undefined) return cached;

  const codepoints = [...emoji].map((char) => char.codePointAt(0)!.toString(16));
  const fullCode = codepoints.join('-');
  const strippedCode = codepoints.filter((hex) => hex !== 'fe0f').join('-');

  const entry = spriteMap[fullCode] || spriteMap[strippedCode];
  if (!entry) {
    spritePosCache.set(emoji, null);
    return null;
  }

  const pos = {
    x: -(entry.col * SPRITE_EMOJI_SIZE),
    y: -(entry.row * SPRITE_EMOJI_SIZE),
  };
  spritePosCache.set(emoji, pos);
  return pos;
};

// ---------------------------------------------------------------------------
// Individual SVG imports (used by message renderers, reactions, etc.)
// These load lazily as ?url — only requested when an emoji appears in a message.
// ---------------------------------------------------------------------------

const svgModules = import.meta.glob('../assets/emojis/svg/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const localSvgLookup = new Map<string, string>();
for (const [modulePath, url] of Object.entries(svgModules)) {
  const filename = modulePath.split('/').pop()!.replace('.svg', '');
  localSvgLookup.set(filename, url);
}

// ---------------------------------------------------------------------------
// Shared emoji data
// ---------------------------------------------------------------------------

export const emojiMap = new Map<string, string>();
export const surrogateToName = new Map<string, string>();
export const allUnicodeEmojis: string[] = [];

try {
  Object.values(emojisData).forEach((categoryEmojis) => {
    (categoryEmojis as EmojiEntry[]).forEach((emoji) => {
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

export const unicodeEmojiRegex = new RegExp(
  allUnicodeEmojis
    .sort((a, b) => b.length - a.length)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
);

export const loadEmojiData = async () => {};

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

// Returns an individual SVG URL for use in <img> tags (messages, reactions, etc.)
const twemojiUrlCache = new Map<string, string | null>();

export const getTwemojiUrl = (emoji: string): string | null => {
  const cached = twemojiUrlCache.get(emoji);
  if (cached !== undefined) return cached;

  const codepoints = [...emoji].map((char) => char.codePointAt(0)!.toString(16));
  const fullCode = codepoints.join('-');
  const strippedCode = codepoints.filter((hex) => hex !== 'fe0f').join('-');

  const url = localSvgLookup.get(fullCode) || localSvgLookup.get(strippedCode) || null;
  twemojiUrlCache.set(emoji, url);
  return url;
};
