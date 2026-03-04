import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatCircle } from '@phosphor-icons/react';
import { DiscordService } from '../services/discord.service';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';

const DISCORD_EPOCH = 1420070400000;
const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

const formatRelativeTime = (timestamp) => {
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

const DiscordForumPost = ({ thread, firstMessage, owner, guildId, availableTags }) => {
  const navigate = useNavigate();

  const authorAvatar = useMemo(() => {
    const author = firstMessage?.author || owner;
    if (!author) return null;
    return DiscordService.getUserAvatarUrl(author.id, author.avatar, 64);
  }, [firstMessage?.author, owner]);

  const authorName = useMemo(() => {
    const author = firstMessage?.author || owner;
    if (!author) return 'Unknown';
    return author.global_name || author.username;
  }, [firstMessage?.author, owner]);

  const lastActivityTime = useMemo(() => {
    if (!thread.last_message_id) return null;
    return formatRelativeTime(snowflakeToTimestamp(thread.last_message_id));
  }, [thread.last_message_id]);

  const appliedTagObjects = useMemo(() => {
    if (!thread.applied_tags?.length || !availableTags?.length) return [];
    return thread.applied_tags
      .map((tagId) => availableTags.find((t) => t.id === tagId))
      .filter(Boolean);
  }, [thread.applied_tags, availableTags]);

  const contentAst = useMemo(() => {
    if (!firstMessage?.content) return null;
    return parseMarkdown(firstMessage.content);
  }, [firstMessage?.content]);

  const reactions = firstMessage?.reactions;

  const handleClick = () => {
    // Add the thread as a channel in the store so it can be rendered
    useDiscordChannelsStore.getState().addChannel({
      id: thread.id,
      type: thread.type,
      guild_id: thread.guild_id || guildId,
      name: thread.name,
      parent_id: thread.parent_id,
      last_message_id: thread.last_message_id,
    });

    // Store the author/owner user data
    const author = firstMessage?.author || owner;
    if (author) {
      useDiscordUsersStore.getState().addUser(author);
    }

    navigate(`/discord/${guildId}/${thread.id}`);
  };

  const createdTime = useMemo(() => {
    return formatRelativeTime(snowflakeToTimestamp(thread.id));
  }, [thread.id]);

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

      {/* Title */}
      <h3 className="mt-2.5 line-clamp-2 text-base font-semibold text-white">{thread.name}</h3>

      {/* Content card */}
      {(contentAst || firstMessage?.attachments?.length > 0 || appliedTagObjects.length > 0) && (
        <div className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border p-3">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
            {contentAst && (
              <div className="line-clamp-3 text-sm text-gray-400 [overflow-wrap:anywhere]">
                <DiscordMarkdownRenderer nodes={contentAst} guildId={guildId} />
              </div>
            )}
            {firstMessage?.attachments?.length > 0 && (
              <div className="flex gap-2 overflow-hidden">
                {firstMessage.attachments.slice(0, 3).map((att) => {
                  if (att.content_type?.startsWith('image/')) {
                    return (
                      <img
                        key={att.id}
                        src={att.proxy_url || att.url}
                        alt={att.filename}
                        className="h-20 max-w-[120px] rounded object-cover"
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
          {/* Tags inside card */}
          {appliedTagObjects.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: '1.5rem' }}>
              {appliedTagObjects.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-[#2b2d31] px-2 py-0.5 text-xs text-gray-300"
                >
                  {tag.emoji_name && (
                    tag.emoji_id ? (
                      <img
                        src={`${DISCORD_EMOJI_CDN}/${tag.emoji_id}.webp?size=16`}
                        alt=""
                        className="size-3.5"
                      />
                    ) : (
                      <img
                        src={getTwemojiUrl(tag.emoji_name)}
                        alt={tag.emoji_name}
                        className="size-3.5"
                      />
                    )
                  )}
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spacer when no content */}
      {!contentAst && !firstMessage?.attachments?.length && !appliedTagObjects.length && <div className="flex-1" />}

      {/* Footer: reply count (left) + reactions (right) */}
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500">
        <ChatCircle size={14} weight="fill" />
        <span>{thread.message_count}</span>
        {reactions?.length > 0 && (
          <>
            <div className="flex-1" />
            <div className="flex gap-1 overflow-hidden">
              {reactions.map((reaction, i) => {
                const emoji = reaction.emoji;
                const isCustom = !!emoji.id;
                const key = isCustom ? emoji.id : `${emoji.name}-${i}`;
                const count = reaction.count || 0;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1 rounded bg-[#1a1b1e] px-1.5 py-1"
                  >
                    {isCustom ? (
                      <img
                        src={`${DISCORD_EMOJI_CDN}/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=32`}
                        alt={emoji.name}
                        className="size-4 object-contain"
                      />
                    ) : (
                      <img
                        src={getTwemojiUrl(emoji.name)}
                        alt={emoji.name}
                        className="size-4 object-contain"
                      />
                    )}
                    <span className="text-xs text-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </button>
  );
};

export default DiscordForumPost;
