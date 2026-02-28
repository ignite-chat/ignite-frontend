import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UserCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordUsersStore } from '../store/discord-users.store';

const DISCORD_EPOCH = 1420070400000;

const getCreatedAt = (userId) => {
  const timestamp = Number(BigInt(userId) >> 22n) + DISCORD_EPOCH;
  return new Date(timestamp);
};

const getRoleColor = (color) => {
  if (!color || color === 0) return '#99aab5';
  return `#${color.toString(16).padStart(6, '0')}`;
};

const statusColors = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

const DiscordUserProfileModal = ({ author, member, guildId, open, onOpenChange }) => {
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const storeUser = useDiscordUsersStore((s) => s.users[author?.id]);
  const [profile, setProfile] = useState(null);
  const [note, setNote] = useState('');

  const user = { ...author, ...storeUser };
  const guild = guildId ? guilds.find((g) => g.id === guildId) : null;

  const displayName = member?.nick || user?.global_name || user?.username;
  const avatarUrl = user?.id ? DiscordService.getUserAvatarUrl(user.id, user.avatar, 128) : null;

  const createdAt = useMemo(() => (user?.id ? getCreatedAt(user.id) : null), [user?.id]);

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
  }, [profile, user?.id]);

  const roles = useMemo(() => {
    if (!member?.roles || !guild?.roles) return [];
    return guild.roles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0));
  }, [member, guild, guildId]);

  useEffect(() => {
    if (!open || !author?.id) return;
    setProfile(null);
    DiscordApiService.getUserProfile(author.id, guildId)
      .then(setProfile)
      .catch(() => {});
  }, [open, author?.id, guildId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  if (!author) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-none bg-transparent p-0 shadow-2xl [&>button]:hidden">
        <div className="w-full overflow-hidden rounded-xl bg-[#111214]">
          {/* Banner */}
          <div className="h-[120px] w-full" style={bannerStyle} />

          <div className="relative px-4 pb-4">
            {/* Avatar */}
            <div className="absolute -top-[50px] left-4">
              <div className="relative rounded-full ring-[6px] ring-[#111214]">
                <img
                  src={avatarUrl}
                  alt={user.username}
                  className="size-[94px] rounded-full object-cover select-none"
                  draggable="false"
                />
                {user.avatar_decoration_data?.asset && (
                  <img
                    src={`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=96`}
                    alt=""
                    className="pointer-events-none absolute inset-0 size-[94px]"
                    draggable="false"
                  />
                )}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 size-6 rounded-full border-4 border-[#111214] ${statusColors[user.status] || statusColors.offline}`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex h-14 justify-end gap-2 pt-3">
              <button
                onClick={handleCopyId}
                title="Copy User ID"
                className="flex size-9 items-center justify-center rounded bg-[#2b2d31] text-gray-300 transition hover:bg-[#35373c] hover:text-white"
              >
                <UserCircle size={20} />
              </button>
            </div>

            {/* Profile Body */}
            <div className="mt-4 space-y-5 px-1">
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                  {displayName}
                  {user.bot && (
                    <span className="inline-flex items-center rounded bg-[#5865f2] px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
                      Bot
                    </span>
                  )}
                </h2>
                <div className="text-sm font-medium text-gray-300">{user.username}</div>
              </div>

              {profile?.user?.bio && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    About Me
                  </h3>
                  <p className="text-[15px] leading-normal text-gray-200">
                    {profile.user.bio}
                  </p>
                </div>
              )}

              {member?.joined_at && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Server Member Since
                  </h3>
                  <div className="text-sm text-gray-200">
                    {new Date(member.joined_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Discord Member Since
                </h3>
                <div className="text-sm text-gray-200">
                  {createdAt?.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {roles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
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

              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Note{' '}
                  <span className="text-[9px] font-medium lowercase opacity-60">
                    (only visible to you)
                  </span>
                </h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Click to add a note"
                  className="min-h-[40px] w-full resize-none rounded bg-transparent p-1 text-[13px] text-gray-200 transition-colors placeholder:text-gray-500 hover:bg-white/5 focus:outline-none"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscordUserProfileModal;
