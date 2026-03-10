import { useState } from 'react';
import { Copy, CaretRight, CaretDown } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useModalStore } from '@/store/modal.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordReadStatesStore } from '../store/discord-readstates.store';
import { useDiscordGuildSettingsStore } from '../store/discord-guild-settings.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';

const Section = ({ title, data, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const json = JSON.stringify(data, null, 2);
  const count = Array.isArray(data) ? data.length : Object.keys(data || {}).length;

  return (
    <div className="rounded border border-white/5">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-200 hover:bg-white/5"
        onClick={() => setOpen(!open)}
      >
        {open ? <CaretDown size={14} /> : <CaretRight size={14} />}
        <span>{title}</span>
        <span className="ml-auto text-xs text-gray-500">{count} {count === 1 ? 'item' : 'items'}</span>
        <button
          type="button"
          className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(json);
            toast.success(`Copied ${title}`);
          }}
        >
          <Copy size={14} />
        </button>
      </button>
      {open && (
        <pre className="max-h-80 overflow-auto border-t border-white/5 bg-black/30 p-3 text-[11px] leading-relaxed text-gray-300">
          {json}
        </pre>
      )}
    </div>
  );
};

const DebugInfoModal = ({ modalId, guildId }) => {
  const closeModal = () => useModalStore.getState().close(modalId);

  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const guild = guilds.find((g) => g.id === guildId);
  const members = useDiscordGuildsStore((s) => s.guildMembers[guildId] || []);
  const channels = useDiscordChannelsStore((s) => s.channels);
  const readStates = useDiscordReadStatesStore((s) => s.readStates);
  const guildSettings = useDiscordGuildSettingsStore((s) => s.settings[guildId]);

  const guildChannels = channels.filter((c) => c.guild_id === guildId);
  const guildReadStates = {};
  for (const ch of guildChannels) {
    if (readStates[ch.id]) guildReadStates[ch.id] = readStates[ch.id];
  }

  const allData = {
    guild,
    channels: guildChannels,
    members,
    settings: guildSettings || null,
    readStates: guildReadStates,
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(allData, null, 2));
    toast.success('Copied all debug info');
  };

  const guildName = guild?.properties?.name || guild?.name || guildId;

  return (
    <Dialog open onOpenChange={closeModal}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col gap-0 overflow-hidden border-white/10 bg-[#1e1f22] p-0">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <DialogTitle className="text-base font-semibold text-white">
            Debug Info — {guildName}
          </DialogTitle>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
            onClick={handleCopyAll}
          >
            <Copy size={14} />
            Copy All
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <Section title="Guild" data={guild} defaultOpen />
          <Section title={`Channels (${guildChannels.length})`} data={guildChannels} />
          <Section title={`Members (${members.length})`} data={members} />
          <Section title="Settings" data={guildSettings || {}} />
          <Section title={`Read States (${Object.keys(guildReadStates).length})`} data={guildReadStates} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebugInfoModal;
