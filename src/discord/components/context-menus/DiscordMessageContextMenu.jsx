import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { ArrowBendUpLeft, Copy, Trash, Bug, Smiley } from '@phosphor-icons/react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { DiscordApiService } from '../../services/discord-api.service';
import { DiscordService } from '../../services/discord.service';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordReplyStore } from '../../store/discord-reply.store';
import { useDiscordGuildsStore } from '../../store/discord-guilds.store';
import { useDiscordMembersStore } from '../../store/discord-members.store';
import { useModalStore } from '@/store/modal.store';
import { getTwemojiUrl } from '@/utils/emoji.utils';
import { useEmojisStore } from '@/ignite/store/emojis.store';
import DeleteMessageModal from '@/components/modals/DeleteMessageModal';
import DiscordDebugInfoModal from '../modals/DiscordDebugInfoModal';

const DISCORD_EMOJI_CDN = 'https://cdn.discordapp.com/emojis';

const COMMON_REACTION_EMOJIS = [
  '👍', '👎', '😂', '❤️', '😮', '😢',
  '🔥', '🎉', '👀', '💯', '✅', '❌',
  '😍', '🤔', '😭', '😡', '🙏', '👏',
];

const QUICK_REACTION_LIMIT = 4;

const DiscordMessageContextMenu = ({ message, canDelete, guildId }) => {
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const storeMember = useDiscordMembersStore((s) =>
    guildId ? s.members[guildId]?.[message.author.id] : undefined
  );
  const member = message.member || storeMember;

  const nameColor = useMemo(() => {
    if (!guildId || !member?.roles) return undefined;
    const guild = guilds.find((g) => g.id === guildId);
    const guildRoles = guild?.roles || guild?.properties?.roles;
    if (!guildRoles) return undefined;
    const topColorRole = guildRoles
      .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .find((r) => r.color && r.color !== 0);
    if (!topColorRole) return undefined;
    return `#${topColorRole.color.toString(16).padStart(6, '0')}`;
  }, [guildId, guilds, member?.roles]);

  const { recentEmojis, addRecentEmoji } = useEmojisStore();
  const guild = guilds.find((g) => g.id === guildId);
  const guildEmojiIds = useMemo(() => new Set((guild?.emojis || []).map((e) => e.id)), [guild?.emojis]);
  const quickEmojis = recentEmojis
    .filter((e) => !e.isCustom || guildEmojiIds.has(e.id))
    .slice(0, QUICK_REACTION_LIMIT);

  const addReaction = useCallback((emoji) => {
    // Track in the shared emoji store
    addRecentEmoji({
      id: emoji.id || null,
      label: emoji.name,
      surrogates: emoji.id ? null : emoji.name,
      url: emoji.url || null,
      isCustom: !!emoji.id,
    });
    const emojiString = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
    console.log('[Reaction] addReaction called with:', emoji, '-> emojiString:', emojiString);
    DiscordApiService.addReaction(message.channel_id, message.id, emojiString);
  }, [message.channel_id, message.id, addRecentEmoji]);

  const handleReply = () => {
    useDiscordReplyStore.getState().setReplyingMessage(message.id, message);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message text copied to clipboard.');
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(message.id);
    toast.success('Message ID copied to clipboard.');
  };

  const handleDebugInfo = () => {
    const storeMsg = useDiscordChannelsStore.getState().channelMessages[message.channel_id]
      ?.find((m) => m.id === message.id);
    useModalStore.getState().push(DiscordDebugInfoModal, { data: storeMsg || message });
  };

  const handleDelete = () => {
    const avatarUrl = message.author
      ? DiscordService.getUserAvatarUrl(message.author.id, message.author.avatar, 40)
      : null;
    useModalStore.getState().push(DeleteMessageModal, {
      message: { ...message, author: { ...message.author, avatar_url: avatarUrl } },
      nameColor,
      onConfirm: async () => {
        try {
          await DiscordApiService.deleteMessage(message.channel_id, message.id);
          useDiscordChannelsStore.getState().removeMessage(message.channel_id, message.id);
          toast.success('Message deleted.');
        } catch {
          toast.error('Failed to delete message.');
        }
      },
    });
  };

  return (
    <ContextMenuContent className="w-52">
      {/* Quick reaction bar */}
      {quickEmojis.length > 0 && (
        <>
          <div className="flex items-center gap-1 px-2 py-1.5">
            {quickEmojis.map((emoji, i) => {
              const imgUrl = emoji.url || (emoji.id
                ? `${DISCORD_EMOJI_CDN}/${emoji.id}.webp?size=32`
                : getTwemojiUrl(emoji.surrogates || emoji.label));
              return (
                <ContextMenuItem
                  key={i}
                  className="flex size-8 items-center justify-center rounded p-0"
                  onSelect={() => addReaction({ id: emoji.id, name: emoji.label, url: emoji.url })}
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt={emoji.label} className="size-5" />
                  ) : (
                    <span className="text-lg">{emoji.surrogates || emoji.label}</span>
                  )}
                </ContextMenuItem>
              );
            })}
          </div>
          <ContextMenuSeparator />
        </>
      )}

      {/* Add Reaction submenu with common emojis */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="justify-between">
          Add Reaction
          <Smiley className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-auto p-2">
          <div className="grid grid-cols-6 gap-0.5">
            {COMMON_REACTION_EMOJIS.map((emoji) => {
              const url = getTwemojiUrl(emoji);
              return (
                <ContextMenuItem
                  key={emoji}
                  className="flex size-8 items-center justify-center rounded p-0"
                  onSelect={() => addReaction({ id: null, name: emoji })}
                >
                  {url ? (
                    <img src={url} alt={emoji} className="size-5" />
                  ) : (
                    <span className="text-lg">{emoji}</span>
                  )}
                </ContextMenuItem>
              );
            })}
          </div>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={handleReply}>
        Reply
        <ArrowBendUpLeft className="ml-auto size-[18px]" weight="fill" />
      </ContextMenuItem>
      <ContextMenuSeparator />
      {message.content && (
        <ContextMenuItem className="justify-between" onSelect={handleCopyText}>
          Copy Text
          <Copy className="ml-auto size-[18px]" weight="fill" />
        </ContextMenuItem>
      )}
      <ContextMenuItem className="justify-between" onSelect={handleCopyId}>
        Copy Message ID
        <span className="ml-auto flex h-[18px] items-center rounded-[3px] bg-[#b5bac1] px-1 text-[10px] font-bold leading-none text-[#111214]">ID</span>
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem className="justify-between" onSelect={handleDebugInfo}>
        Debug Info
        <Bug className="ml-auto size-[18px]" />
      </ContextMenuItem>

      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={handleDelete}
            className="justify-between text-[#f23f42] focus:bg-[#da373c] focus:text-white"
          >
            Delete Message
            <Trash className="ml-auto size-[18px]" weight="fill" />
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
};

export default DiscordMessageContextMenu;
