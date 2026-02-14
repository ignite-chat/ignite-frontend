import { useEffect } from 'react';
import { GuildsService } from '../../services/guilds.service';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import ChannelBar from './ChannelBar.jsx';
import ChannelInput from './ChannelInput';
import ChannelMessages from './ChannelMessages';
import { ChannelType } from '../../enums/ChannelType';
import MemberList from './MemberList';
import VoiceChannelView from '../Voice/VoiceChannelView';

const Channel = ({ channel }) => {
  const { guildId } = useGuildContext();

  if (channel?.type === ChannelType.GUILD_VOICE) {
    return (
      <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gray-700">
        <ChannelBar channel={channel} />
        <hr className="m-0 w-full border border-gray-900 bg-gray-900 p-0" />
        <VoiceChannelView channel={channel} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gray-700">
      <ChannelBar channel={channel} onJumpToMessage={() => { }} />
      <hr className="m-0 w-full border border-gray-900 bg-gray-900 p-0" />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
          <ChannelMessages
            channel={channel}
          />
          <ChannelInput channel={channel} />
        </div>

        {channel?.type !== ChannelType.DM && (
          <div className="hidden lg:flex">
            <MemberList guildId={guildId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Channel;