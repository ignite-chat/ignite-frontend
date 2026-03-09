import { useEffect, useMemo } from 'react';
import { GameController, MusicNote, Eye, Trophy, Broadcast } from '@phosphor-icons/react';
import { useDiscordActivitiesStore, ActivityType } from '../store/discord-activities.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { DiscordService } from '../services/discord.service';
import DiscordUserProfileModal from './DiscordUserProfileModal';
import { useModalStore } from '@/store/modal.store';

const statusColors = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

const RELEVANT_TYPES = new Set([
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
    case ActivityType.LISTENING: return 'Listening to';
    case ActivityType.WATCHING: return 'Watching';
    case ActivityType.COMPETING: return 'Competing in';
    default: return null;
  }
};

const getActivityImageUrl = (activity) => {
  if (!activity.assets?.large_image) return null;
  const img = activity.assets.large_image;
  if (img.startsWith('mp:')) {
    return `https://media.discordapp.net/${img.slice(3)}`;
  }
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
  }
  return null;
};

const ActivityTypeIcon = ({ type, size = 16 }) => {
  switch (type) {
    case ActivityType.PLAYING: return <GameController size={size} weight="fill" />;
    case ActivityType.STREAMING: return <Broadcast size={size} weight="fill" />;
    case ActivityType.LISTENING: return <MusicNote size={size} weight="fill" />;
    case ActivityType.WATCHING: return <Eye size={size} weight="fill" />;
    case ActivityType.COMPETING: return <Trophy size={size} weight="fill" />;
    default: return <GameController size={size} weight="fill" />;
  }
};

const formatElapsed = (ms) => {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
};

const AppIcon = ({ activity }) => {
  const appIcon = useDiscordActivitiesStore((s) =>
    activity.application_id ? s.appIcons[activity.application_id] : undefined
  );
  const fetchAppIcon = useDiscordActivitiesStore((s) => s.fetchAppIcon);
  const largeImage = getActivityImageUrl(activity);

  useEffect(() => {
    if (!largeImage && activity.application_id) {
      fetchAppIcon(activity.application_id);
    }
  }, [activity.application_id, largeImage, fetchAppIcon]);

  const iconUrl = largeImage || appIcon;

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="size-8 shrink-0 rounded object-cover"
      />
    );
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-[#2b2d31] text-gray-400">
      <ActivityTypeIcon type={activity.type} />
    </div>
  );
};

const ActiveUserCard = ({ userId, activities }) => {
  const user = useDiscordUsersStore((s) => s.users[userId]);
  if (!user) return null;

  const activity = activities.find((a) => RELEVANT_TYPES.has(a.type));
  if (!activity) return null;

  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 40);
  const status = user.status || 'offline';
  const label = getActivityLabel(activity.type);
  const elapsed = activity.timestamps?.start || activity.created_at;

  return (
    <div className="cursor-pointer rounded-lg bg-[#111214] p-3 transition-colors hover:bg-[#1a1a1e]" onClick={() => useModalStore.getState().push(DiscordUserProfileModal, { author: user })}>
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" />
          <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#111214] ${statusColors[status] || statusColors.offline}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {user.global_name || user.username}
          </div>
          <div className={`truncate text-[11px] font-medium ${activity.type === ActivityType.STREAMING ? 'text-[#9147ff]' : 'text-gray-400'}`}>
            {label} {activity.name}
            {elapsed ? ` - ${formatElapsed(elapsed)}` : ''}
          </div>
        </div>
        <AppIcon activity={activity} />
      </div>
    </div>
  );
};

const DiscordActivitiesPanel = () => {
  const allActivities = useDiscordActivitiesStore((s) => s.activities);

  const activeUsers = useMemo(() => {
    return Object.entries(allActivities)
      .filter(([, acts]) =>
        acts.some((a) => RELEVANT_TYPES.has(a.type))
      )
      .sort(([, a], [, b]) => {
        const aAct = a.find((x) => RELEVANT_TYPES.has(x.type));
        const bAct = b.find((x) => RELEVANT_TYPES.has(x.type));
        return (aAct?.name || '').localeCompare(bAct?.name || '');
      });
  }, [allActivities]);

  return (
    <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-white/5 bg-[#1a1a1e]">
      <div className="p-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        Active Now — {activeUsers.length}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {activeUsers.length === 0 && (
          <div className="rounded-lg bg-[#232428] p-4 text-center">
            <p className="text-sm font-semibold text-gray-300">It's quiet for now...</p>
            <p className="mt-1 text-[13px] leading-snug text-gray-500">
              When a friend starts an activity—like playing a game or hanging out on voice—we'll show it here!
            </p>
          </div>
        )}
        {activeUsers.map(([userId, acts]) => (
          <ActiveUserCard key={userId} userId={userId} activities={acts} />
        ))}
      </div>
    </div>
  );
};

export default DiscordActivitiesPanel;
