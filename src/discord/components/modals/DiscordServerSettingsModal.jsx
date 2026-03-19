import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModalStore } from '@/store/modal.store';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordGuildsStore } from '../../store/discord-guilds.store';
import { DiscordApiService } from '../../services/discord-api.service';

const AFK_TIMEOUT_OPTIONS = [
  { label: '1 Minute', value: 60 },
  { label: '5 Minutes', value: 300 },
  { label: '15 Minutes', value: 900 },
  { label: '30 Minutes', value: 1800 },
  { label: '1 Hour', value: 3600 },
];

const MFA_LEVEL_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Elevated', value: 1 },
];

const NSFW_LEVEL_OPTIONS = [
  { label: 'Default', value: 0 },
  { label: 'Explicit', value: 1 },
  { label: 'Safe', value: 2 },
  { label: 'Age Restricted', value: 3 },
];

const SYSTEM_CHANNEL_FLAGS = [
  { label: 'Suppress member join notifications', flag: 1 << 0 },
  { label: 'Suppress server boost notifications', flag: 1 << 1 },
  { label: 'Suppress server setup tips', flag: 1 << 2 },
  { label: 'Suppress member join sticker replies', flag: 1 << 3 },
  { label: 'Suppress role subscription purchase notifications', flag: 1 << 4 },
  { label: 'Suppress role subscription purchase notification replies', flag: 1 << 5 },
];

const CheckboxIndicator = ({ checked }) => (
  <div
    className={`flex size-[18px] shrink-0 items-center justify-center rounded-[3px] ${checked ? 'bg-[#5865f2]' : 'border-2 border-[#4e5058]'}`}
  >
    {checked && (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M3.5 7L6 9.5L10.5 5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </div>
);

const DiscordServerSettingsModal = ({ modalId, guild }) => {
  const channels = useDiscordChannelsStore((s) => s.channels);
  const props = guild?.properties || {};

  const [saving, setSaving] = useState(false);
  const [afkChannelId, setAfkChannelId] = useState(props.afk_channel_id || null);
  const [afkTimeout, setAfkTimeout] = useState(props.afk_timeout ?? 300);
  const [mfaLevel, setMfaLevel] = useState(props.mfa_level ?? 0);
  const [nsfwLevel, setNsfwLevel] = useState(props.nsfw_level ?? 0);
  const [systemChannelId, setSystemChannelId] = useState(props.system_channel_id || null);
  const [systemChannelFlags, setSystemChannelFlags] = useState(props.system_channel_flags ?? 0);
  const [rulesChannelId, setRulesChannelId] = useState(props.rules_channel_id || null);

  const onClose = () => useModalStore.getState().close(modalId);

  // Text channels only (type 0) for this guild
  const guildTextChannels = channels
    .filter((c) => c.guild_id === guild.id && c.type === 0)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Voice channels (type 2) for AFK channel
  const guildVoiceChannels = channels
    .filter((c) => c.guild_id === guild.id && c.type === 2)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const toggleFlag = (flag) => {
    setSystemChannelFlags((prev) => (prev & flag ? prev & ~flag : prev | flag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        afk_channel_id: afkChannelId,
        afk_timeout: afkTimeout,
        mfa_level: mfaLevel,
        nsfw_level: nsfwLevel,
        system_channel_id: systemChannelId,
        system_channel_flags: systemChannelFlags,
        rules_channel_id: rulesChannelId,
      };
      const updated = await DiscordApiService.modifyGuild(guild.id, body);
      useDiscordGuildsStore.getState().updateGuild(guild.id, updated);
      toast.success('Server settings updated.');
      onClose();
    } catch {
      // Error toast handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-[#1e1f22] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Server Settings</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* AFK Channel */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Inactive Channel
            </Label>
            <p className="text-xs text-gray-500">
              Members will be moved to this channel after the inactive timeout.
            </p>
            <Select
              value={afkChannelId || '__none__'}
              onValueChange={(v) => setAfkChannelId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="border-white/10 bg-[#2b2d31] text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2b2d31]">
                <SelectItem value="__none__">No Inactive Channel</SelectItem>
                {guildVoiceChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AFK Timeout */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Inactive Timeout
            </Label>
            <Select value={String(afkTimeout)} onValueChange={(v) => setAfkTimeout(Number(v))}>
              <SelectTrigger className="border-white/10 bg-[#2b2d31] text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2b2d31]">
                {AFK_TIMEOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-white/5" />

          {/* System Channel */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              System Messages Channel
            </Label>
            <p className="text-xs text-gray-500">
              The channel where system messages like welcome and boost events are sent.
            </p>
            <Select
              value={systemChannelId || '__none__'}
              onValueChange={(v) => setSystemChannelId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="border-white/10 bg-[#2b2d31] text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2b2d31]">
                <SelectItem value="__none__">No System Channel</SelectItem>
                {guildTextChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    # {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Channel Flags */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              System Channel Flags
            </Label>
            {SYSTEM_CHANNEL_FLAGS.map((item) => (
              <button
                key={item.flag}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 hover:bg-white/5"
                onClick={() => toggleFlag(item.flag)}
              >
                <span>{item.label}</span>
                <CheckboxIndicator checked={Boolean(systemChannelFlags & item.flag)} />
              </button>
            ))}
          </div>

          <Separator className="bg-white/5" />

          {/* Rules Channel */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Rules Channel
            </Label>
            <p className="text-xs text-gray-500">
              The channel where Community rules are displayed.
            </p>
            <Select
              value={rulesChannelId || '__none__'}
              onValueChange={(v) => setRulesChannelId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="border-white/10 bg-[#2b2d31] text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2b2d31]">
                <SelectItem value="__none__">No Rules Channel</SelectItem>
                {guildTextChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    # {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-white/5" />

          {/* MFA Level */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              2FA Requirement
            </Label>
            <p className="text-xs text-gray-500">
              Require members with moderation powers to have 2FA enabled.
            </p>
            <Select value={String(mfaLevel)} onValueChange={(v) => setMfaLevel(Number(v))}>
              <SelectTrigger className="border-white/10 bg-[#2b2d31] text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2b2d31]">
                {MFA_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NSFW Level */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">
              NSFW Level
            </Label>
            <Select value={String(nsfwLevel)} onValueChange={(v) => setNsfwLevel(Number(v))}>
              <SelectTrigger className="border-white/10 bg-[#2b2d31] text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2b2d31]">
                {NSFW_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/5 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-300 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="bg-[#5865f2] text-white hover:bg-[#4752c4]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DiscordServerSettingsModal;
