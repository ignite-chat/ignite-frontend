import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useChannelsStore } from '../../store/channels.store';
import { ChannelsService } from '@/ignite/services/channels.service';
import { useUsersStore } from '../../store/users.store';

import { getTwemojiUrl } from '@/utils/emoji.utils';

const MessageReactions = ({ message, channelId }) => {
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const channelReactions = useChannelsStore((s) => s.channelReactions);

  const messageReactions = useMemo(() => {
    const reactions = channelReactions[channelId]?.[message.id] || [];
    return reactions.map((reaction) => ({
      ...reaction,
      me: reaction.users.includes(currentUser.id),
    }));
  }, [channelReactions, channelId, message.id, currentUser.id]);

  const handleReactionToggle = useCallback(
    (messageId, emoji) => {
      if (!messageId || !channelId) return;
      ChannelsService.toggleMessageReaction(channelId, messageId, emoji);
    },
    [channelId]
  );

  if (messageReactions.length === 0) return null;

  return (
    <div className="-ml-14 mt-2 flex flex-wrap gap-1 pl-14">
      {messageReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => handleReactionToggle(message.id, reaction.emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded border px-2 py-1 text-sm transition-colors',
            reaction.me
              ? 'border-primary/50 bg-primary/20 hover:border-primary/60 hover:bg-primary/30'
              : 'border-white/5 bg-gray-800 hover:border-white/5 hover:bg-gray-700'
          )}
        >
          {reaction.emoji.startsWith('http') ? (
            <img src={reaction.emoji} className="size-4 object-contain" alt="reaction" />
          ) : (
            <img
              src={getTwemojiUrl(reaction.emoji)}
              className="size-4 object-contain"
              alt={reaction.emoji}
            />
          )}
          <span className="text-xs font-medium text-gray-300">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
};

export default MessageReactions;
