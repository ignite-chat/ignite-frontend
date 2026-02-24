import { useState, useCallback, useMemo, memo, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '../../api';
import { useUsersStore } from '../../store/users.store';
import { useChannelsStore } from '../../store/channels.store';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import { Popover, PopoverContent } from '../ui/popover';
import Avatar from '../Avatar.jsx';
import GuildMemberContextMenu from '../GuildMember/GuildMemberContextMenu';
import GuildMemberPopoverContent from '../popovers/GuildMemberPopoverContent';
import UserProfileModal from '@/components/modals/UserProfileModal';
import { useModalStore } from '../../store/modal.store';
import MessageContent from './MessageContent.jsx';
import MessageHeader from './MessageHeader';
import MessageEditor from './MessageEditor';
import MessageReactions from './MessageReactions';
import MessageActions from './MessageActions';
import MessageContextMenu from './MessageContextMenu';
import MessageReplyBar from './MessageReplyBar';
import { Paperclip } from 'lucide-react';
import { Permissions } from '@/constants/Permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';

const ChannelMessage = memo(
  ({
    message,
    prevMessage,
    allMessages,
    pending,
    isEditing,
    setEditingId,
    guildId,
  }) => {
    const currentUser = useUsersStore((s) => s.getCurrentUser());
    const [popoverOpen, setPopoverOpen] = useState(false);
    const avatarClickedRef = useRef(false);
    const [contextImageUrl, setContextImageUrl] = useState(null);
    const { setReplyingId, replyingId } = useChannelContext();
    const channelId = message.channel_id;

    const hasReply = message.message_references?.length > 0;
    const replyMessageId = hasReply ? message.message_references[0].message_id : null;

    const shouldStack = useMemo(() => {
      if (hasReply) return false;
      if (!prevMessage) return false;
      const sameAuthor = prevMessage.author.id === message.author.id;
      const sameName = prevMessage.author.name === message.author.name;
      const sentWithinMinute =
        (new Date(message.created_at) - new Date(prevMessage.created_at)) / 1000 < 60;
      return sameAuthor && sameName && sentWithinMinute;
    }, [prevMessage, message, hasReply]);

    const canEdit = useMemo(
      () => message.author.id === currentUser.id,
      [message.author.id, currentUser.id]
    );

    const hasManageMessages = useHasPermission(guildId, message.channel_id, Permissions.MANAGE_MESSAGES);
    const canDelete = message.author.id === currentUser.id || hasManageMessages;

    const isMentioned = useMemo(() => {
      if (!message.mentions || !currentUser?.id) return false;
      return message.mentions.some((mention) => mention.user_id === currentUser.id);
    }, [message.mentions, currentUser?.id]);

    const isReplyingTo = replyingId === message.id;

    const handleSaveEdit = useCallback(
      async (editedContent) => {
        try {
          await api.put(`/channels/${channelId}/messages/${message.id}`, {
            content: editedContent,
          });
          const { channelMessages, setChannelMessages } = useChannelsStore.getState();
          const messages = channelMessages[channelId] || [];
          setChannelMessages(
            channelId,
            messages.map((m) =>
              m.id === message.id
                ? { ...m, content: editedContent, updated_at: new Date().toISOString() }
                : m
            )
          );
          setEditingId(null);
        } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.message || 'Could not edit message.');
        }
      },
      [channelId, message.id, setEditingId]
    );

    const handleDelete = useCallback(async () => {
      try {
        await api.delete(`/channels/${channelId}/messages/${message.id}`);
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || 'Could not delete message.');
      }
    }, [channelId, message.id]);

    const messageClasses = cn(
      'group relative block py-1 transition-all duration-200',
      shouldStack ? '' : 'mt-3.5',
      isEditing && 'bg-[#404249]/40',
      isReplyingTo && 'bg-primary/10 border-l-[4px] border-primary z-10',
      isMentioned && !isReplyingTo && 'bg-yellow-500/10 border-l-[4px] border-yellow-500/80',
      !isEditing && !isReplyingTo && !isMentioned && 'hover:bg-gray-800/40'
    );

    return (
      <>
        <Popover open={popoverOpen} onOpenChange={(open) => {
            // If the avatar was clicked, let the avatar handler manage the state
            if (avatarClickedRef.current) {
              avatarClickedRef.current = false;
              return;
            }
            setPopoverOpen(open);
          }}>
          <ContextMenu onOpenChange={(open) => { if (!open) setContextImageUrl(null); }}>
            <ContextMenuTrigger
              className={messageClasses}
              onContextMenu={(e) => {
                const img = e.target.closest('img');
                const isEmoji = img?.classList.contains('align-text-bottom');
                setContextImageUrl(!isEmoji ? img?.src || null : null);
              }}
            >
              {hasReply && (
                <div className="flex items-start gap-2 px-4">
                  <div className="mt-2 flex w-10">
                    <svg
                      width="33"
                      height="20"
                      viewBox="0 0 33 20"
                      fill="none"
                      className="text-gray-500"
                    >
                      <path
                        d="M17 15V10C17 5.58172 20.5817 2 25 2H33"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <MessageReplyBar referenceMessageId={replyMessageId} messages={allMessages} />
                </div>
              )}
              <div className="flex items-start gap-4 px-4">
                {shouldStack ? (
                  <div className="w-10" />
                ) : (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <button type="button" onClick={() => {
                        avatarClickedRef.current = true;
                        setPopoverOpen((prev) => !prev);
                      }}>
                        <Avatar user={message.author} className="size-10" />
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <GuildMemberContextMenu
                        user={message.author}
                        onViewProfile={() => {
                          setPopoverOpen(false);
                          useModalStore.getState().push(UserProfileModal, { userId: message.author.id, guildId });
                        }}
                      />
                    </ContextMenuContent>
                  </ContextMenu>
                )}

                <div className="flex flex-1 flex-col items-start justify-start">
                  {!shouldStack && (
                    <MessageHeader
                      message={message}
                      onViewProfile={() => {
                        setPopoverOpen(false);
                        useModalStore.getState().push(UserProfileModal, { userId: message.author.id, guildId });
                      }}
                    />
                  )}

                  {isEditing ? (
                    <MessageEditor
                      initialContent={message.content}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words text-gray-400 [overflow-wrap:anywhere]',
                        pending && 'opacity-50'
                      )}
                    >
                      <MessageContent content={message.content} stickers={message.stickers} attachments={message.attachments} author={message.author} timestamp={message.created_at} />
                      {message.updated_at && message.created_at !== message.updated_at && (
                        <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
                      )}
                    </div>
                  )}

                  {pending && message.attachments?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {message.attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1 rounded bg-[#2b2d31] px-2 py-0.5 text-xs text-[#949ba4]"
                        >
                          <Paperclip className="size-3" />
                          {att.filename}
                        </span>
                      ))}
                    </div>
                  )}

                  {pending && message.uploadProgress !== undefined && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#1e1f22]">
                        <div
                          className="h-full rounded-full bg-[#5865f2] transition-[width] duration-200"
                          style={{ width: `${message.uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-[#949ba4]">
                        {message.uploadProgress}%
                      </span>
                    </div>
                  )}

                  <MessageReactions message={message} channelId={channelId} />
                </div>
              </div>

              {!isEditing && !pending && (
                <MessageActions
                  message={message}
                  channelId={channelId}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setEditingId(message.id)}
                  onDelete={handleDelete}
                  onReply={() => setReplyingId(message.id)}
                />
              )}
            </ContextMenuTrigger>

            <MessageContextMenu
              message={message}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setEditingId(message.id)}
              onDelete={handleDelete}
              onReply={() => setReplyingId(message.id)}
              guildId={guildId}
              channelId={channelId}
              imageUrl={contextImageUrl}
            />
          </ContextMenu>

          <PopoverContent
            className="w-auto border-none bg-transparent p-0 shadow-none"
            align="start"
            alignOffset={0}
          >
            <GuildMemberPopoverContent
              userId={message.author.id}
              guild={null}
              onOpenProfile={() => {
                setPopoverOpen(false);
                useModalStore.getState().push(UserProfileModal, { userId: message.author.id, guildId });
              }}
            />
          </PopoverContent>
        </Popover>
      </>
    );
  }
);

ChannelMessage.displayName = 'ChannelMessage';
export default ChannelMessage;
