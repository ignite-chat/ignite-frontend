import { useState, useMemo, useEffect } from 'react';
import { X, Trash, ArrowClockwise, PencilSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useDiscordMessageLogStore } from '../store/discord-message-log.store';
import { useDiscordChannelsStore } from '../store/discord-channels.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { DiscordService } from '../services/discord.service';
import { DiscordMessageLogService } from '../services/discord-message-log.service';
import { parseMarkdown } from '@/components/message/markdown/parser';
import DiscordMarkdownRenderer from './DiscordMarkdownRenderer';

const formatTimestamp = (iso) => {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString()} at ${time}`;
};

const MessageLogViewer = ({ channelId, guildId, onClose }) => {
  const logs = useDiscordMessageLogStore((s) => s.logs[channelId] || []);
  const { clearChannelLogs } = useDiscordMessageLogStore();
  const channels = useDiscordChannelsStore((s) => s.channels);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const [filter, setFilter] = useState('all');
  const [persistedLogs, setPersistedLogs] = useState([]);
  const settings = useDiscordMessageLogStore((s) => s.settings);

  const channel = channels.find((c) => c.id === channelId);
  const guild = guilds.find((g) => g.id === guildId);
  const channelName = channel?.name || channelId;

  // Load persisted logs on mount if permanent storage is enabled
  useEffect(() => {
    if (settings.permanentStorage) {
      DiscordMessageLogService.loadPersistedLogs(channelId).then(setPersistedLogs);
    }
  }, [channelId, settings.permanentStorage]);

  // Merge in-memory and persisted logs, deduplicate by message ID + loggedAt
  const allLogs = useMemo(() => {
    const seen = new Set();
    const merged = [];
    for (const log of logs) {
      const key = `${log.message.id}-${log.loggedAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(log);
      }
    }
    for (const log of persistedLogs) {
      const key = `${log.message.id}-${log.loggedAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(log);
      }
    }
    return merged.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  }, [logs, persistedLogs]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return allLogs;
    return allLogs.filter((l) => l.type === filter);
  }, [allLogs, filter]);

  const handleClear = async () => {
    clearChannelLogs(channelId);
    await DiscordMessageLogService.clearPersistedChannel(channelId);
    setPersistedLogs([]);
    toast.success('Channel logs cleared.');
  };

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            Message Log — #{channelName}
          </span>
          <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {allLogs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            className="rounded p-1 text-gray-400 transition hover:bg-white/10 hover:text-[#f23f42]"
            title="Clear channel logs"
          >
            <Trash size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-white/5 px-3 py-1.5">
        {[
          { key: 'all', label: 'All' },
          { key: 'deleted', label: 'Deleted' },
          { key: 'edited', label: 'Edited' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              filter === tab.key
                ? 'bg-[#5865f2] text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">No logged messages for this channel.</p>
          </div>
        ) : (
          <div className="space-y-px p-2">
            {filteredLogs.map((entry, i) => (
              <LogEntry key={`${entry.message.id}-${entry.loggedAt}-${i}`} entry={entry} guildId={guildId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LogEntry = ({ entry, guildId }) => {
  const { message, type, loggedAt, newContent } = entry;
  const avatarUrl = DiscordService.getUserAvatarUrl(
    message.author.id,
    message.author.avatar,
    40,
  );
  const displayName = message.author.global_name || message.author.username;

  const contentAst = useMemo(() => parseMarkdown(message.content || ''), [message.content]);
  const newContentAst = useMemo(
    () => (newContent ? parseMarkdown(newContent) : null),
    [newContent],
  );

  const isDeleted = type === 'deleted';

  return (
    <div
      className={`group rounded px-3 py-2 ${
        isDeleted
          ? 'border-l-2 border-[#f23f42]/50 bg-[#f23f42]/5'
          : 'border-l-2 border-yellow-500/50 bg-yellow-500/5'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <img
          src={avatarUrl}
          alt={displayName}
          className="mt-0.5 size-8 shrink-0 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{displayName}</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              {isDeleted ? (
                <Trash size={10} className="text-[#f23f42]" />
              ) : (
                <PencilSimple size={10} className="text-yellow-500" />
              )}
              {isDeleted ? 'Deleted' : 'Edited'}
            </span>
            <span className="text-[10px] text-gray-600">{formatTimestamp(loggedAt)}</span>
          </div>

          {/* Original message content */}
          <div className="mt-0.5 text-sm text-gray-300">
            {message.content ? (
              <DiscordMarkdownRenderer nodes={contentAst} guildId={guildId} />
            ) : (
              <span className="italic text-gray-500">No text content</span>
            )}
          </div>

          {/* Show new content for edits */}
          {newContentAst && (
            <div className="mt-1 border-l-2 border-white/10 pl-2">
              <span className="text-[10px] font-medium uppercase text-gray-500">Changed to:</span>
              <div className="text-sm text-gray-400">
                <DiscordMarkdownRenderer nodes={newContentAst} guildId={guildId} />
              </div>
            </div>
          )}

          {/* Attachments indicator */}
          {message.attachments?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.attachments.map((att, i) => {
                const isImage = att.content_type?.startsWith('image/');
                return (
                  <div
                    key={att.id || i}
                    className="flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-xs text-gray-400"
                  >
                    {isImage ? (
                      <img
                        src={att.proxy_url || att.url}
                        alt={att.filename}
                        className="max-h-24 max-w-48 rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={isImage ? 'hidden' : ''}>{att.filename}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Original timestamp */}
          <span className="mt-0.5 text-[10px] text-gray-600">
            Originally sent: {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageLogViewer;
