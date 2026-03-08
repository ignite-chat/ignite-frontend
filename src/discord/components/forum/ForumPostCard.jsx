import { useMemo } from 'react';
import { ChatCircle } from '@phosphor-icons/react';
import { DiscordService } from '../../services/discord.service';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from '../DiscordMarkdownRenderer';
import ForumTag from './ForumTag';
import { DiscordReaction, getReactionEmojiString } from '../DiscordEmojiIcon';
import { DiscordApiService } from '../../services/discord-api.service';
import useNavigateToThread from './useNavigateToThread';
import { getRelativeTimeFromSnowflake, resolveAppliedTags } from './forum.utils';

const ForumPostCard = ({ thread, firstMessage, guildId, availableTags }) => {
  const author = firstMessage?.author;
  const handleClick = useNavigateToThread(thread, guildId, author);

  const authorAvatar = useMemo(() => {
    if (!author) return null;
    return DiscordService.getUserAvatarUrl(author.id, author.avatar, 64);
  }, [author]);

  const authorName = author?.global_name || author?.username || 'Unknown';
  const createdTime = getRelativeTimeFromSnowflake(thread.id);
  const reactions = firstMessage?.reactions;

  const appliedTags = useMemo(
    () => resolveAppliedTags(thread.applied_tags, availableTags),
    [thread.applied_tags, availableTags]
  );

  const contentAst = useMemo(() => {
    if (!firstMessage?.content) return null;
    return parseMarkdown(firstMessage.content);
  }, [firstMessage?.content]);

  const hasContent = contentAst || firstMessage?.attachments?.length > 0 || appliedTags.length > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex aspect-square w-full cursor-pointer flex-col rounded-lg bg-[#232428] p-4 text-left transition-colors hover:bg-[#2a2d31]"
    >
      {/* Author header */}
      <div className="flex items-center gap-1.5 text-xs">
        {authorAvatar && (
          <img src={authorAvatar} alt="" className="size-4 rounded-full" />
        )}
        <span className="font-medium text-gray-300">{authorName}</span>
        <span className="text-gray-500">Posted {createdTime}</span>
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-base font-semibold text-white">{thread.name}</h3>

      {/* Content preview card */}
      {hasContent ? (
        <div className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border p-3">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
            {contentAst && (
              <div className="line-clamp-3 text-sm text-gray-400 [overflow-wrap:anywhere]">
                <DiscordMarkdownRenderer nodes={contentAst} guildId={guildId} />
              </div>
            )}
            {firstMessage?.attachments?.length > 0 && (
              <div className="flex gap-2 overflow-hidden">
                {firstMessage.attachments.slice(0, 3).map((att) =>
                  att.content_type?.startsWith('image/') ? (
                    <img
                      key={att.id}
                      src={att.proxy_url || att.url}
                      alt={att.filename}
                      className="h-20 max-w-[120px] rounded object-cover"
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
          {appliedTags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: '1.5rem' }}>
              {appliedTags.map((tag) => (
                <ForumTag key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Footer */}
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500">
        <ChatCircle size={14} weight="fill" />
        <span>{thread.message_count}</span>
        {reactions?.length > 0 && (
          <>
            <div className="flex-1" />
            <div className="flex gap-1 overflow-hidden">
              {reactions.map((reaction, i) => (
                <DiscordReaction
                  key={reaction.emoji.id || `${reaction.emoji.name}-${i}`}
                  emoji={reaction.emoji}
                  count={reaction.count || 0}
                  active={reaction.me}
                  size="md"
                  color="#29292d"
                  onClick={(e) => {
                    e.stopPropagation();
                    const emojiString = getReactionEmojiString(reaction.emoji);
                    if (reaction.me) {
                      DiscordApiService.removeReaction(thread.id, firstMessage.id, emojiString);
                    } else {
                      DiscordApiService.addReaction(thread.id, firstMessage.id, emojiString);
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </button>
  );
};

export default ForumPostCard;
