import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Hash, SpeakerHigh } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import Avatar from '@/components/Avatar';
import { useUsersStore } from '@/store/users.store';
import { useFriendsStore } from '@/store/friends.store';
import { useChannelsStore } from '@/store/channels.store';
import { useGuildsStore } from '@/store/guilds.store';
import { ChannelsService } from '@/services/channels.service';
import useStore from '@/hooks/useStore';
import { ChannelType } from '@/constants/ChannelType';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const PREFIXES = {
  '@': 'users',
  '#': 'text',
  '!': 'voice',
  '*': 'servers',
};

const NewDMModal = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const store = useStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  const allUsers = useUsersStore((s) => s.users);
  const { friends } = useFriendsStore();
  const { channels } = useChannelsStore();
  const { guilds } = useGuildsStore();

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  // Parse prefix and search term
  const { prefix, searchTerm } = useMemo(() => {
    const trimmed = query.trimStart();
    const firstChar = trimmed[0];
    if (PREFIXES[firstChar]) {
      return { prefix: firstChar, searchTerm: trimmed.slice(1).toLowerCase().trim() };
    }
    return { prefix: null, searchTerm: trimmed.toLowerCase() };
  }, [query]);

  const activeFilter = prefix ? PREFIXES[prefix] : null;

  // All guild channels (text + voice) flattened
  const guildChannels = useMemo(() => {
    return channels
      .filter((c) => c.type === ChannelType.GUILD_TEXT || c.type === ChannelType.GUILD_VOICE)
      .map((c) => {
        const guild = guilds.find((g) => String(g.id) === String(c.guild_id));
        return { ...c, guild };
      });
  }, [channels, guilds]);

  // Recent DM channels sorted by last message
  const recentDms = useMemo(() => {
    const currentUserId = store.user?.id;
    return channels
      .filter((c) => c.type === ChannelType.DM)
      .map((c) => {
        const otherUser = (c.recipients || []).find((r) => r.id !== currentUserId) || c.user || {};
        return { ...c, user: otherUser };
      })
      .sort((a, b) => {
        if (!a.last_message_id) return 1;
        if (!b.last_message_id) return -1;
        return BigInt(a.last_message_id) < BigInt(b.last_message_id) ? 1 : -1;
      });
  }, [channels, store.user?.id]);

  const results = useMemo(() => {
    const currentUserId = store.user?.id;
    const items = [];

    // Users (@ prefix or no prefix)
    if (!activeFilter || activeFilter === 'users') {
      const users = Object.values(allUsers).filter((u) => {
        if (u.id === currentUserId) return false;
        if (!searchTerm && !activeFilter) return false;
        if (!searchTerm && activeFilter === 'users') return friendIds.has(u.id);
        return (
          u.username?.toLowerCase().includes(searchTerm) ||
          u.name?.toLowerCase().includes(searchTerm)
        );
      });
      users.sort((a, b) => {
        const aFriend = friendIds.has(a.id) ? 0 : 1;
        const bFriend = friendIds.has(b.id) ? 0 : 1;
        if (aFriend !== bFriend) return aFriend - bFriend;
        return (a.name || a.username || '').localeCompare(b.name || b.username || '');
      });
      users.slice(0, 15).forEach((u) => items.push({ type: 'user', data: u }));
    }

    // Text channels (# prefix or no prefix)
    if (!activeFilter || activeFilter === 'text') {
      const textChannels = guildChannels.filter((c) => {
        if (c.type !== ChannelType.GUILD_TEXT) return false;
        if (!searchTerm && !activeFilter) return false;
        if (!searchTerm && activeFilter === 'text') return true;
        return c.name?.toLowerCase().includes(searchTerm);
      });
      textChannels.slice(0, 15).forEach((c) => items.push({ type: 'text_channel', data: c }));
    }

    // Voice channels (! prefix or no prefix)
    if (!activeFilter || activeFilter === 'voice') {
      const voiceChannels = guildChannels.filter((c) => {
        if (c.type !== ChannelType.GUILD_VOICE) return false;
        if (!searchTerm && !activeFilter) return false;
        if (!searchTerm && activeFilter === 'voice') return true;
        return c.name?.toLowerCase().includes(searchTerm);
      });
      voiceChannels.slice(0, 15).forEach((c) => items.push({ type: 'voice_channel', data: c }));
    }

    // Servers (* prefix or no prefix)
    if (!activeFilter || activeFilter === 'servers') {
      const filteredGuilds = guilds.filter((g) => {
        if (!searchTerm && !activeFilter) return false;
        if (!searchTerm && activeFilter === 'servers') return true;
        return g.name?.toLowerCase().includes(searchTerm);
      });
      filteredGuilds.slice(0, 10).forEach((g) => items.push({ type: 'server', data: g }));
    }

    return items;
  }, [allUsers, guildChannels, guilds, searchTerm, activeFilter, store.user?.id, friendIds]);

  // Default view: recent DMs when no query
  const showDefault = !query.trim();

  const defaultItems = useMemo(() => {
    return recentDms.slice(0, 8).map((dm) => ({ type: 'dm', data: dm }));
  }, [recentDms]);

  const displayItems = showDefault ? defaultItems : results;

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    const count = displayItems.length;
    if (!count) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = displayItems[selectedIndex];
      if (item) handleItemSelect(item);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    // +1 offset to skip the section header element
    const offset = showDefault && defaultItems.length > 0 ? selectedIndex + 1 : selectedIndex;
    const el = listRef.current.children[offset];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, showDefault, defaultItems.length]);

  const handleItemSelect = async (item) => {
    if (loading) return;

    switch (item.type) {
      case 'user': {
        const userId = item.data.id;
        const existing = channels.find(
          (c) => c.type === ChannelType.DM && c.recipients?.some((r) => r.id === userId)
        );
        if (existing) {
          navigate(`/channels/@me/${existing.channel_id}`);
          close();
          return;
        }
        setLoading(true);
        try {
          const channel = await ChannelsService.createPrivateChannel([userId]);
          navigate(`/channels/@me/${channel.channel_id}`);
          close();
        } catch {
          toast.error('Failed to create DM channel');
        } finally {
          setLoading(false);
        }
        break;
      }
      case 'dm': {
        navigate(`/channels/@me/${item.data.channel_id}`);
        close();
        break;
      }
      case 'text_channel':
      case 'voice_channel': {
        const ch = item.data;
        navigate(`/channels/${ch.guild_id || ch.guild?.id}/${ch.channel_id || ch.id}`);
        close();
        break;
      }
      case 'server': {
        navigate(`/channels/${item.data.id}`);
        close();
        break;
      }
    }
  };

  const close = () => {
    onOpenChange(false);
    setQuery('');
    setSelectedIndex(0);
  };

  const getGuildIconUrl = (guild) => {
    if (!guild?.icon_file_id) return null;
    return `${CDN_BASE}/icons/${guild.icon_file_id}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
        else onOpenChange(v);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!max-w-[540px] gap-0 overflow-hidden rounded-lg border border-[#1e1f22]/50 bg-[#2b2d31] p-0 shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_8px_16px_rgba(0,0,0,0.3)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Quick Switcher</DialogTitle>

        {/* Search input */}
        <div className="p-3.5 pb-0">
          <input
            type="text"
            placeholder="Where would you like to go?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full rounded-[4px] bg-[#1e1f22] px-2.5 py-[7px] text-[16px] leading-[22px] text-[#dbdee1] placeholder:text-[#6d6f78] focus:outline-none"
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto px-3.5 pt-3 pb-3.5 scrollbar-thin scrollbar-thumb-[#1a1b1e] scrollbar-track-transparent"
        >
          {showDefault && defaultItems.length > 0 && (
            <div className="mb-1.5 px-1.5 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#b5bac1]">
              Recent Conversations
            </div>
          )}

          {displayItems.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-[#949ba4]">
              {showDefault ? 'No recent conversations.' : 'No results found.'}
            </div>
          ) : (
            displayItems.map((item, idx) => (
              <ResultItem
                key={`${item.type}-${item.data.id || item.data.channel_id}-${idx}`}
                item={item}
                isSelected={idx === selectedIndex}
                onClick={() => handleItemSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                friendIds={friendIds}
                getGuildIconUrl={getGuildIconUrl}
                loading={loading}
              />
            ))
          )}
        </div>

        {/* Protip bar */}
        <div className="border-t border-[#1e1f22] bg-[#232428] px-4 py-2.5">
          <p className="text-[11px] leading-[14px] text-[#949ba4]">
            <span className="font-bold text-[#00a8fc]">PROTIP:</span>{' '}
            Start searches with{' '}
            <kbd className="mx-0.5 inline-flex items-center justify-center rounded-[3px] bg-[#1e1f22] px-1 py-[1px] font-mono text-[10px] text-[#dbdee1]">@</kbd>
            <kbd className="mx-0.5 inline-flex items-center justify-center rounded-[3px] bg-[#1e1f22] px-1 py-[1px] font-mono text-[10px] text-[#dbdee1]">#</kbd>
            <kbd className="mx-0.5 inline-flex items-center justify-center rounded-[3px] bg-[#1e1f22] px-1 py-[1px] font-mono text-[10px] text-[#dbdee1]">!</kbd>
            <kbd className="mx-0.5 inline-flex items-center justify-center rounded-[3px] bg-[#1e1f22] px-1 py-[1px] font-mono text-[10px] text-[#dbdee1]">*</kbd>{' '}
            to narrow results.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ResultItem = ({ item, isSelected, onClick, onMouseEnter, friendIds, getGuildIconUrl, loading }) => {
  const baseClass = `flex w-full items-center gap-3 rounded-[4px] px-2.5 py-[6px] text-left transition-colors cursor-pointer ${
    isSelected ? 'bg-[#36373d]' : 'hover:bg-[#36373d]/50'
  }`;

  switch (item.type) {
    case 'user':
      return (
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          disabled={loading}
          className={`${baseClass} disabled:opacity-50`}
        >
          <Avatar user={item.data} className="size-8 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[#dbdee1]">
            {item.data.name || item.data.username}
          </span>
          <span className="shrink-0 text-[12px] text-[#949ba4]">
            {item.data.username}
          </span>
        </button>
      );

    case 'dm':
      return (
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          className={baseClass}
        >
          <Avatar user={item.data.user} className="size-8 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[#dbdee1]">
            {item.data.user?.name || item.data.user?.username || 'Unknown'}
          </span>
          <span className="shrink-0 text-[12px] text-[#949ba4]">
            {item.data.user?.username}
          </span>
        </button>
      );

    case 'text_channel':
      return (
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          className={baseClass}
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <Hash className="size-[22px] text-[#949ba4]" weight="bold" />
          </div>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[#dbdee1]">
            {item.data.name}
          </span>
          <GuildBadge guild={item.data.guild} getGuildIconUrl={getGuildIconUrl} />
        </button>
      );

    case 'voice_channel':
      return (
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          className={baseClass}
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <SpeakerHigh className="size-[22px] text-[#949ba4]" weight="fill" />
          </div>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[#dbdee1]">
            {item.data.name}
          </span>
          <GuildBadge guild={item.data.guild} getGuildIconUrl={getGuildIconUrl} />
        </button>
      );

    case 'server':
      return (
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          className={baseClass}
        >
          <ServerIcon guild={item.data} getGuildIconUrl={getGuildIconUrl} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[#dbdee1]">
            {item.data.name}
          </span>
        </button>
      );

    default:
      return null;
  }
};

const GuildBadge = ({ guild, getGuildIconUrl }) => {
  if (!guild) return null;
  const iconUrl = getGuildIconUrl(guild);
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[#949ba4]">
      {iconUrl ? (
        <img src={iconUrl} className="size-4 rounded-full" alt="" />
      ) : (
        <span className="flex size-4 items-center justify-center rounded-full bg-[#36373d] text-[8px] font-semibold text-[#dbdee1]">
          {guild.name?.charAt(0)?.toUpperCase()}
        </span>
      )}
      {guild.name}
    </span>
  );
};

const ServerIcon = ({ guild, getGuildIconUrl }) => {
  const iconUrl = getGuildIconUrl(guild);
  if (iconUrl) {
    return <img src={iconUrl} className="size-8 shrink-0 rounded-2xl" alt="" />;
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-[#36373d] text-[11px] font-semibold text-[#dbdee1]">
      {guild.name?.charAt(0)?.toUpperCase()}
    </span>
  );
};

export default NewDMModal;
