import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getTwemojiUrl } from '@/utils/emoji.utils';

const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

export const getDiscordEmojiUrl = (emoji, size = 48) => {
  if (emoji.id) {
    const ext = emoji.animated ? 'gif' : 'webp';
    return `${DISCORD_EMOJI_CDN}/${emoji.id}.${ext}?size=${size}`;
  }
  return getTwemojiUrl(emoji.name);
};

const emojiColorCache = new Map();

const getAverageColor = (src) => {
  if (emojiColorCache.has(src)) return Promise.resolve(emojiColorCache.get(src));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) { resolve(null); return; }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 0 && max !== min) {
        const factor = 255 / max;
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
      }

      const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
      emojiColorCache.set(src, hex);
      resolve(hex);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export const useEmojiColor = (emoji, fallback) => {
  const [color, setColor] = useState(() => {
    const src = getDiscordEmojiUrl(emoji, 32);
    return emojiColorCache.get(src) || fallback;
  });

  useEffect(() => {
    const src = getDiscordEmojiUrl(emoji, 32);

    if (emojiColorCache.has(src)) {
      setColor(emojiColorCache.get(src) || fallback);
      return;
    }

    getAverageColor(src).then((c) => setColor(c || fallback));
  }, [emoji.id, emoji.name, fallback]);

  return color;
};

export const getReactionEmojiString = (emoji) => {
  if (emoji.id) return `${emoji.name}:${emoji.id}`;
  return emoji.name;
};

const DiscordEmojiIcon = ({ emoji, className = 'size-5' }) => (
  <img
    src={getDiscordEmojiUrl(emoji)}
    alt={emoji.name}
    className={`${className} object-contain`}
    draggable="false"
  />
);

export const DiscordBurstReaction = ({ emoji, count }) => {
  const burstColor = useEmojiColor(emoji, '#ffd661');

  return (
    <button
      type="button"
      className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-2 brightness-150"
      style={{ borderColor: burstColor, backgroundColor: `color-mix(in srgb, ${burstColor} 15%, #232428)` }}
    >
      <DiscordEmojiIcon emoji={emoji} />
      <span className="min-w-3 text-center text-sm font-bold" style={{ color: burstColor }}>
        {count}
      </span>
    </button>
  );
};

export const DiscordReaction = ({ emoji, count, active, onClick, size = 'lg', color = '#232428' }) => {
  const iconSize = size === 'sm' ? 'size-3.5' : size === 'md' ? 'size-4' : 'size-5';
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-2',
        active
          ? 'border-[#5865f2] bg-[#5865f2]/25 hover:border-[#7983f5]'
          : 'border-transparent hover:border-[#4e505c]'
      )}
      style={!active ? { backgroundColor: color } : undefined}
    >
      <DiscordEmojiIcon emoji={emoji} className={iconSize} />
      <span className={cn(
        'min-w-3 text-center text-sm font-bold',
        active ? 'text-[#7881eb]' : 'text-[#b5bac1]'
      )}>
        {count}
      </span>
    </Tag>
  );
};

export default DiscordEmojiIcon;
