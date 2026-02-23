import { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlass, Compass } from '@phosphor-icons/react';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../store/guilds.store';
import DefaultLayout from '../layouts/DefaultLayout';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import GuildCard from '../components/Guild/GuildCard';

const GuildDiscovery = () => {
  const { guilds } = useGuildsStore();
  const [discoveryGuilds, setDiscoveryGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const joinedGuildIds = new Set(guilds.map((g) => g.id));

  const fetchGuilds = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const data = await GuildsService.discoverGuilds(query || undefined);
      setDiscoveryGuilds(data);
    } catch (err) {
      console.error('Failed to fetch discovery guilds:', err);
      setError('Failed to load servers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGuilds('');
  }, [fetchGuilds]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGuilds(search);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchGuilds]);

  const handleJoin = async (guildId) => {
    await GuildsService.joinGuild(guildId);
  };

  const discoverySidebar = (
    <aside className="flex w-80 cursor-default select-none flex-col bg-[#121214]">
      <div className="flex items-center gap-2 px-4 py-3 shadow-md">
        <Compass className="size-5 text-primary" weight="duotone" />
        <h2 className="text-base font-bold text-white">Discover</h2>
      </div>
      <div className="p-2">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            name="ignite-server-search"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-[#1a1a1d] pl-8 text-sm"
          />
        </div>
      </div>
    </aside>
  );

  return (
    <DefaultLayout sidebar={discoverySidebar}>
      <div className="flex flex-1 flex-col overflow-hidden bg-body">
        {/* Header */}
        <div className="border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <Compass className="size-6 text-primary" weight="duotone" />
            <h1 className="text-xl font-bold text-white">Discover Servers</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Find communities to join on Ignite
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <p className="text-muted-foreground">{error}</p>
              <Button variant="secondary" onClick={() => fetchGuilds(search)}>
                Retry
              </Button>
            </div>
          ) : discoveryGuilds.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <Compass className="size-12 text-muted-foreground/50" weight="duotone" />
              <p className="text-lg font-medium text-muted-foreground">No servers found</p>
              <p className="text-sm text-muted-foreground/70">
                {search ? 'Try a different search term' : 'No discoverable servers available yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {discoveryGuilds.map((guild) => (
                <GuildCard
                  key={guild.id}
                  guild={guild}
                  isJoined={joinedGuildIds.has(guild.id)}
                  onJoin={handleJoin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default GuildDiscovery;
