import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MagnifyingGlass, SlidersHorizontal, Check, ChatsTeardrop, CaretDown } from '@phosphor-icons/react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import DiscordChannelHeader from './DiscordChannelHeader';
import DiscordForumPost from './DiscordForumPost';
import DiscordForumPostList from './DiscordForumPostList';

const DiscordForumView = ({ channel }) => {
  const [threads, setThreads] = useState([]);
  const [firstMessages, setFirstMessages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent_activity');
  const [viewAs, setViewAs] = useState('list');
  const [tagMatch, setTagMatch] = useState('some');

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

        // Store member/owner data from threads into the members store
        const members = (data.threads || [])
          .map((t) => t.owner)
          .filter((o) => o && (o.user?.id || o.user_id));
        if (members.length > 0) {
          useDiscordMembersStore.getState().addMembers(guildId, members);
          // Also store the nested user objects
          const users = members.map((m) => m.user).filter(Boolean);
          if (users.length > 0) {
            useDiscordUsersStore.getState().addUsers(users);
          }
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
    [channelId, guildId]
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
    let result = threads;
    if (selectedTags.length > 0) {
      result = result.filter((thread) => {
        const tags = thread.applied_tags || [];
        return tagMatch === 'all'
          ? selectedTags.every((tagId) => tags.includes(tagId))
          : selectedTags.some((tagId) => tags.includes(tagId));
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((thread) => thread.name?.toLowerCase().includes(q));
    }
    if (sortBy === 'date_posted') {
      result = [...result].sort((a, b) => {
        const aId = BigInt(a.id);
        const bId = BigInt(b.id);
        return bId > aId ? 1 : bId < aId ? -1 : 0;
      });
    }
    // Pinned threads first (flags bit 1 = PINNED)
    result = [...result].sort((a, b) => {
      const aPinned = (a.flags & 2) !== 0 ? 1 : 0;
      const bPinned = (b.flags & 2) !== 0 ? 1 : 0;
      return bPinned - aPinned;
    });
    return result;
  }, [threads, selectedTags, searchQuery, sortBy, tagMatch]);

  const resetSortView = useCallback(() => {
    setSortBy('recent_activity');
    setViewAs('list');
    setTagMatch('some');
  }, []);

  const tagsContainerRef = useRef(null);
  const [overflowCount, setOverflowCount] = useState(0);

  useEffect(() => {
    const container = tagsContainerRef.current;
    if (!container) return;
    const check = () => {
      const children = Array.from(container.children);
      let hidden = 0;
      for (const child of children) {
        if (child.offsetLeft + child.offsetWidth > container.offsetLeft + container.offsetWidth) {
          hidden++;
        }
      }
      setOverflowCount(hidden);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(container);
    return () => observer.disconnect();
  }, [availableTags, selectedTags]);

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e]">
      <DiscordChannelHeader channel={channel} />

      {/* Search bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded bg-[#111214] px-3 py-1.5">
          <MagnifyingGlass className="size-4 shrink-0 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {/* Tag filters & Sort/View */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex shrink-0 items-center gap-1 rounded-md bg-[#2b2d31] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-[#32353b] hover:text-white"
              >
                <SlidersHorizontal className="size-3.5" />
                Sort &amp; View
                <CaretDown className="size-3 text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-56 border-white/10 bg-[#111214] p-2">
              <div className="flex flex-col gap-1">
                <span className="px-2 py-1 text-[11px] font-bold uppercase text-gray-500">Sort by</span>
                <button type="button" onClick={() => setSortBy('recent_activity')} className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
                  Recently Active
                  {sortBy === 'recent_activity' && <Check size={14} weight="bold" className="text-primary" />}
                </button>
                <button type="button" onClick={() => setSortBy('date_posted')} className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
                  Date Posted
                  {sortBy === 'date_posted' && <Check size={14} weight="bold" className="text-primary" />}
                </button>

                <div className="my-1 h-px bg-white/5" />
                <span className="px-2 py-1 text-[11px] font-bold uppercase text-gray-500">View as</span>
                <button type="button" onClick={() => setViewAs('list')} className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
                  List
                  {viewAs === 'list' && <Check size={14} weight="bold" className="text-primary" />}
                </button>
                <button type="button" onClick={() => setViewAs('gallery')} className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
                  Gallery
                  {viewAs === 'gallery' && <Check size={14} weight="bold" className="text-primary" />}
                </button>

                <div className="my-1 h-px bg-white/5" />
                <span className="px-2 py-1 text-[11px] font-bold uppercase text-gray-500">Tag Matching</span>
                <button type="button" onClick={() => setTagMatch('some')} className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
                  Match Some
                  {tagMatch === 'some' && <Check size={14} weight="bold" className="text-primary" />}
                </button>
                <button type="button" onClick={() => setTagMatch('all')} className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
                  Match All
                  {tagMatch === 'all' && <Check size={14} weight="bold" className="text-primary" />}
                </button>

                <div className="my-1 h-px bg-white/5" />
                <button type="button" onClick={resetSortView} className="rounded px-2 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                  Reset to Default
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <div className="mx-0.5 h-4 w-px bg-white/10" />
          <div ref={tagsContainerRef} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
                    <img
                      src={getTwemojiUrl(tag.emoji_name)}
                      alt={tag.emoji_name}
                      className="size-3.5"
                    />
                  )
                )}
                {tag.name}
              </button>
            ))}
          </div>
          {overflowCount > 0 && (
            <button
              type="button"
              className="flex shrink-0 items-center gap-0.5 rounded-md bg-[#2b2d31] px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#32353b]"
            >
              {overflowCount}
              <CaretDown className="size-3 text-gray-400" />
            </button>
          )}
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
          <div className={viewAs === 'gallery' ? 'grid grid-cols-2 gap-2 p-4 xl:grid-cols-4' : 'flex flex-col gap-0.5 p-4'}>
            {filteredThreads.map((thread) => {
              const PostComponent = viewAs === 'gallery' ? DiscordForumPost : DiscordForumPostList;
              return (
                <PostComponent
                  key={thread.id}
                  thread={thread}
                  firstMessage={firstMessages[thread.id]}
                  owner={firstMessages[thread.id]?.author}
                  guildId={guildId}
                  availableTags={availableTags}
                />
              );
            })}

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
