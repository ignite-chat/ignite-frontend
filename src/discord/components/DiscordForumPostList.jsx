import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatCircle } from '@phosphor-icons/react';
import { DiscordService } from '../services/discord.service';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useModalStore } from '@/store/modal.store';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import { getTwemojiUrl } from '@/utils/emoji.utils';

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

const DiscordForumPostList = ({ thread, firstMessage, owner, guildId, availableTags }) => {
  const navigate = useNavigate();
  const guilds = useDiscordGuildsStore((s) => s.guilds);

  const author = firstMessage?.author || owner;

  const authorName = useMemo(() => {
    if (!author) return 'Unknown';
    return author.global_name || author.username;
  }, [author]);

  const member = useDiscordMembersStore((s) =>
    author?.id ? s.members[guildId]?.[author.id] : undefined
  );

  const nameColor = useMemo(() => {
    if (!guildId || !member?.roles) return undefined;
    const guild = guilds.find((g) => g.id === guildId);
    const guildRoles = guild?.roles || guild?.properties?.roles;
    if (!guildRoles) return undefined;

    const topColorRole = guildRoles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .find((r) => r.color && r.color !== 0);

    if (!topColorRole) return undefined;
    return `#${topColorRole.color.toString(16).padStart(6, '0')}`;
  }, [guildId, guilds, member?.roles]);

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

  const contentPreview = useMemo(() => {
    if (!firstMessage?.content) return null;
    // Strip markdown to plain text for single-line preview
    return firstMessage.content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~|#>\-]+/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, [firstMessage?.content]);

  const firstImageAttachment = useMemo(() => {
    if (!firstMessage?.attachments?.length) return null;
    return firstMessage.attachments.find((att) => att.content_type?.startsWith('image/')) || null;
  }, [firstMessage?.attachments]);

  const handleClick = () => {
    useDiscordChannelsStore.getState().addChannel({
      id: thread.id,
      type: thread.type,
      guild_id: thread.guild_id || guildId,
      name: thread.name,
      parent_id: thread.parent_id,
      last_message_id: thread.last_message_id,
    });

    if (author) {
      useDiscordUsersStore.getState().addUser(author);
    }

    navigate(`/discord/${guildId}/${thread.id}`);
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (!author) return;
    useModalStore.getState().push(DiscordUserProfileModal, {
      author,
      member,
      guildId,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg bg-[#232428] p-3.5 text-left transition-colors hover:bg-[#2a2d31]"
    >
      {/* Left content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Tags */}
        {appliedTagObjects.length > 0 && (
          <div className="flex flex-wrap gap-1">
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

        {/* Title */}
        <h3 className="truncate text-sm font-semibold text-white">{thread.name}</h3>

        {/* Author + content preview (single line) */}
        <p className="truncate text-xs">
          <span
            role="button"
            tabIndex={0}
            onClick={handleAuthorClick}
            className="cursor-pointer hover:underline"
            style={{ color: nameColor || '#d1d5db' }}
          >
            {authorName}
          </span>
          :{' '}
          <span className="text-white">{contentPreview}</span>
        </p>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <ChatCircle size={12} weight="fill" />
            <span>{thread.message_count}</span>
          </div>
          {lastActivityTime && <span>{lastActivityTime}</span>}
        </div>
      </div>

      {/* Right: first image thumbnail */}
      {firstImageAttachment && (
        <img
          src={firstImageAttachment.proxy_url || firstImageAttachment.url}
          alt=""
          className="size-16 shrink-0 rounded object-cover"
        />
      )}
    </button>
  );
};

export default DiscordForumPostList;
