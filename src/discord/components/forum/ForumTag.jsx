import { getTagEmojiUrl } from './forum.utils';

const ForumTag = ({ tag, className = '' }) => {
  const emojiUrl = getTagEmojiUrl(tag);

  return (
    <span
      className={`flex items-center gap-1 rounded-full border border-white/10 bg-[#2b2d31] px-2 py-0.5 text-xs text-gray-300 ${className}`}
    >
      {emojiUrl && <img src={emojiUrl} alt={tag.emoji_name} className="size-3.5" />}
      {tag.name}
    </span>
  );
};

export default ForumTag;
