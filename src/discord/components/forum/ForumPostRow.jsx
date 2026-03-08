import { useMemo } from 'react';
import { ChatCircle } from '@phosphor-icons/react';
import { useDiscordMembersStore } from '../../store/discord-members.store';
import { useDiscordGuildsStore } from '../../store/discord-guilds.store';
import { useModalStore } from '@/store/modal.store';
import DiscordUserProfileModal from '../DiscordUserProfileModal';
import ForumTag from './ForumTag';
import { DiscordReaction, getReactionEmojiString } from '../DiscordEmojiIcon';
import { DiscordApiService } from '../../services/discord-api.service';
import useNavigateToThread from './useNavigateToThread';
import { getRelativeTimeFromSnowflake, resolveAppliedTags, stripMarkdownToPlainText } from './forum.utils';

const ForumPostRow = ({ thread, firstMessage, guildId, availableTags }) => {
  const author = firstMessage?.author;
  const handleClick = useNavigateToThread(thread, guildId, author);

  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const member = useDiscordMembersStore((s) =>
    author?.id ? s.members[guildId]?.[author.id] : undefined
  );

  const authorName = author?.global_name || author?.username || 'Unknown';
  const lastActivityTime = getRelativeTimeFromSnowflake(thread.last_message_id);

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

  const appliedTags = useMemo(
    () => resolveAppliedTags(thread.applied_tags, availableTags),
    [thread.applied_tags, availableTags]
  );

  const contentPreview = useMemo(
    () => stripMarkdownToPlainText(firstMessage?.content),
    [firstMessage?.content]
  );

  const firstImageAttachment = useMemo(() => {
    if (!firstMessage?.attachments?.length) return null;
    return firstMessage.attachments.find((att) => att.content_type?.startsWith('image/')) || null;
  }, [firstMessage?.attachments]);

  const topReaction = useMemo(() => {
    if (!firstMessage?.reactions?.length) return null;
    return firstMessage.reactions.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a));
  }, [firstMessage?.reactions]);

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
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg bg-[#202024] p-3.5 text-left transition-colors hover:bg-[#2a2d31] border border-[#2e2e32]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Tags */}
        {appliedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {appliedTags.map((tag) => (
              <ForumTag key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        <h3 className="truncate text-sm font-semibold text-white">{thread.name}</h3>

        {/* Author + content preview */}
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
          {topReaction && (
            <DiscordReaction
              emoji={topReaction.emoji}
              count={topReaction.count || 0}
              active={topReaction.me}
              size="sm"
              color="#29292d"
              onClick={(e) => {
                e.stopPropagation();
                const emojiString = getReactionEmojiString(topReaction.emoji);
                if (topReaction.me) {
                  DiscordApiService.removeReaction(thread.id, firstMessage.id, emojiString);
                } else {
                  DiscordApiService.addReaction(thread.id, firstMessage.id, emojiString);
                }
              }}
            />
          )}
          <div className="flex items-center gap-1 text-gray-400">
            <ChatCircle size={12} weight="fill" />
            <span>{thread.message_count}</span>
          </div>
          {lastActivityTime && (
            <>
              <span>·</span>
              <span className="text-gray-400">{lastActivityTime}</span>
            </>
          )}
        </div>
      </div>

      {firstImageAttachment && (
        <img
          src={firstImageAttachment.proxy_url || firstImageAttachment.url}
          alt=""
          className="size-16 shrink-0 rounded object-cover"
        />
      )}
    </div>
  );
};

export default ForumPostRow;
