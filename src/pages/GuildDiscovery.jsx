import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Users, Compass } from '@phosphor-icons/react';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../store/guilds.store';
import DefaultLayout from '../layouts/DefaultLayout';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const GuildCard = ({ guild, isJoined, onJoin }) => {
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const iconUrl = guild.icon_file_id ? `${CDN_BASE}/icons/${guild.icon_file_id}` : null;
  const bannerUrl = guild.banner_file_id ? `${CDN_BASE}/banners/${guild.banner_file_id}` : null;

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (isJoined || joining) return;
    setJoining(true);
    try {
      await onJoin(guild.id);
    } finally {
      setJoining(false);
    }
  };

  const handleClick = () => {
    if (isJoined) {
      navigate(`/channels/${guild.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex flex-col overflow-hidden rounded-lg border border-white/5 bg-[#1a1a1d] transition-all duration-200 hover:border-white/10 hover:bg-[#1e1e22] ${isJoined ? 'cursor-pointer' : ''}`}
    >
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-primary/30 to-primary/10">
        {bannerUrl && (
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
        {/* Guild Icon overlapping banner */}
        <div className="absolute -bottom-8 left-4">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={guild.name}
              className="size-16 rounded-2xl border-4 border-[#1a1a1d] object-cover transition-all group-hover:border-[#1e1e22]"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl border-4 border-[#1a1a1d] bg-[#2a2a2e] text-xl font-bold text-gray-300 transition-all group-hover:border-[#1e1e22]">
              {guild.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-10">
        <h3 className="truncate text-base font-semibold text-white">{guild.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
          {guild.description || 'No description'}
        </p>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" weight="bold" />
            <span>{guild.member_count?.toLocaleString() ?? 0} Members</span>
          </div>

          {isJoined ? (
            <span className="text-xs font-medium text-green-500">Joined</span>
          ) : (
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={joining}
              className="h-7 px-3 text-xs"
            >
              {joining ? 'Joining...' : 'Join'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const GuildDiscovery = () => {
  const navigate = useNavigate();
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
    const guild = await GuildsService.joinGuild(guildId);
    if (guild) {
      navigate(`/channels/${guild.id}`);
    }
  };

  return (
    <DefaultLayout>
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

          {/* Search */}
          <div className="relative mt-4 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search servers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 bg-[#1a1a1d] pl-9"
            />
          </div>
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
