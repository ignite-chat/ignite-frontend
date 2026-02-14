import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import api from '../../api';

const SearchModal = ({ open, onClose, channel, onPick }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setLoading(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const normalizeResults = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.messages)) return data.messages;
    return [];
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || !channel?.guild_id) return;

    setLoading(true);
    try {
      const res = await api.get(`/guilds/${channel.guild_id}/messages/search`, {
        params: { content: query },
      });
      setResults(normalizeResults(res.data));
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (id) => {
    onPick(id);
    onClose();
  };

  const grouped = useMemo(() => results, [results]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-2xl rounded-lg bg-gray-800 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">Search messages</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search in this guild..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded bg-gray-900 px-3 text-sm text-gray-100 outline-none placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-10 items-center justify-center rounded bg-gray-700 px-3 text-gray-100 hover:bg-gray-600 disabled:opacity-60"
          >
            <MagnifyingGlass className="size-5" />
          </button>
        </form>

        <div className="mt-4">
          {grouped.length === 0 ? (
            <div className="text-xs text-gray-400">No results.</div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {grouped.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handlePick(msg.id)}
                  className="w-full rounded bg-gray-900/60 p-2 text-left text-xs text-gray-100 hover:bg-primary/20"
                >
                  <span className="font-semibold">{msg.author?.name || msg.author?.username}:</span>{' '}
                  {msg.content}
                  <span className="ml-2 text-gray-500">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                  <span className="ml-2 text-primary underline">Jump</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
