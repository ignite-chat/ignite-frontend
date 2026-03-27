import { useMemo, useCallback, useState } from 'react';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { DiscordService } from '../services/discord.service';
import { GUILD_FORUM, GUILD_VOICE, GUILD_STAGE_VOICE, DM, GROUP_DM } from '../constants/channel-types';
import DiscordChannelMessages from './DiscordChannelMessages';
import DiscordChannelInput from './DiscordChannelInput';
import DiscordChannelHeader from './DiscordChannelHeader';
import DiscordMemberList from './DiscordMemberList';
import DiscordSearchPanel from './DiscordSearchPanel';
import DiscordForumView from './DiscordForumView';
import MessageLogViewer from './MessageLogViewer';
import DiscordVoiceChannelView from './DiscordVoiceChannelView';

const DiscordChannel = ({ channel }) => {
  const currentUser = useDiscordStore((s) => s.user);
  const usersMap = useDiscordUsersStore((s) => s.users);
  const guilds = useDiscordGuildsStore((s) => s.guilds);

  const isForum = channel?.type === GUILD_FORUM;
  const isVoice = channel?.type === GUILD_VOICE || channel?.type === GUILD_STAGE_VOICE;
  const isDM = channel?.type === DM || channel?.type === GROUP_DM;
  const guildId = channel?.guild_id;
  const guild = useMemo(() => guilds.find((g) => g.id === guildId), [guilds, guildId]);
  const guildName = guild?.properties?.name || guild?.name;

  const [memberListOpen, setMemberListOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageLogOpen, setMessageLogOpen] = useState(false);

  const toggleMemberList = useCallback(() => setMemberListOpen((v) => !v), []);
  const toggleMessageLog = useCallback(() => {
    setMessageLogOpen((v) => {
      if (!v) setSearchOpen(false);
      return !v;
    });
  }, []);
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const dmInfo = useMemo(() => {
    if (!isDM || !channel) return null;
    const recipientIds = channel.recipient_ids || [];
    const recipients = recipientIds.map((id) => usersMap[id]).filter(Boolean);

    if (channel.type === GROUP_DM) {
      // Group DM
      const name = channel.name || recipients.map((r) => r.global_name || r.username).join(', ');
      return { name, icon: null };
    }

    // 1-on-1 DM
    const other = recipients.find((r) => r.id !== currentUser?.id) || recipients[0];
    if (!other) return { name: 'Unknown User', icon: null };

    return {
      name: other.global_name || other.username,
      icon: DiscordService.getUserAvatarUrl(other.id, other.avatar, 32),
    };
  }, [channel, currentUser?.id, isDM, usersMap]);

  const [messageSentCount, setMessageSentCount] = useState(0);
  const onMessageSent = useCallback(() => setMessageSentCount((c) => c + 1), []);

  const isOfficialDiscordDM = useMemo(() => {
    if (!isDM || channel?.type !== DM) return false;
    const recipientIds = channel.recipient_ids || [];
    return recipientIds.includes('643945264868098049');
  }, [channel, isDM]);

  if (!channel) return null;

  if (isForum) {
    return <DiscordForumView channel={channel} />;
  }

  if (isVoice) {
    return <DiscordVoiceChannelView channel={channel} />;
  }

  const displayName = isDM ? dmInfo?.name : channel.name;
  const placeholderName = isDM ? `@${dmInfo?.name}` : `#${channel.name}`;

  return (
    <div className="flex h-full flex-col">
      <DiscordChannelHeader
        channel={channel}
        displayName={displayName}
        isDM={isDM}
        dmInfo={isDM ? { properties: dmInfo } : undefined}
        guildName={guildName}
        memberListOpen={memberListOpen}
        onToggleMemberList={!isDM ? toggleMemberList : undefined}
        searchOpen={searchOpen}
        onSearch={!isDM ? handleSearch : undefined}
        messageLogOpen={messageLogOpen}
        onToggleMessageLog={toggleMessageLog}
      />

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Messages */}
          <DiscordChannelMessages channel={channel} messageSentCount={messageSentCount} />

          {/* Input */}
          {isOfficialDiscordDM ? (
            <div className="flex items-center justify-center border-t border-white/5 px-4 py-3">
              <span className="text-sm text-gray-400">You cannot reply to official Discord messages.</span>
            </div>
          ) : (
            <DiscordChannelInput channel={channel} channelName={placeholderName} onMessageSent={onMessageSent} />
          )}
        </div>

        {guildId && memberListOpen && !searchOpen && !messageLogOpen && !isDM && <DiscordMemberList guildId={guildId} />}
        {guildId && searchOpen && !messageLogOpen && !isDM && (
          <DiscordSearchPanel key={searchQuery} guildId={guildId} initialQuery={searchQuery} onClose={closeSearch} />
        )}
        {messageLogOpen && (
          <div className="w-80 shrink-0 border-l border-white/5">
            <MessageLogViewer
              channelId={channel.id}
              guildId={guildId}
              onClose={() => setMessageLogOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscordChannel;
