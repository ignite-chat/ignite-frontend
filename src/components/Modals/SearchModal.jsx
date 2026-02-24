import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import api from '../../api';
import { useModalStore } from '../../store/modal.store';

const SearchModal = ({ modalId, channel, onPick }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

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
    useModalStore.getState().close(modalId);
  };

  const grouped = useMemo(() => results, [results]);

  return (
    <Dialog open onOpenChange={() => useModalStore.getState().close(modalId)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type to search in this guild..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={loading}
            size="icon"
          >
            <MagnifyingGlass className="size-5" />
          </Button>
        </form>

        <div className="mt-4">
          {grouped.length === 0 ? (
            <div className="text-sm text-muted-foreground">No results.</div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {grouped.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handlePick(msg.id)}
                  className="w-full rounded-lg border border-white/5 bg-background p-3 text-left text-sm transition hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{msg.author?.name || msg.author?.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{msg.content}</p>
                  <span className="mt-2 inline-block text-xs text-primary">Jump to message →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
