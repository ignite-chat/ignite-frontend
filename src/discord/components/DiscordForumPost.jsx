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

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-lg bg-[#2b2d31] p-4 text-left transition-colors hover:bg-[#32353b]"
    >
      {/* Title */}
      <h3 className="text-base font-semibold text-white">{thread.name}</h3>

      {/* Content preview */}
      {contentAst && (
        <div className="line-clamp-3 text-sm text-gray-400 [overflow-wrap:anywhere]">
          <DiscordMarkdownRenderer nodes={contentAst} guildId={guildId} />
        </div>
      )}

      {/* First message attachments preview */}
      {firstMessage?.attachments?.length > 0 && (
        <div className="flex gap-2">
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

      {/* Reactions */}
      {reactions?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {reactions.map((reaction, i) => {
            const emoji = reaction.emoji;
            const isCustom = !!emoji.id;
            const key = isCustom ? emoji.id : `${emoji.name}-${i}`;
            const count = reaction.count || 0;
            return (
              <div
                key={key}
                className="flex items-center gap-1 rounded-sm bg-[#232428] px-1.5 py-0.5"
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
      )}

      {/* Tags */}
      {appliedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {appliedTagObjects.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded bg-[#3f4147] px-2 py-0.5 text-xs text-gray-300"
            >
              {tag.emoji_name && (
                tag.emoji_id ? (
                  <img
                    src={`${DISCORD_EMOJI_CDN}/${tag.emoji_id}.webp?size=16`}
                    alt=""
                    className="size-3.5"
                  />
                ) : (
                  <span className="text-sm leading-none">{tag.emoji_name}</span>
                )
              )}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: author + message count + last activity */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {authorAvatar && (
          <div className="flex items-center gap-1.5">
            <img src={authorAvatar} alt="" className="size-4 rounded-full" />
            <span className="text-gray-400">{authorName}</span>
          </div>
        )}
        {thread.message_count > 0 && (
          <div className="flex items-center gap-1">
            <ChatCircle size={14} />
            <span>{thread.message_count} {thread.message_count === 1 ? 'reply' : 'replies'}</span>
          </div>
        )}
        {lastActivityTime && <span>{lastActivityTime}</span>}
      </div>
    </button>
  );
};

export default DiscordForumPost;
