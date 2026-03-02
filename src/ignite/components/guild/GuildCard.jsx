import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const GuildCard = ({ guild, isJoined, onJoin, className }) => {
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const iconUrl = guild.icon_file_id ? `${CDN_BASE}/icons/${guild.icon_file_id}` : null;
  const bannerUrl = guild.banner_file_id ? `${CDN_BASE}/banners/${guild.banner_file_id}` : null;

  const initials = (guild.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (isJoined || joining || !onJoin) return;
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
      className={`group flex flex-col overflow-hidden rounded-lg border border-white/5 bg-[#1a1a1d] transition-all duration-200 hover:border-white/10 hover:bg-[#1e1e22] ${isJoined ? 'cursor-pointer' : ''} ${className || ''}`}
    >
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-primary/30 to-primary/10">
        {bannerUrl && (
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute -bottom-8 left-4">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={guild.name}
              className="size-16 rounded-2xl border-4 border-[#1a1a1d] object-cover transition-all group-hover:border-[#1e1e22]"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl border-4 border-[#1a1a1d] bg-[#2a2a2e] text-xl font-bold text-gray-300 transition-all group-hover:border-[#1e1e22]">
              {initials || guild.name?.charAt(0)?.toUpperCase()}
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

          {onJoin && (
            isJoined ? (
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
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default GuildCard;
