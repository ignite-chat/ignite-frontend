import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MagnifyingGlass, ChatsTeardrop, CaretDown } from '@phosphor-icons/react';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordThreadsStore } from '../store/discord-threads.store';
import ForumGalleryView from './forum/ForumGalleryView';
import ForumListView from './forum/ForumListView';
import ForumSortPopover from './forum/ForumSortPopover';
import { getTagEmojiUrl } from './forum/forum.utils';

const PINNED_FLAG = 2;

const DiscordForumView = ({ channel }) => {
  const forumData = useDiscordThreadsStore((s) => s.channels[channel.id]);
  const threads = forumData?.threads || [];
  const firstMessages = forumData?.firstMessages || {};
  const hasMore = forumData?.hasMore || false;
  const offset = forumData?.offset || 0;

  const [isLoading, setIsLoading] = useState(true);
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
        const threadsStore = useDiscordThreadsStore.getState();

        const authors = (data.first_messages || []).map((m) => m.author).filter(Boolean);
        if (authors.length > 0) {
          useDiscordUsersStore.getState().addUsers(authors);
        }

        const members = (data.threads || [])
          .map((t) => t.owner)
          .filter((o) => o && (o.user?.id || o.user_id));
        if (members.length > 0) {
          useDiscordMembersStore.getState().addMembers(guildId, members);
          const users = members.map((m) => m.user).filter(Boolean);
          if (users.length > 0) {
            useDiscordUsersStore.getState().addUsers(users);
          }
        }

        if (append) {
          threadsStore.upsertThreads(channelId, data.threads || []);
          threadsStore.upsertFirstMessages(channelId, data.first_messages || []);
        } else {
          threadsStore.setThreads(channelId, data.threads || []);
          threadsStore.setFirstMessages(channelId, data.first_messages || []);
        }

        threadsStore.setHasMore(channelId, data.has_more || false);
        threadsStore.setOffset(channelId, newOffset + (data.threads?.length || 0));
      } catch (error) {
        console.error('[Discord] Failed to load forum threads:', error);
      }
    },
    [channelId, guildId]
  );

  useEffect(() => {
    setSelectedTags([]);
    if (forumData) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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
          ? selectedTags.every((id) => tags.includes(id))
          : selectedTags.some((id) => tags.includes(id));
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

    // Pinned threads first
    result = [...result].sort((a, b) => {
      const aPinned = (a.flags & PINNED_FLAG) !== 0 ? 1 : 0;
      const bPinned = (b.flags & PINNED_FLAG) !== 0 ? 1 : 0;
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
    const checkOverflow = () => {
      const containerRight = container.offsetLeft + container.offsetWidth;
      let hidden = 0;
      for (const child of container.children) {
        if (child.offsetLeft + child.offsetWidth > containerRight) hidden++;
      }
      setOverflowCount(hidden);
    };
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);
    return () => observer.disconnect();
  }, [availableTags, selectedTags]);

  const viewProps = {
    threads: filteredThreads,
    firstMessages,
    guildId,
    availableTags,
    hasMore,
    loadingMore,
    onLoadMore: handleLoadMore,
  };

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e]">
      {/* Search */}
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

      {/* Tag filters & sort controls */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-3">
          <ForumSortPopover
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewAs={viewAs}
            setViewAs={setViewAs}
            tagMatch={tagMatch}
            setTagMatch={setTagMatch}
            onReset={resetSortView}
          />
          <div className="mx-0.5 h-4 w-px bg-white/10" />
          <div ref={tagsContainerRef} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {availableTags.map((tag) => {
              const emojiUrl = getTagEmojiUrl(tag);
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#5865f2] text-white'
                      : 'bg-[#2b2d31] text-gray-300 hover:bg-[#32353b]'
                  }`}
                >
                  {emojiUrl && <img src={emojiUrl} alt={tag.emoji_name} className="size-3.5" />}
                  {tag.name}
                </button>
              );
            })}
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
        ) : viewAs === 'gallery' ? (
          <ForumGalleryView {...viewProps} />
        ) : (
          <ForumListView {...viewProps} />
        )}
      </div>
    </div>
  );
};

export default DiscordForumView;
