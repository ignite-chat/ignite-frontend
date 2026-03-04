import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatsTeardrop } from '@phosphor-icons/react';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordUsersStore } from '../store/discord-users.store';
import DiscordForumPost from './DiscordForumPost';

const DiscordForumView = ({ channel }) => {
  const [threads, setThreads] = useState([]);
  const [firstMessages, setFirstMessages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  const channelId = channel.id;
  const guildId = channel.guild_id;
  const availableTags = channel.available_tags || [];

  const loadThreads = useCallback(
    async (newOffset = 0, append = false) => {
      try {
        const data = await DiscordApiService.searchForumThreads(channelId, newOffset);

        // Store user data from first messages
        const authors = (data.first_messages || []).map((m) => m.author).filter(Boolean);
        if (authors.length > 0) {
          useDiscordUsersStore.getState().addUsers(authors);
        }

        // Build first_messages lookup by channel_id (thread id)
        const msgMap = {};
        for (const msg of data.first_messages || []) {
          msgMap[msg.channel_id] = msg;
        }

        if (append) {
          setThreads((prev) => [...prev, ...(data.threads || [])]);
          setFirstMessages((prev) => ({ ...prev, ...msgMap }));
        } else {
          setThreads(data.threads || []);
          setFirstMessages(msgMap);
        }

        setHasMore(data.has_more || false);
        setOffset(newOffset + (data.threads?.length || 0));
      } catch (error) {
        console.error('[Discord] Failed to load forum threads:', error);
      }
    },
    [channelId]
  );

  useEffect(() => {
    setIsLoading(true);
    setThreads([]);
    setFirstMessages({});
    setOffset(0);
    setSelectedTags([]);
    loadThreads(0).finally(() => setIsLoading(false));
  }, [channelId, loadThreads]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    await loadThreads(offset, true);
    setLoadingMore(false);
  }, [loadThreads, offset]);

  const toggleTag = useCallback((tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const filteredThreads = useMemo(() => {
    if (selectedTags.length === 0) return threads;
    return threads.filter((thread) =>
      selectedTags.some((tagId) => thread.applied_tags?.includes(tagId))
    );
  }, [threads, selectedTags]);

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e]">
      {/* Channel header */}
      <div className="flex h-12 shrink-0 items-center border-b border-white/5 px-4 shadow-sm">
        <ChatsTeardrop className="mr-1 size-5 text-gray-400" weight="fill" />
        <span className="font-semibold text-white">{channel.name}</span>
        {channel.topic && (
          <>
            <div className="mx-3 h-6 w-px bg-white/10" />
            <span className="truncate text-sm text-gray-400">{channel.topic}</span>
          </>
        )}
      </div>

      {/* Tag filters */}
      {availableTags.length > 0 && (
        <div className="flex gap-1.5 border-b border-white/5 px-4 py-2">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                selectedTags.includes(tag.id)
                  ? 'bg-[#5865f2] text-white'
                  : 'bg-[#2b2d31] text-gray-300 hover:bg-[#32353b]'
              }`}
            >
              {tag.emoji_name && (
                tag.emoji_id ? (
                  <img
                    src={`https://cdn.discordapp.com/emojis/${tag.emoji_id}.webp?size=16`}
                    alt=""
                    className="size-3.5"
                  />
                ) : (
                  <span className="text-sm leading-none">{tag.emoji_name}</span>
                )
              )}
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Thread list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <ChatsTeardrop size={48} weight="fill" className="text-gray-600" />
            <p className="text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {filteredThreads.map((thread) => (
              <DiscordForumPost
                key={thread.id}
                thread={thread}
                firstMessage={firstMessages[thread.id]}
                owner={firstMessages[thread.id]?.author}
                guildId={guildId}
                availableTags={availableTags}
              />
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mx-auto mt-2 rounded-md bg-[#2b2d31] px-6 py-2 text-sm text-gray-300 transition-colors hover:bg-[#32353b] disabled:opacity-50"
              >
                {loadingMore ? (
                  <div className="size-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
                ) : (
                  'Load more'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscordForumView;
