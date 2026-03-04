import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { UserCircle, GameController, MusicNote, Broadcast, Eye, Trophy } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useModalStore } from '@/store/modal.store';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordMembersStore } from '../store/discord-members.store';
import { useDiscordActivitiesStore, ActivityType } from '../store/discord-activities.store';

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

const RELEVANT_ACTIVITY_TYPES = new Set([
  ActivityType.PLAYING,
  ActivityType.STREAMING,
  ActivityType.LISTENING,
  ActivityType.WATCHING,
  ActivityType.COMPETING,
]);

const getActivityLabel = (type) => {
  switch (type) {
    case ActivityType.PLAYING: return 'Playing';
    case ActivityType.STREAMING: return 'Streaming';
    case ActivityType.LISTENING: return 'Listening to Spotify';
    case ActivityType.WATCHING: return 'Watching';
    case ActivityType.COMPETING: return 'Competing in';
    default: return null;
  }
};

const getActivityImageUrl = (activity) => {
  if (!activity.assets?.large_image) return null;
  const img = activity.assets.large_image;
  if (img.startsWith('mp:')) return `https://media.discordapp.net/${img.slice(3)}`;
  if (activity.application_id) return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
  return null;
};

const getSmallImageUrl = (activity) => {
  if (!activity.assets?.small_image) return null;
  const img = activity.assets.small_image;
  if (img.startsWith('mp:')) return `https://media.discordapp.net/${img.slice(3)}`;
  if (activity.application_id) return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
  return null;
};

const formatElapsed = (ms) => {
  const totalSecs = Math.floor((Date.now() - ms) / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)} elapsed`;
  return `${pad(mins)}:${pad(secs)} elapsed`;
};

const ActivityTypeIcon = ({ type, size = 24 }) => {
  switch (type) {
    case ActivityType.PLAYING: return <GameController size={size} weight="fill" />;
    case ActivityType.STREAMING: return <Broadcast size={size} weight="fill" />;
    case ActivityType.LISTENING: return <MusicNote size={size} weight="fill" />;
    case ActivityType.WATCHING: return <Eye size={size} weight="fill" />;
    case ActivityType.COMPETING: return <Trophy size={size} weight="fill" />;
    default: return <GameController size={size} weight="fill" />;
  }
};

const ActivitySection = ({ activity }) => {
  const appIcon = useDiscordActivitiesStore((s) =>
    activity.application_id ? s.appIcons[activity.application_id] : undefined
  );
  const fetchAppIcon = useDiscordActivitiesStore((s) => s.fetchAppIcon);
  const label = getActivityLabel(activity.type);
  const largeImage = getActivityImageUrl(activity);
  const smallImage = getSmallImageUrl(activity);
  const isStreaming = activity.type === ActivityType.STREAMING;
  const isListening = activity.type === ActivityType.LISTENING;
  const elapsed = activity.timestamps?.start || activity.created_at;

  useEffect(() => {
    if (!largeImage && activity.application_id) {
      fetchAppIcon(activity.application_id);
    }
  }, [activity.application_id, largeImage, fetchAppIcon]);

  const iconUrl = largeImage || appIcon;

  return (
    <div className="space-y-2">
      <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isStreaming ? 'text-[#9147ff]' : isListening ? 'text-[#1db954]' : 'text-gray-400'}`}>
        {label}
      </h3>
      <div className="rounded-md bg-[#1a1a1e] p-2.5">
        <div className="flex gap-2.5">
          {iconUrl ? (
            <div className="relative shrink-0">
              <img
                src={iconUrl}
                alt={activity.assets?.large_text || ''}
                className="size-[60px] rounded-lg object-cover"
              />
              {smallImage && (
                <img
                  src={smallImage}
                  alt={activity.assets?.small_text || ''}
                  className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-[#1a1a1e] object-cover"
                  title={activity.assets?.small_text}
                />
              )}
            </div>
          ) : (
            <div className="flex size-[60px] shrink-0 items-center justify-center rounded-lg bg-[#2b2d31] text-gray-400">
              <ActivityTypeIcon type={activity.type} />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <div className="truncate text-sm font-semibold text-white">{activity.name}</div>
            {activity.details && (
              <div className="truncate text-[13px] text-gray-300">{activity.details}</div>
            )}
            {activity.state && (
              <div className="truncate text-[13px] text-gray-400">{activity.state}</div>
            )}
            {activity.party?.size && (
              <div className="text-[11px] text-gray-500">
                {activity.party.size[0]} of {activity.party.size[1]}
              </div>
            )}
            {elapsed && (
              <div className="text-[11px] text-gray-500">{formatElapsed(elapsed)}</div>
            )}
          </div>
        </div>
        {activity.buttons?.length > 0 && (
          <div className="mt-2 flex gap-2">
            {activity.buttons.map((btn, i) => (
              <div
                key={i}
                className="flex-1 truncate rounded bg-[#4e5058]/50 px-3 py-1.5 text-center text-xs font-medium text-gray-300"
              >
                {typeof btn === 'string' ? btn : btn.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DiscordUserProfileModal = ({ modalId, author, member: memberProp, guildId }) => {
  const closeModal = () => useModalStore.getState().close(modalId);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const storeUser = useDiscordUsersStore((s) => s.users[author?.id]);
  const storeMember = useDiscordMembersStore((s) => guildId && author?.id ? s.members[guildId]?.[author.id] : undefined);
  const [profile, setProfile] = useState(null);
  const [note, setNote] = useState('');
  const [rolesExpanded, setRolesExpanded] = useState(false);

  const userActivities = useDiscordActivitiesStore((s) => author?.id ? s.activities[author.id] : undefined);

  const member = memberProp || storeMember;
  const user = { ...author, ...storeUser };
  const guild = guildId ? guilds.find((g) => g.id === guildId) : null;

  const relevantActivities = useMemo(() => {
    if (!userActivities) return [];
    return userActivities.filter((a) => RELEVANT_ACTIVITY_TYPES.has(a.type));
  }, [userActivities]);

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
    const guildRoles = guild?.roles || guild?.properties?.roles;
    if (!member?.roles || !guildRoles) return [];
    return guildRoles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0));
  }, [member, guild, guildId]);

  useEffect(() => {
    if (!author?.id) return;
    setProfile(null);
    DiscordApiService.getUserProfile(author.id, guildId)
      .then(setProfile)
      .catch(() => {});
  }, [author?.id, guildId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  if (!author) return null;

  return (
    <Dialog open onOpenChange={closeModal}>
      <DialogContent aria-describedby={undefined} className="max-w-xl border-none bg-transparent p-0 shadow-2xl [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>User Profile</DialogTitle>
        </VisuallyHidden>
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
                    <span className="inline-flex items-center gap-0.5 rounded bg-[#5865f2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {(user.public_flags & 65536) !== 0 && (
                        <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M7.4,11.17,4,8.62,5,7.26l2,1.53L10.64,4l1.36,1Z" />
                        </svg>
                      )}
                      APP
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

              {relevantActivities.map((activity, i) => (
                <ActivitySection key={activity.application_id || activity.name || i} activity={activity} />
              ))}

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
                    {(rolesExpanded ? roles : roles.slice(0, 4)).map((role) => (
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
                    {!rolesExpanded && roles.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setRolesExpanded(true)}
                        className="flex items-center rounded bg-[#2b2d31] px-2 py-0.5 text-[11px] font-bold text-gray-200 transition-colors hover:bg-[#35373c]"
                      >
                        +{roles.length - 4}
                      </button>
                    )}
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
