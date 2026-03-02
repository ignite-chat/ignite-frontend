import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import ChannelMessage from './ChannelMessage';

const NewMessagesSeparator = () => (
  <div className="flex items-center gap-1 pl-4 pr-3.5 mt-1.5 mb-0.5">
    <div className="flex-1 h-px bg-destructive" />
    <span className="text-[11px] font-bold text-destructive leading-none">NEW</span>
  </div>
);

const MessageList = ({
  messages,
  pendingMessages,
  editingId,
  setEditingId,
  highlightId,
  guildId,
  isLoading,
  hasMore,
  loadingMore,
  newMessagesSeparatorId,
}) => {
  if (isLoading) {
    return <CircleNotch size={32} className="mx-auto animate-spin text-gray-500" />;
  }

  return (
    <>
      {loadingMore && (
        <div className="flex justify-center py-4">
          <CircleNotch size={24} className="animate-spin text-gray-500" />
        </div>
      )}

      {!hasMore && !loadingMore && (
        <div className="px-4 py-2 text-center text-xs text-gray-500">Beginning of channel</div>
      )}

      {messages?.map((message, index) => {
        const prevMessage = messages[index - 1] || null;
        const isHighlighted = highlightId === message.id;
        const showNewSeparator = newMessagesSeparatorId &&
          message.id.localeCompare(newMessagesSeparatorId) > 0 &&
          (!prevMessage || prevMessage.id.localeCompare(newMessagesSeparatorId) <= 0);
        return (
          <div
            key={message.id}
            id={`msg-${message.id}`}
            className={cn(
              'relative',
              isHighlighted && 'animate-message-highlight'
            )}
          >
            {showNewSeparator && <NewMessagesSeparator />}
            <ChannelMessage
              message={message}
              prevMessage={prevMessage}
              allMessages={messages}
              isEditing={editingId === message.id}
              setEditingId={setEditingId}
              guildId={guildId}
              isHighlighted={isHighlighted}
            />
          </div>
        );
      })}

      {pendingMessages?.map((message, index) => {
        const prevMessage = pendingMessages[index - 1] || messages[messages.length - 1] || null;
        return (
          <ChannelMessage
            key={message.nonce}
            message={message}
            prevMessage={prevMessage}
            allMessages={messages}
            pending={true}
            isEditing={false}
            setEditingId={setEditingId}
            guildId={guildId}
            isHighlighted={false}
          />
        );
      })}
    </>
  );
};

export default MessageList;
