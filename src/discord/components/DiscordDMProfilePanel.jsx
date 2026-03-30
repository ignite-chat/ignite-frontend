import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UserCircle, GameController, Globe, Users } from '@phosphor-icons/react';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { useDiscordProfilesStore } from '../store/discord-profiles.store';
import { useDiscordActivitiesStore, ActivityType } from '../store/discord-activities.store';
import { useDiscordPreferencesStore } from '../store/discord-preferences.store';
import { useDiscordRelationshipsStore, RelationshipType } from '../store/discord-relationships.store';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';
import DiscordStatusIndicator from './DiscordStatusIndicator';
import DiscordClanTag from './DiscordClanTag';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import { useModalStore } from '@/store/modal.store';
import { useAverageColor } from '@/ignite/hooks/useAverageColor';
import DiscordBadges from './DiscordBadges';

const DISCORD_EPOCH = 1420070400000;

const getCreatedAt = (userId) => {
  const timestamp = Number(BigInt(userId) >> 22n) + DISCORD_EPOCH;
  return new Date(timestamp);
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

const ElapsedTimer = ({ start }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[11px] text-gray-500">{formatElapsed(start)}</span>;
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

const DiscordDMProfilePanel = ({ channel, isOpen }) => {
  const showAvatarDecorations = useDiscordPreferencesStore((s) => s.showAvatarDecorations);
  const [activeTab, setActiveTab] = useState('about');
  const [note, setNote] = useState('');

  const recipientIds = channel?.recipient_ids || [];
  const recipientId = recipientIds[0];

  const user = useDiscordUsersStore((s) => recipientId ? s.users[recipientId] : undefined);
  const profile = useDiscordProfilesStore((s) => recipientId ? s.getProfile(recipientId) : undefined);
  const fetchProfile = useDiscordProfilesStore((s) => s.fetchProfile);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const relationships = useDiscordRelationshipsStore((s) => s.relationships);
  const userActivities = useDiscordActivitiesStore((s) => recipientId ? s.activities[recipientId] : undefined);

  const relationship = relationships.find((r) => r.id === recipientId);
  const isFriend = relationship?.type === RelationshipType.FRIEND;

  useEffect(() => {
    if (!recipientId) return;
    fetchProfile(recipientId);
  }, [recipientId, fetchProfile]);

  const displayName = user?.global_name || user?.username;
  const avatarUrl = user ? DiscordService.getUserAvatarUrl(user.id, user.avatar, 128) : null;
  const avatarAvgColor = useAverageColor(avatarUrl);
  const createdAt = useMemo(() => (recipientId ? getCreatedAt(recipientId) : null), [recipientId]);

  const bannerStyle = useMemo(() => {
    const bannerUrl = profile?.user?.banner
      ? DiscordService.getUserBannerUrl(recipientId, profile.user.banner, 600)
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
    if (avatarAvgColor) {
      return { backgroundColor: avatarAvgColor };
    }
    return { backgroundColor: '#5865f2' };
  }, [profile, recipientId, avatarAvgColor]);

  const relevantActivities = useMemo(() => {
    if (!userActivities) return [];
    return userActivities.filter((a) => RELEVANT_ACTIVITY_TYPES.has(a.type));
  }, [userActivities]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('Copied User ID');
  };

  const handleAddFriend = async () => {
    try {
      await DiscordApiService.sendFriendRequest(user.id);
      toast.success(`Sent friend request to ${displayName}`);
    } catch {
      toast.error('Failed to send friend request');
    }
  };

  if (!user || !isOpen) return null;

  const tabs = [
    { key: 'about', label: 'About Me' },
    { key: 'servers', label: 'Mutual Servers', count: profile?.mutual_guilds?.length },
    { key: 'friends', label: 'Mutual Friends', count: profile?.mutual_friends_count },
  ];

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-white/5 bg-[#111214] md:w-80">
      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        <div className="h-[100px] w-full" style={bannerStyle} />

        <div className="relative px-4 pb-4">
          {/* Avatar */}
          <div className="absolute -top-[40px] left-4">
            <button
              type="button"
              className="group relative rounded-full ring-4 ring-[#111214]"
              onClick={() => useModalStore.getState().push(DiscordUserProfileModal, { userId: recipientId })}
            >
              <img
                src={avatarUrl}
                alt={user.username}
                className="size-[80px] rounded-full object-cover select-none"
                draggable="false"
              />
              {showAvatarDecorations && user.avatar_decoration_data?.asset && (
                <img
                  src={`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=96`}
                  alt=""
                  className="pointer-events-none absolute inset-0 size-[80px]"
                  draggable="false"
                />
              )}
              <div className="absolute inset-0 rounded-full bg-black/0 transition-colors group-hover:bg-black/20" />
              <DiscordStatusIndicator status={user.status} clientStatus={user.client_status} processedAt={user.processed_at_timestamp} invisible={user.invisible} size="lg" borderColor="#111214" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex h-12 justify-end gap-2 pt-2">
            {!isFriend && (
              <button
                onClick={handleAddFriend}
                title="Add Friend"
                className="flex size-8 items-center justify-center rounded bg-[#2b2d31] text-gray-300 transition hover:bg-[#35373c] hover:text-white"
              >
                <Users size={16} />
              </button>
            )}
            <button
              onClick={handleCopyId}
              title="Copy User ID"
              className="flex size-8 items-center justify-center rounded bg-[#2b2d31] text-gray-300 transition hover:bg-[#35373c] hover:text-white"
            >
              <UserCircle size={16} />
            </button>
          </div>

          {/* Name */}
          <div
            className="mt-1 cursor-pointer space-y-0.5"
            onClick={() => useModalStore.getState().push(DiscordUserProfileModal, { userId: recipientId })}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-lg font-bold text-white hover:underline">
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
                {!user.bot && <DiscordClanTag userId={user.id} size="md" />}
              </h2>
              <DiscordBadges badges={profile?.badges} />
            </div>
            <div className="text-xs font-medium text-gray-400">{user.username}</div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-3 border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'border-b-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                  activeTab === tab.key
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-px text-[9px]">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-4">
            {/* About Me */}
            {activeTab === 'about' && (
              <>
                {profile?.user?.bio && (
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">About Me</h3>
                    <div className="text-[13px] leading-normal text-gray-200">
                      <DiscordMarkdownRenderer nodes={parseMarkdown(profile.user.bio)} />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Discord Member Since</h3>
                  <div className="text-[13px] text-gray-200">
                    {createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Activity */}
                {relevantActivities.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {getActivityLabel(relevantActivities[0].type)}
                    </h3>
                    {relevantActivities.map((activity, i) => (
                      <div key={i} className="rounded-md bg-[#1a1a1e] p-2.5">
                        <div className="truncate text-sm font-semibold text-white">{activity.name}</div>
                        {activity.details && <div className="truncate text-[12px] text-gray-300">{activity.details}</div>}
                        {activity.state && <div className="truncate text-[12px] text-gray-400">{activity.state}</div>}
                        {(activity.timestamps?.start || activity.created_at) && (
                          <ElapsedTimer start={activity.timestamps?.start || activity.created_at} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Note <span className="text-[9px] font-medium lowercase opacity-60">(only visible to you)</span>
                  </h3>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Click to add a note"
                    className="min-h-[36px] w-full resize-none rounded bg-transparent p-1 text-[12px] text-gray-200 transition-colors placeholder:text-gray-500 hover:bg-white/5 focus:outline-none"
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Mutual Servers */}
            {activeTab === 'servers' && (
              <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
                {profile?.mutual_guilds?.length > 0 ? (
                  profile.mutual_guilds.map((mg) => {
                    const guild = guilds.find((g) => g.id === mg.id);
                    const iconUrl = guild
                      ? DiscordService.getGuildIconUrl(guild.id, guild.properties?.icon || guild.icon, 32)
                      : null;
                    const name = guild?.properties?.name || guild?.name || mg.id;
                    return (
                      <div
                        key={mg.id}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
                      >
                        {iconUrl ? (
                          <img src={iconUrl} alt="" className="size-8 rounded-full" draggable="false" />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
                            {name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate text-xs font-medium text-gray-200">{name}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                    <Globe size={32} weight="light" />
                    <span className="mt-2 text-sm">No mutual servers</span>
                  </div>
                )}
              </div>
            )}

            {/* Mutual Friends */}
            {activeTab === 'friends' && (
              <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
                {profile?.mutual_friends?.length > 0 ? (
                  profile.mutual_friends.map((friend) => {
                    const friendUser = friend.user || friend;
                    const friendAvatarUrl = DiscordService.getUserAvatarUrl(friendUser.id, friendUser.avatar, 32);
                    return (
                      <div
                        key={friendUser.id}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
                      >
                        <img src={friendAvatarUrl} alt="" className="size-8 rounded-full object-cover" draggable="false" />
                        <span className="truncate text-xs font-medium text-gray-200">
                          {friendUser.global_name || friendUser.username}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                    <Users size={32} weight="light" />
                    <span className="mt-2 text-sm">No mutual friends</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordDMProfilePanel;
