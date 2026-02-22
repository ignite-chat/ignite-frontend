import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useSortable } from '@dnd-kit/sortable';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { UnreadsService } from '@/services/unreads.service';
import { ChannelsService } from '@/services/channels.service';
import { VoiceService } from '@/services/voice.service';
import { ChannelType } from '@/constants/ChannelType';
import VoiceParticipant from '@/components/Voice/VoiceParticipant';
import ChannelRow from './ChannelRow';

const ChannelItem = ({
  channel,
  isActive,
  isUnread,
  mentionsCount,
  expanded,
  canManageChannels,
  onEditChannel,
  handleDeleteChannel,
  navigate,
  globalIsDragging,
  guild,
  dropIndicator,
  voiceParticipants,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: channel.channel_id,
    disabled: !canManageChannels,
  });

  const style = {
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none',
    position: 'relative',
  };

  const handleMarkAsRead = async () => {
    await UnreadsService.setLastReadMessageId(channel.channel_id, channel.last_message_id || null);
    await ChannelsService.acknowledgeChannelMessage(
      channel.channel_id,
      channel.last_message_id || null
    );
    toast.success('Channel marked as read.');
  };

  const handleCopyLink = async () => {
    const channelLink = `${window.location.origin}/channels/${channel.guild_id}/${channel.channel_id}`;
    try {
      await navigator.clipboard.writeText(channelLink);
      toast.success('Channel link copied to clipboard.');
    } catch {
      toast.error('Could not copy channel link to clipboard.');
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(String(channel.channel_id));
      toast.success('Channel ID copied to clipboard.');
    } catch {
      toast.error('Could not copy channel ID to clipboard.');
    }
  };

  const isVoice = channel.type === ChannelType.GUILD_VOICE;

  const handleVoiceClick = (e) => {
    if (isDragging) return;
    VoiceService.joinVoiceChannel(
      channel.channel_id,
      channel.guild_id,
      guild?.name || '',
      channel.name
    );
  };

  const channelContent = (
    <>
      {/* Unread indicator bar */}
      {isUnread && !isActive && (
        <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}

      <ChannelRow
        channel={channel}
        isActive={isActive}
        isUnread={isUnread}
        mentionsCount={mentionsCount}
      />
    </>
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {dropIndicator === 'above' && !isDragging && (
        <div className="mx-2 h-0.5 rounded-full bg-primary" />
      )}
      <ContextMenu>
        <ContextMenuTrigger>
          {isVoice ? (
            <div>
              <Link
                to={`/channels/${channel.guild_id}/${channel.channel_id}`}
                onClick={handleVoiceClick}
                className={`${!expanded && !isActive ? 'hidden' : ''} group relative block`}
                draggable="false"
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              >
                {channelContent}
              </Link>
              {/* Voice participants */}
              {voiceParticipants?.length > 0 && (
                <div className="pb-1">
                  {voiceParticipants.map((vs) => (
                    <VoiceParticipant key={vs.user_id} voiceState={vs} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              to={`/channels/${channel.guild_id}/${channel.channel_id}`}
              className={`${!expanded && !isActive ? 'hidden' : ''} group relative block`}
              draggable="false"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              {channelContent}
            </Link>
          )}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {!isVoice && (
            <ContextMenuItem disabled={!isUnread} onSelect={handleMarkAsRead}>
              Mark as Read
            </ContextMenuItem>
          )}
          {!isVoice && <ContextMenuSeparator />}
          {isVoice ? (
            <ContextMenuItem
              onSelect={() => {
                handleVoiceClick();
                navigate(`/channels/${channel.guild_id}/${channel.channel_id}`);
              }}
            >
              Join Voice Channel
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onSelect={() => navigate(`/channels/${channel.guild_id}/${channel.channel_id}`)}
            >
              Go to Channel
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={handleCopyLink}>Copy Link</ContextMenuItem>

          {canManageChannels && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onEditChannel?.(channel)}>
                Edit Channel
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => handleDeleteChannel(channel)}
                className="text-red-500 hover:bg-red-600/20"
              >
                Delete Channel
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleCopyId}>Copy Channel ID</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {dropIndicator === 'below' && !isDragging && (
        <div className="mx-2 h-0.5 rounded-full bg-primary" />
      )}
    </div>
  );
};

export default ChannelItem;
