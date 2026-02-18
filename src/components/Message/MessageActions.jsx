import { useState, useCallback, useMemo } from 'react';
import { NotePencil, Trash, Smiley, ArrowBendUpLeft, Hash } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSidebar,
} from '../ui/emoji-picker';
import { ChannelsService } from '@/services/channels.service';
import { useGuildContext } from '../../contexts/GuildContext';
import { useGuildsStore } from '../../store/guilds.store';
import { useEmojisStore } from '../../store/emojis.store';
import emojisData from '../../assets/emojis/emojis.json';
import {
  Smile,
  Clock,
  PawPrint,
  Pizza,
  Trophy,
  Plane,
  Lightbulb,
  Shapes,
  Flag as FlagIcon,
} from 'lucide-react';

const MessageActions = ({ message, channelId, canEdit, canDelete, onEdit, onDelete, onReply }) => {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const [activeCategory, setActiveCategory] = useState('recent');

  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();
  const { guildEmojis, recentEmojis, addRecentEmoji } = useEmojisStore();

  const guildEmojiGroups = useMemo(() => {
    return guildsStore.guilds
      .filter((g) => (guildEmojis[g.id] || []).length > 0)
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon_file_id ? `${import.meta.env.VITE_CDN_BASE_URL}/icons/${g.icon_file_id}` : undefined,
        emojis: (guildEmojis[g.id] || []).map((e) => ({
          id: e.id,
          name: e.name,
          url: `${import.meta.env.VITE_CDN_BASE_URL}/emojis/${e.id}`,
        })),
      }));
  }, [guildsStore.guilds, guildEmojis]);

  const handleAddReaction = useCallback(
    ({ id, label, emoji, url }) => {
      if (!message.id || !channelId) return;

      addRecentEmoji({
        id,
        label,
        surrogates: emoji,
        url,
        isCustom: !!url,
      });

      // For custom emojis use <id:name> format, for standard use the emoji character
      const reactionValue = id ? `<${id}:${label}>` : emoji;
      ChannelsService.toggleMessageReaction(channelId, message.id, reactionValue);
      setEmojiPickerOpen(false);
      setEmojiSearch('');
    },
    [message.id, channelId, addRecentEmoji]
  );

  return (
    <div
      className={`absolute -top-4 right-4 z-40 rounded-md border border-white/5 bg-gray-700 ${emojiPickerOpen ? 'flex' : 'hidden group-hover:flex'}`}
    >
      <button
        type="button"
        onClick={onReply}
        className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary"
      >
        <ArrowBendUpLeft className="size-5" />
      </button>

      <Popover.Root open={emojiPickerOpen} onOpenChange={(open) => {
        setEmojiPickerOpen(open);
        if (!open) setEmojiSearch('');
      }} modal={false}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary"
          >
            <Smiley className="size-5" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="end"
            sideOffset={8}
            collisionPadding={16}
            className="z-[1000] flex h-[430px] w-[452px] border-none bg-transparent p-0 shadow-none data-[state=closed]:pointer-events-none data-[state=closed]:invisible"
          >
            <EmojiPicker className="flex size-full flex-row">
              <EmojiPickerSidebar
                activeCategory={activeCategory}
                onCategorySelect={(id) => {
                  setActiveCategory(id);
                  const viewport = document.querySelector('[data-slot="emoji-picker-viewport"]');
                  if (!viewport) return;

                  if (id === 'recent') {
                    viewport.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }

                  const el = document.getElementById(`category-${id}`);
                  if (el) {
                    viewport.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                  }
                }}
                categories={[
                  { id: 'recent', label: 'Recent', icon: <Clock className="size-[20px]" /> },
                  ...guildEmojiGroups.map((g) => ({
                    id: `guild-${g.id}`,
                    label: g.name,
                    icon: g.icon ? (
                      <img src={g.icon} className="size-5 rounded-full" />
                    ) : (
                      <Hash className="size-[20px]" />
                    ),
                  })),
                  { id: 'people', label: 'People', icon: <Smile className="size-[20px]" /> },
                  { id: 'nature', label: 'Nature', icon: <PawPrint className="size-[20px]" /> },
                  { id: 'food', label: 'Food', icon: <Pizza className="size-[20px]" /> },
                  { id: 'activity', label: 'Activities', icon: <Trophy className="size-[20px]" /> },
                  { id: 'travel', label: 'Travel', icon: <Plane className="size-[20px]" /> },
                  { id: 'objects', label: 'Objects', icon: <Lightbulb className="size-[20px]" /> },
                  { id: 'symbols', label: 'Symbols', icon: <Shapes className="size-[20px]" /> },
                  { id: 'flags', label: 'Flags', icon: <FlagIcon className="size-[20px]" /> },
                ]}
              />
              <div className="flex min-w-0 flex-1 flex-col bg-[#2b2d31]">
                <EmojiPickerSearch
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                />
                <EmojiPickerContent
                  searchValue={emojiSearch}
                  standardEmojis={emojisData}
                  recentEmojis={recentEmojis}
                  onCategoryVisible={setActiveCategory}
                  guildEmojis={guildEmojiGroups}
                  onHoverEmojiChange={setHoveredEmoji}
                  onEmojiSelect={handleAddReaction}
                />
                <EmojiPickerFooter hoveredEmoji={hoveredEmoji} />
              </div>
            </EmojiPicker>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary"
        >
          <NotePencil className="size-5" />
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary"
        >
          <Trash className="size-5" />
        </button>
      )}
    </div>
  );
};

export default MessageActions;
