import { getTwemojiUrl } from '@/utils/emoji.utils';

export const DISCORD_EPOCH = 1420070400000;
export const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

export const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

export const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

export const getRelativeTimeFromSnowflake = (id) => {
  if (!id) return null;
  return formatRelativeTime(snowflakeToTimestamp(id));
};

export const resolveAppliedTags = (appliedTagIds, availableTags) => {
  if (!appliedTagIds?.length || !availableTags?.length) return [];
  return appliedTagIds
    .map((tagId) => availableTags.find((t) => t.id === tagId))
    .filter(Boolean);
};

export const getTagEmojiUrl = (tag) => {
  if (!tag.emoji_name) return null;
  if (tag.emoji_id) {
    return `${DISCORD_EMOJI_CDN}/${tag.emoji_id}.webp?size=16`;
  }
  return getTwemojiUrl(tag.emoji_name);
};

export const stripMarkdownToPlainText = (content) => {
  if (!content) return null;
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~|#>\-]+/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
