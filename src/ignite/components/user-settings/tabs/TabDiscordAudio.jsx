import { useMemo, useCallback } from 'react';
import { SpeakerHigh, SpeakerSlash, Trash, MonitorPlay, Microphone } from '@phosphor-icons/react';
import { Slider } from '@/components/ui/slider';
import { useDiscordAudioSettingsStore } from '@/discord/store/discord-audio-settings.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { DiscordService } from '@/discord/services/discord.service';
import { DiscordApiService } from '@/discord/services/discord-api.service';
import { encodeAudioContextSettings } from '@/discord/utils/proto-decode';

const formatModifiedAt = (ts) => {
  if (!ts || Number(ts) === 0) return '';
  const date = new Date(Number(ts));
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (isToday) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} at ${time}`;
};

function syncToDiscord() {
  const { users, streams } = useDiscordAudioSettingsStore.getState();
  const toArr = (map) => Object.values(map).map((e) => ({
    id: e.id, muted: e.muted, volume: e.volume,
    soundboardMuted: e.soundboardMuted, modifiedAt: e.modifiedAt,
  }));
  const proto = encodeAudioContextSettings(toArr(users), toArr(streams));
  DiscordApiService.updateSettingsProto(proto).catch((err) =>
    console.error('[Discord Audio Settings] Failed to sync:', err)
  );
}

const VolumeSlider = ({ icon: Icon, value, muted, onVolume, onMute, title, modifiedAt }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => onMute(!muted)}
      className={`shrink-0 rounded-md p-1.5 transition-colors ${
        muted ? 'text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:bg-white/10'
      }`}
      title={muted ? `Unmute ${title}` : `Mute ${title}`}
    >
      <Icon size={22} weight="fill" />
    </button>
    <Slider
      value={[value]}
      min={0}
      max={200}
      step={1}
      onValueChange={(v) => onVolume(v[0])}
      disabled={muted}
      className="flex-1"
    />
    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-400">
      {value}%
    </span>
    {modifiedAt && (
      <span className="shrink-0 text-[11px] text-gray-600">{formatModifiedAt(modifiedAt)}</span>
    )}
  </div>
);

const CombinedRow = ({ userId, userEntry, streamEntry }) => {
  const user = useDiscordUsersStore((s) => s.users[userId]);
  const setUserVolume = useDiscordAudioSettingsStore((s) => s.setUserVolume);
  const setUserMuted = useDiscordAudioSettingsStore((s) => s.setUserMuted);
  const removeUser = useDiscordAudioSettingsStore((s) => s.removeUser);
  const setStreamVolume = useDiscordAudioSettingsStore((s) => s.setStreamVolume);
  const setStreamMuted = useDiscordAudioSettingsStore((s) => s.setStreamMuted);
  const removeStream = useDiscordAudioSettingsStore((s) => s.removeStream);

  const displayName = user?.global_name || user?.username || userId;
  const avatarUrl = user
    ? DiscordService.getUserAvatarUrl(user.id, user.avatar)
    : DiscordService.getUserAvatarUrl(userId, null);
  const sublabel = user?.username && user.username !== displayName ? `@${user.username}` : null;

  const handleRemove = useCallback(() => {
    if (userEntry) removeUser(userId);
    if (streamEntry) removeStream(streamEntry.id);
    syncToDiscord();
  }, [userId, userEntry, streamEntry, removeUser, removeStream]);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
      <img src={avatarUrl} alt={displayName} className="size-10 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-200">{displayName}</span>
          {sublabel && <span className="truncate text-xs text-gray-500">{sublabel}</span>}
        </div>
        {userEntry && (
          <VolumeSlider
            icon={Microphone}
            title="Voice"
            value={userEntry.volume}
            muted={userEntry.muted}
            onVolume={(v) => { setUserVolume(userId, v); syncToDiscord(); }}
            onMute={(m) => { setUserMuted(userId, m); syncToDiscord(); }}
            modifiedAt={userEntry.modifiedAt}
          />
        )}
        {streamEntry && (
          <VolumeSlider
            icon={MonitorPlay}
            title="Stream"
            value={streamEntry.volume}
            muted={streamEntry.muted}
            onVolume={(v) => { setStreamVolume(streamEntry.id, v); syncToDiscord(); }}
            onMute={(m) => { setStreamMuted(streamEntry.id, m); syncToDiscord(); }}
            modifiedAt={streamEntry.modifiedAt}
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleRemove}
        className="shrink-0 self-start rounded p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-red-400"
        title="Remove override"
      >
        <Trash size={16} />
      </button>
    </div>
  );
};

/** Extract userId from a stream key (e.g. "guild:channel:userId") */
function resolveStreamUserId(streamKey) {
  const parts = streamKey.split(':');
  return parts[parts.length - 1];
}

const TabDiscordAudio = () => {
  const users = useDiscordAudioSettingsStore((s) => s.users);
  const streams = useDiscordAudioSettingsStore((s) => s.streams);

  // Merge users and streams into a single list keyed by userId
  const entries = useMemo(() => {
    const map = {};

    for (const entry of Object.values(users)) {
      map[entry.id] = { userId: entry.id, userEntry: entry, streamEntry: null };
    }

    for (const entry of Object.values(streams)) {
      const uid = resolveStreamUserId(entry.id);
      if (map[uid]) {
        map[uid].streamEntry = entry;
      } else {
        map[uid] = { userId: uid, userEntry: null, streamEntry: entry };
      }
    }

    return Object.values(map).sort((a, b) => {
      const aTime = BigInt(Math.max(
        Number(a.userEntry?.modifiedAt ?? 0n),
        Number(a.streamEntry?.modifiedAt ?? 0n),
      ));
      const bTime = BigInt(Math.max(
        Number(b.userEntry?.modifiedAt ?? 0n),
        Number(b.streamEntry?.modifiedAt ?? 0n),
      ));
      return Number(bTime - aTime);
    });
  }, [users, streams]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">User Volumes</h2>
        <p className="mt-1 text-sm text-gray-400">
          Per-user volume and mute settings synced with Discord. Changes are saved automatically.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg bg-white/5 p-8 text-center">
          <SpeakerHigh size={40} weight="thin" className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400">No per-user volume overrides yet.</p>
          <p className="mt-1 text-xs text-gray-500">
            Right-click a user in voice to adjust their volume. Settings will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {entries.length} user{entries.length !== 1 ? 's' : ''}
          </h3>
          {entries.map((e) => (
            <CombinedRow
              key={e.userId}
              userId={e.userId}
              userEntry={e.userEntry}
              streamEntry={e.streamEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TabDiscordAudio;
