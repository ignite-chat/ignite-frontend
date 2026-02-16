import { useState, useCallback, useMemo, memo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '../../api';
import useStore from '../../hooks/useStore';
import { useChannelsStore } from '../../store/channels.store';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import Avatar from '../Avatar.jsx';
import GuildMemberContextMenu from '../GuildMember/GuildMemberContextMenu';
import GuildMemberPopoverContent from '../GuildMember/GuildMemberPopoverContent';
import UserProfileModal from '../UserProfileModal';
import MessageContent from '../MessageContent/MessageContent.jsx';
import MessageHeader from './MessageHeader';
import MessageEditor from './MessageEditor';
import MessageReactions from './MessageReactions';
import MessageActions from './MessageActions';
import MessageContextMenu from './MessageContextMenu';
import MessageReplyBar from './MessageReplyBar';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';
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
    const store = useStore();
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
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
      () => message.author.id === store.user.id,
      [message.author.id, store.user.id]
    );

    const canDelete = useMemo(() => {
      if (message.author.id === store.user.id) return true;
      if (!guildId || !message.channel_id) return false;
      return PermissionsService.hasPermission(
        guildId,
        message.channel_id,
        Permissions.MANAGE_MESSAGES
      );
    }, [guildId, message.channel_id, message.author.id, store.user.id]);

    const isMentioned = useMemo(() => {
      if (!message.mentions || !store.user?.id) return false;
      return message.mentions.some((mention) => mention.user_id === store.user.id);
    }, [message.mentions, store.user?.id]);

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
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <ContextMenu>
            <ContextMenuTrigger className={messageClasses}>
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
                ) : hasReply ? (
                  <ContextMenu>
                    <PopoverTrigger>
                      <ContextMenuTrigger>
                        <Avatar user={message.author} className="size-10" />
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <GuildMemberContextMenu
                          user={message.author}
                          onViewProfile={() => {
                            setPopoverOpen(false);
                            setProfileModalOpen(true);
                          }}
                        />
                      </ContextMenuContent>
                    </PopoverTrigger>
                  </ContextMenu>
                ) : (
                  <ContextMenu>
                    <PopoverTrigger>
                      <ContextMenuTrigger>
                        <Avatar user={message.author} className="size-10" />
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <GuildMemberContextMenu
                          user={message.author}
                          onViewProfile={() => {
                            setPopoverOpen(false);
                            setProfileModalOpen(true);
                          }}
                        />
                      </ContextMenuContent>
                    </PopoverTrigger>
                  </ContextMenu>
                )}

                <div className="flex flex-1 flex-col items-start justify-start">
                  {!shouldStack && (
                    <MessageHeader
                      message={message}
                      onViewProfile={() => {
                        setPopoverOpen(false);
                        setProfileModalOpen(true);
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
                      <MessageContent content={message.content} />
                      {message.updated_at && message.created_at !== message.updated_at && (
                        <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
                      )}
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
                setProfileModalOpen(true);
              }}
            />
          </PopoverContent>
        </Popover>
        <UserProfileModal
          user={message.author}
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
        />
      </>
    );
  }
);

ChannelMessage.displayName = 'ChannelMessage';
export default ChannelMessage;
