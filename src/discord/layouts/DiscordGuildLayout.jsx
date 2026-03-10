import { useEffect, useState, useMemo } from 'react';
import { ShieldWarning } from '@phosphor-icons/react';
import ResizableSidebar from '@/components/ResizableSidebar';
import DiscordGuildChannelsSidebar from '../components/DiscordGuildChannelsSidebar';

const IncidentBanner = ({ incidents, guildId }) => {
  const details = useMemo(() => {
    const items = [];
    if (incidents.raid_detected_at) items.push('Raid detected');
    if (incidents.dm_spam_detected_at) items.push('DM spam detected');

    const now = new Date();
    if (incidents.invites_disabled_until) {
      const until = new Date(incidents.invites_disabled_until);
      if (until > now) items.push('Invites paused');
    }
    if (incidents.dms_disabled_until) {
      const until = new Date(incidents.dms_disabled_until);
      if (until > now) items.push('DMs paused');
    }
    return items;
  }, [incidents]);

  if (details.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-2">
      <ShieldWarning size={18} className="shrink-0 text-yellow-400" weight="fill" />
      <span className="min-w-0 flex-1 text-sm text-yellow-200">
        {details.join(' · ')}
      </span>
      <button
        type="button"
        className="shrink-0 rounded bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-200 transition hover:bg-yellow-500/30 hover:text-white"
        onClick={() => window.open(`https://discord.com/channels/${guildId}/guild-settings/safety`, '_blank')}
      >
        Edit Security Actions
      </button>
    </div>
  );
};

const DiscordGuildLayout = ({ children, guild }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const incidents = guild?.properties?.incidents_data || guild?.incidents_data;

  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {incidents && <IncidentBanner incidents={incidents} guildId={guild.id} />}

      <div className="flex min-h-0 flex-1">
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-transparent md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}
        <ResizableSidebar
          id="discord-guild-sidebar"
          defaultWidth={360}
          className={`fixed inset-y-0 left-0 z-40 h-full transition-transform duration-300 ease-out md:static md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <DiscordGuildChannelsSidebar guild={guild} />
        </ResizableSidebar>
        {!isSidebarOpen && (
          <button
            type="button"
            className="border-white/5/60 fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 animate-pulse rounded-r border bg-gray-800/70 shadow-sm transition-all duration-300 hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          />
        )}
        <main className="relative flex min-w-0 flex-1 flex-col bg-[#1a1a1e]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DiscordGuildLayout;
