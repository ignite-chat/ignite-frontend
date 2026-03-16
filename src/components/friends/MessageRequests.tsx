import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { useDiscordChannelsStore } from '@/discord/store/discord-channels.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useDiscordGuildsStore } from '@/discord/store/discord-guilds.store';
import { DiscordService } from '@/discord/services/discord.service';
import { DiscordApiService } from '@/discord/services/discord-api.service';
import { useDiscordProfilesStore } from '@/discord/store/discord-profiles.store';
import type { DiscordChannel, DiscordUser } from '@/discord/types';

type Tab = 'requests' | 'spam';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

type MessageRequestRowProps = {
  channel: DiscordChannel;
  user: DiscordUser;
};

const MessageRequestRow = ({ channel, user }: MessageRequestRowProps) => {
  const discordGuilds = useDiscordGuildsStore((s) => s.guilds);
  const profile = useDiscordProfilesStore((s) => s.getProfile(user.id));
  const fetchProfile = useDiscordProfilesStore((s) => s.fetchProfile);

  useEffect(() => {
    fetchProfile(user.id);
  }, [user.id, fetchProfile]);

  const mutualGuilds = useMemo(() => {
    if (!profile?.mutual_guilds) return [];
    return profile.mutual_guilds
      .map((mg) => {
        const guild = discordGuilds.find((g) => g.id === mg.id);
        if (!guild) return null;
        const name = guild.properties?.name || guild.name || 'Unknown Server';
        const icon = guild.properties?.icon ?? guild.icon ?? null;
        return { id: guild.id, name, icon };
      })
      .filter((g): g is { id: string; name: string; icon: string | null } => g !== null);
  }, [profile, discordGuilds]);

  const avatarUrl = DiscordService.getUserAvatarUrl(user.id, user.avatar, 64);
  const sentAgo = channel.is_message_request_timestamp
    ? timeAgo(channel.is_message_request_timestamp)
    : null;

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DiscordApiService.acceptMessageRequest(channel.id);
      useDiscordChannelsStore.getState().updateChannel(channel.id, {
        is_message_request: false,
        is_message_request_timestamp: null,
        is_spam: false,
      });
      toast.success(`Accepted message request from ${user.global_name || user.username}`);
    } catch {
      toast.error('Failed to accept message request');
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await DiscordApiService.declineMessageRequest(channel.id);
      useDiscordChannelsStore.getState().removeChannel(channel.id);
      toast.success(`Declined message request from ${user.global_name || user.username}`);
    } catch {
      toast.error('Failed to decline message request');
    }
  };

  return (
    <div className="border-white/5/30 group flex cursor-pointer items-center justify-between border-t px-2 py-3 hover:rounded-lg hover:bg-gray-600/30">
      <div className="flex items-center gap-3">
        <img
          src={avatarUrl}
          alt={user.global_name || user.username}
          className="size-10 rounded-full object-cover"
        />
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            {user.global_name || user.username}
            <span className="text-xs font-normal text-gray-400">
              {user.username}
            </span>
            {sentAgo && (
              <span className="text-xs font-normal text-gray-500">{sentAgo}</span>
            )}
          </div>
          {mutualGuilds.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-default items-center gap-1.5 text-xs text-gray-400">
                  {mutualGuilds[0].icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${mutualGuilds[0].id}/${mutualGuilds[0].icon}.png?size=32`}
                      alt={mutualGuilds[0].name}
                      className="size-4 rounded-full"
                    />
                  ) : (
                    <div className="flex size-4 items-center justify-center rounded-full bg-[#36393f] text-[8px] font-medium text-gray-300">
                      {(mutualGuilds[0].name || '?').charAt(0)}
                    </div>
                  )}
                  {mutualGuilds.length} Mutual Server{mutualGuilds.length !== 1 ? 's' : ''}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-60">
                <div className="space-y-1.5 py-0.5">
                  {mutualGuilds.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      {g.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=32`}
                          alt={g.name}
                          className="size-4 rounded-full"
                        />
                      ) : (
                        <div className="flex size-4 items-center justify-center rounded-full bg-[#36393f] text-[8px] font-medium text-gray-300">
                          {(g.name || '?').charAt(0)}
                        </div>
                      )}
                      <span className="truncate text-xs">{g.name || 'Unknown Server'}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={handleDecline}
        >
          Ignore
        </Button>
        <Button
          size="sm"
          className="h-8 bg-[#5865f2] px-3 text-sm font-medium text-white hover:bg-[#4752c4]"
          onClick={handleAccept}
        >
          Accept DM
        </Button>
      </div>
    </div>
  );
};

const MessageRequests = () => {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  const discordConnected = useDiscordStore((s) => s.isConnected);
  const discordUser = useDiscordStore((s) => s.user);
  const discordChannels = useDiscordChannelsStore((s) => s.channels);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);
  const { requestChannels, spamChannels } = useMemo(() => {
    if (!discordConnected) return { requestChannels: [], spamChannels: [] };

    const messageRequestChannels = discordChannels.filter(
      (c) =>
        (c.type === 1 || c.type === 3) &&
        (c.is_message_request)
    );

    const requests: { channel: DiscordChannel; user: DiscordUser }[] = [];
    const spam: { channel: DiscordChannel; user: DiscordUser }[] = [];

    for (const channel of messageRequestChannels) {
      const recipientIds = channel.recipient_ids || [];
      const otherId = recipientIds.find((id: string) => id !== discordUser?.id);
      const user = otherId ? discordUsersMap[otherId] : null;
      if (!user) continue;

      const entry = { channel, user };
      if (channel.is_spam) {
        spam.push(entry);
      } else {
        requests.push(entry);
      }
    }

    return { requestChannels: requests, spamChannels: spam };
  }, [discordConnected, discordChannels, discordUsersMap, discordUser]);

  const filteredItems = useMemo(() => {
    const items = activeTab === 'requests' ? requestChannels : spamChannels;
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      ({ user }) =>
        (user.global_name || '').toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
    );
  }, [activeTab, requestChannels, spamChannels, searchQuery]);

  const totalRequests = requestChannels.length;
  const totalSpam = spamChannels.length;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant={activeTab === 'requests' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-sm font-medium"
            onClick={() => setActiveTab('requests')}
          >
            Requests
          </Button>
          <Button
            variant={activeTab === 'spam' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-sm font-medium"
            onClick={() => setActiveTab('spam')}
          >
            Spam
          </Button>
        </div>

        <div className="mb-4">
          <InputGroup className="border-white/5 bg-[#17171a]">
            <InputGroupAddon>
              <Search size={16} className="text-white" />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-white placeholder:text-gray-500"
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex size-4 items-center justify-center rounded-full bg-gray-500 text-gray-900 hover:bg-gray-400"
                  type="button"
                  aria-label="Clear search"
                >
                  <X size={10} strokeWidth={4} />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'requests' && (
            <div className="text-[12px] font-medium text-gray-400">
              Pending Requests — {totalRequests}
            </div>
          )}
          {activeTab === 'spam' && (
            <div className="text-[12px] font-medium text-gray-400">
              Spam — {totalSpam}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-gray-500">
                {searchQuery.trim()
                  ? 'No matching message requests found.'
                  : activeTab === 'requests'
                    ? 'No pending message requests.'
                    : 'No spam message requests.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredItems.map(({ channel, user }) => (
                <MessageRequestRow key={channel.id} channel={channel} user={user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageRequests;
