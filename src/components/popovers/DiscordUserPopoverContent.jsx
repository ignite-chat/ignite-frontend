import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { UserCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { DiscordService } from '../../discord/services/discord.service';
import { DiscordApiService } from '../../discord/services/discord-api.service';
import { useDiscordGuildsStore } from '../../discord/store/discord-guilds.store';
import { useDiscordUsersStore } from '../../discord/store/discord-users.store';

const DISCORD_EPOCH = 1420070400000;

const getCreatedAt = (userId) => {
  const timestamp = Number(BigInt(userId) >> 22n) + DISCORD_EPOCH;
  return new Date(timestamp);
};

const getRoleColor = (color) => {
  if (!color || color === 0) return '#99aab5';
  return `#${color.toString(16).padStart(6, '0')}`;
};

const DiscordUserPopoverContent = ({ author, member, guildId, onOpenProfile }) => {
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const storeUser = useDiscordUsersStore((s) => s.users[author.id]);
  const [profile, setProfile] = useState(null);

  const user = { ...author, ...storeUser };
  const guild = guildId ? guilds.find((g) => g.id === guildId) : null;

  const displayName = member?.nick || user.global_name || user.username;
  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 80);

  const createdAt = useMemo(() => getCreatedAt(user.id), [user.id]);

  const bannerStyle = useMemo(() => {
    const bannerUrl = profile?.user?.banner
      ? DiscordService.getUserBannerUrl(user.id, profile.user.banner, 600)
      : null;
    const bannerColor = profile?.user?.banner_color || profile?.user?.accent_color;

    if (bannerUrl) {
      return { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (bannerColor) {
      const color = typeof bannerColor === 'number'
        ? `#${bannerColor.toString(16).padStart(6, '0')}`
        : bannerColor;
      return { backgroundColor: color };
    }
    return { backgroundColor: '#5865f2' };
  }, [profile, user.id]);

  const roles = useMemo(() => {
    if (!member?.roles || !guild?.roles) return [];
    return guild.roles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0));
  }, [member, guild, guildId]);

  useEffect(() => {
    DiscordApiService.getUserProfile(author.id, guildId)
      .then(setProfile)
      .catch(() => {});
  }, [author.id, guildId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  return (
    <div className="w-80 overflow-hidden rounded-lg bg-[#111214] shadow-xl">
      <div className="relative h-[60px]">
        <div className="h-full" style={bannerStyle} />

        <div className="absolute -bottom-8 left-4">
          <button
            type="button"
            onClick={() => onOpenProfile?.()}
            className="group relative rounded-full ring-[5px] ring-[#111214]"
          >
            <img
              src={avatarUrl}
              alt={user.username}
              className="size-[68px] rounded-full object-cover select-none"
              draggable="false"
            />
            {user.avatar_decoration_data?.asset && (
              <img
                src={`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=80`}
                alt=""
                className="pointer-events-none absolute inset-0 size-[68px]"
                draggable="false"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="text-[10px] font-bold uppercase text-white drop-shadow-md">
                View Profile
              </span>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-10 px-4 pb-4">
        <div className="rounded-md bg-[#111214] p-1">
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-white">
            {displayName}
            {user.bot && (
              <span className="inline-flex items-center rounded bg-[#5865f2] px-1 py-px text-[10px] font-medium uppercase text-white">
                Bot
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-gray-300">{user.username}</p>

          {profile?.user?.bio && (
            <div className="mt-3">
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                About Me
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-300">
                {profile.user.bio}
              </p>
            </div>
          )}

          {member?.joined_at && (
            <div className="mt-3">
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Server Member Since
              </h3>
              <p className="text-[13px] text-gray-300">
                {new Date(member.joined_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="mt-3">
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Discord Member Since
            </h3>
            <p className="text-[13px] text-gray-300">
              {createdAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {roles.length > 0 && (
            <div className="mt-3">
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Roles
              </h3>
              <div className="flex flex-wrap gap-1">
                {roles.map((role) => (
                  <span
                    key={role.id}
                    className="flex items-center gap-1 rounded bg-[#2b2d31] px-2 py-0.5 text-[11px] font-bold text-gray-200"
                  >
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: getRoleColor(role.color) }}
                    />
                    {role.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 border-t border-white/5 pt-2">
            <button
              onClick={handleCopyId}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5"
            >
              Copy User ID
              <UserCircle size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordUserPopoverContent;
