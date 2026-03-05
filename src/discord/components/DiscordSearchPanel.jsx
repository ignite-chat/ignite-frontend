import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, SpinnerGap } from '@phosphor-icons/react';
import { DiscordApiService } from '../services/discord-api.service';
import { DiscordService } from '../services/discord.service';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';

const formatTimestamp = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const SearchResultMessage = ({ message, guildId, onClick }) => {
  const channels = useDiscordChannelsStore((s) => s.channels);
  const channel = channels.find((c) => c.id === message.channel_id);
  const author = message.author;
  const avatarUrl = DiscordService.getUserAvatarUrl(author.id, author.avatar, 40);
  const displayName = message.member?.nick || author.global_name || author.username;
  const ast = useMemo(() => message.content ? parseMarkdown(message.content) : null, [message.content]);

  return (
    <button
      type="button"
      className="w-full rounded-md px-3 py-2 text-left transition hover:bg-white/5"
      onClick={onClick}
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
        <span className="text-gray-500">#</span>
        <span>{channel?.name || 'unknown'}</span>
        <span className="text-gray-600">&middot;</span>
        <span>{formatTimestamp(message.timestamp)}</span>
      </div>
      <div className="flex items-start gap-2.5">
        <img src={avatarUrl} alt="" className="mt-0.5 size-8 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-white">{displayName}</span>
          {ast && (
            <div className="mt-0.5 line-clamp-2 text-sm text-gray-300">
              <DiscordMarkdownRenderer nodes={ast} guildId={guildId} />
            </div>
          )}
          {message.attachments?.length > 0 && !message.content && (
            <span className="text-sm italic text-gray-500">[attachment]</span>
          )}
        </div>
      </div>
    </button>
  );
};

const DiscordSearchPanel = ({ guildId, initialQuery, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  const search = useCallback(async (q, off = 0) => {
    if (!q.trim() || !guildId) return;
    setLoading(true);
    try {
      const data = await DiscordApiService.searchGuildMessages(guildId, q.trim(), off);
      const messages = (data.messages || []).map((arr) => arr[0]).filter(Boolean);
      setResults(messages);
      setTotalResults(data.total_results || 0);
      setOffset(off);
    } catch {
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  // Search on mount with initial query
  useEffect(() => {
    if (initialQuery?.trim()) {
      search(initialQuery, 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      search(query, 0);
    }
  };

  const pageSize = 25;
  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.ceil(totalResults / pageSize);

  const goToMessage = (msg) => {
    navigate(`/discord/${guildId}/${msg.channel_id}`);
    onClose();
  };

  return (
    <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-white/5 bg-[#111214]">
      {/* Search header */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="text-sm font-semibold text-white">Search Results</span>
        <span className="text-xs text-gray-500">{totalResults > 0 && `${totalResults.toLocaleString()} results`}</span>
        <button type="button" onClick={onClose} className="ml-auto text-gray-400 transition hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Search input */}
      <div className="border-b border-white/5 px-4 py-2">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="h-8 w-full rounded border border-white/10 bg-[#1a1a1e] px-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-white/20"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {!loading && results === null && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            Press Enter to search messages
          </div>
        )}

        {!loading && results?.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}

        {!loading && results?.length > 0 && (
          <div className="flex flex-col gap-0.5 p-2">
            {results.map((msg) => (
              <SearchResultMessage
                key={msg.id}
                message={msg}
                guildId={guildId}
                onClick={() => goToMessage(msg)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => search(query, offset - pageSize)}
            className="rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => search(query, offset + pageSize)}
            className="rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscordSearchPanel;
