'use client';

import { EmojiPicker as EmojiPickerPrimitive } from 'frimousse';
import {
  Hash,
  Lightbulb,
  Plane,
  SearchIcon,
  Smile,
  Trees,
  Utensils,
  Gamepad2,
  Flag,
} from 'lucide-react';
import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../lib/utils';
import {
  getTwemojiUrl,
  getEmojiSpritePosition,
  SPRITE_SHEET_BG,
} from '../../utils/emoji.utils';
import {
  SPRITE_EMOJI_SIZE,
  SPRITE_COLS,
  SPRITE_ROWS,
} from '../../assets/emoji-sprites/constants';
import { useContextMenuStore } from '@/store/context-menu.store';
import EmojiContextMenu from './EmojiContextMenu';

function EmojiPicker({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        'isolate flex h-[430px] w-[400px] overflow-hidden rounded-lg border-none bg-[#2b2d31] text-gray-100 shadow-2xl',
        className
      )}
      data-slot="emoji-picker"
      {...props}
    />
  );
}

function EmojiPickerSidebar({
  categories,
  onCategorySelect,
  activeCategory,
}: {
  categories: { id: string; icon: React.ReactNode; label: string }[];
  onCategorySelect: (id: string) => void;
  activeCategory?: string;
}) {
  return (
    <div className="scrollbar-hide flex w-[52px] flex-col gap-1 bg-[#232428] py-3 pr-0.5 overflow-y-auto">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className={cn(
            'group relative flex items-center justify-center p-2 transition-all',
            activeCategory === category.id ? 'text-white' : 'text-[#b5bac1] hover:text-[#dbdee1]'
          )}
          title={category.label}
        >
          <div className="size-5 transition-colors">
            {category.icon}
          </div>
        </button>
      ))}
    </div>
  );
}

function EmojiPickerSearch({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div
      className={cn('z-10 flex h-[48px] items-center gap-2 bg-[#2b2d31] px-3', className)}
      data-slot="emoji-picker-search-wrapper"
    >
      <div className="relative w-full">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
          <SearchIcon className="size-4" />
        </div>
        <EmojiPickerPrimitive.Search
          className="h-8 w-full rounded bg-[#1e1f22] pl-9 pr-2 text-[14px] text-gray-200 placeholder:text-[#949ba4] focus:outline-none"
          data-slot="emoji-picker-search"
          placeholder="Search Emojis"
          {...props}
        />
      </div>
    </div>
  );
}

type GuildEmojiGroup = {
  id: string;
  name: string;
  icon?: string;
  emojis: { id: string; name: string; url: string }[];
};

interface EmojiPickerContentProps {
  className?: string;
  guildEmojis?: GuildEmojiGroup[];
  standardEmojis?: Record<string, { names: string[]; surrogates: string }[]>;
  onEmojiSelect?: (emoji: { id?: string; label: string; emoji: any; url?: string }) => void;
  searchValue?: string;
  onHoverEmojiChange?: (emoji: { label: string; url: string; isCustom: boolean } | null) => void;
  recentEmojis?: { id?: string; label: string; surrogates?: string; url?: string; isCustom: boolean }[];
  onCategoryVisible?: (categoryId: string) => void;
  activeCategory?: string;
}

// Renders a unicode emoji via CSS sprite sheet — single image, zero per-emoji requests.
// Sprite cells are SPRITE_EMOJI_SIZE (32px), displayed at DISPLAY_SIZE (24px).
const DISPLAY_SIZE = 24;
const SCALE = DISPLAY_SIZE / SPRITE_EMOJI_SIZE;
const SCALED_SHEET_SIZE = `${SPRITE_EMOJI_SIZE * SPRITE_COLS * SCALE}px ${SPRITE_EMOJI_SIZE * SPRITE_ROWS * SCALE}px`;

const SpriteEmoji = React.memo(({ surrogates }: { surrogates: string }) => {
  const pos = getEmojiSpritePosition(surrogates);
  if (!pos) return null;
  return (
    <div
      className="size-6"
      style={{
        backgroundImage: SPRITE_SHEET_BG,
        backgroundSize: SCALED_SHEET_SIZE,
        backgroundPosition: `${pos.x * SCALE}px ${pos.y * SCALE}px`,
      }}
    />
  );
});
SpriteEmoji.displayName = 'SpriteEmoji';

const COLS = 9;
const ROW_HEIGHT = 36; // size-9 = 36px
const HEADER_HEIGHT = 40; // pt-4 pb-2 + text

type VirtualRow =
  | {
      type: 'header';
      categoryId: string;
      label: string;
      icon?: string;
    }
  | {
      type: 'emoji-row';
      categoryId: string;
      emojis: Array<{
        kind: 'standard' | 'custom' | 'recent';
        id?: string;
        label: string;
        surrogates?: string;
        url?: string;
        isCustom: boolean;
      }>;
    };

function buildVirtualRows(
  recentEmojis: EmojiPickerContentProps['recentEmojis'],
  filteredGuildEmojis: GuildEmojiGroup[],
  filteredStandardEmojis: Record<string, { names: string[]; surrogates: string }[]>,
  searchValue: string
): VirtualRow[] {
  const rows: VirtualRow[] = [];

  // Recent emojis
  if (recentEmojis && recentEmojis.length > 0 && !searchValue) {
    rows.push({ type: 'header', categoryId: 'recent', label: 'Frequently Used' });
    for (let i = 0; i < recentEmojis.length; i += COLS) {
      rows.push({
        type: 'emoji-row',
        categoryId: 'recent',
        emojis: recentEmojis.slice(i, i + COLS).map((e) => ({
          kind: 'recent',
          id: e.id,
          label: e.label,
          surrogates: e.surrogates,
          url: e.url,
          isCustom: e.isCustom,
        })),
      });
    }
  }

  // Guild emojis
  for (const guild of filteredGuildEmojis) {
    const catId = `guild-${guild.id}`;
    rows.push({ type: 'header', categoryId: catId, label: guild.name, icon: guild.icon });
    for (let i = 0; i < guild.emojis.length; i += COLS) {
      rows.push({
        type: 'emoji-row',
        categoryId: catId,
        emojis: guild.emojis.slice(i, i + COLS).map((e) => ({
          kind: 'custom',
          id: e.id,
          label: e.name,
          url: e.url,
          isCustom: true,
        })),
      });
    }
  }

  // Standard emojis
  for (const [category, emojis] of Object.entries(filteredStandardEmojis)) {
    rows.push({ type: 'header', categoryId: category, label: category.replace(/_/g, ' ') });
    for (let i = 0; i < emojis.length; i += COLS) {
      rows.push({
        type: 'emoji-row',
        categoryId: category,
        emojis: emojis.slice(i, i + COLS).map((e) => ({
          kind: 'standard',
          label: e.names[0],
          surrogates: e.surrogates,
          isCustom: false,
        })),
      });
    }
  }

  return rows;
}

function EmojiPickerContent({
  className,
  guildEmojis = [],
  standardEmojis = {},
  onEmojiSelect,
  searchValue = '',
  onHoverEmojiChange,
  recentEmojis = [],
  onCategoryVisible,
  activeCategory,
}: EmojiPickerContentProps) {
  const searchLower = searchValue.toLowerCase();
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Clear hover state when leaving the viewport
  const handleMouseLeave = React.useCallback(() => {
    onHoverEmojiChange?.(null);
  }, [onHoverEmojiChange]);

  // Filter emojis with useMemo for performance
  const { filteredGuildEmojis, filteredStandardEmojis } = React.useMemo(() => {
    const fGuilds = guildEmojis
      .map((guild) => ({
        ...guild,
        emojis: guild.emojis.filter((e) => e.name.toLowerCase().includes(searchLower)),
      }))
      .filter((guild) => guild.emojis.length > 0);

    const fStandard: typeof standardEmojis = {};
    Object.entries(standardEmojis).forEach(([category, emojis]) => {
      const filtered = emojis.filter((e) =>
        e.names.some((n) => n.toLowerCase().includes(searchLower))
      );
      if (filtered.length > 0) {
        fStandard[category] = filtered;
      }
    });

    return { filteredGuildEmojis: fGuilds, filteredStandardEmojis: fStandard };
  }, [guildEmojis, standardEmojis, searchLower]);

  const virtualRows = React.useMemo(
    () => buildVirtualRows(recentEmojis, filteredGuildEmojis, filteredStandardEmojis, searchValue),
    [recentEmojis, filteredGuildEmojis, filteredStandardEmojis, searchValue]
  );

  // Build a map from categoryId to the first row index for that category
  const categoryRowIndexMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < virtualRows.length; i++) {
      const row = virtualRows[i];
      if (row.type === 'header' && !(row.categoryId in map)) {
        map[row.categoryId] = i;
      }
    }
    return map;
  }, [virtualRows]);

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (virtualRows[index].type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 8,
  });

  // Detect active category from visible virtual items
  React.useEffect(() => {
    if (searchValue || !onCategoryVisible) return;
    const items = rowVirtualizer.getVirtualItems();
    if (items.length === 0) return;

    // Find the first visible header or the category of the first visible row
    for (const item of items) {
      const row = virtualRows[item.index];
      if (row) {
        onCategoryVisible(row.categoryId);
        return;
      }
    }
  }, [rowVirtualizer.getVirtualItems(), onCategoryVisible, searchValue, virtualRows]);

  // Expose a way to scroll to category (used by sidebar)
  const scrollToCategoryRef = React.useRef<(categoryId: string) => void>();
  scrollToCategoryRef.current = (categoryId: string) => {
    const rowIndex = categoryRowIndexMap[categoryId];
    if (rowIndex !== undefined) {
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'start' });
    }
  };

  // Attach scrollToCategory to the parent DOM element so the sidebar can call it
  React.useEffect(() => {
    const el = parentRef.current;
    if (el) {
      (el as any).__scrollToCategory = (categoryId: string) => {
        scrollToCategoryRef.current?.(categoryId);
      };
    }
  }, [categoryRowIndexMap]);

  const hasCustom = filteredGuildEmojis.length > 0;
  const hasStandard = Object.keys(filteredStandardEmojis).length > 0;
  const hasRecent = recentEmojis.length > 0 && !searchValue;
  const isEmpty = !hasCustom && !hasStandard && !hasRecent;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#2b2d31]">
      <div
        ref={parentRef}
        className={cn(
          'relative flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a1b1e] scrollbar-track-transparent hover:scrollbar-thumb-[#1a1b1e]/80',
          className
        )}
        onMouseLeave={handleMouseLeave}
        data-slot="emoji-picker-viewport"
      >
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            No emoji found.
          </div>
        )}

        {!isEmpty && (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const row = virtualRows[virtualItem.index];
              if (!row) return null;

              if (row.type === 'header') {
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-2 bg-[#2b2d31] px-2 pt-4 pb-2 text-[12px] font-semibold uppercase transition-colors',
                        activeCategory === row.categoryId
                          ? 'text-[#dbdee1]'
                          : 'text-[#949ba4]'
                      )}
                    >
                      {row.icon && (
                        <img src={row.icon} className="size-4 rounded-full" />
                      )}
                      {row.label}
                    </div>
                  </div>
                );
              }

              // emoji-row
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="flex gap-0.5 px-2">
                    {row.emojis.map((emoji, colIdx) => (
                      <button
                        key={`${emoji.label}-${colIdx}`}
                        className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-[#35373c]"
                        onClick={() => {
                          if (emoji.kind === 'custom') {
                            onEmojiSelect?.({
                              id: emoji.id,
                              label: emoji.label,
                              emoji: null,
                              url: emoji.url,
                            });
                          } else {
                            onEmojiSelect?.({
                              id: emoji.id,
                              label: emoji.label,
                              emoji: emoji.surrogates,
                              url: emoji.url,
                            });
                          }
                        }}
                        onMouseEnter={() =>
                          onHoverEmojiChange?.({
                            label: emoji.label,
                            url:
                              emoji.url ||
                              (emoji.surrogates ? getTwemojiUrl(emoji.surrogates) : '') ||
                              '',
                            isCustom: emoji.isCustom,
                          })
                        }
                        onContextMenu={
                          emoji.isCustom
                            ? (e: React.MouseEvent) => {
                                useContextMenuStore
                                  .getState()
                                  .open(EmojiContextMenu, { emojiId: emoji.id }, e);
                              }
                            : undefined
                        }
                      >
                        {emoji.surrogates ? (
                          <SpriteEmoji surrogates={emoji.surrogates} />
                        ) : (
                          <img
                            src={emoji.url}
                            alt={emoji.label}
                            className="size-6 object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmojiPickerFooter({
  className,
  hoveredEmoji,
  ...props
}: React.ComponentProps<'div'> & {
  hoveredEmoji?: { label: string; url: string; isCustom: boolean } | null;
}) {
  return (
    <div
      className={cn(
        'flex h-12 w-full min-w-0 items-center border-t border-[#1e1f22] bg-[#2b2d31] px-3',
        className
      )}
      data-slot="emoji-picker-footer"
      {...props}
    >
      {hoveredEmoji ? (
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={hoveredEmoji.url}
            alt={hoveredEmoji.label}
            className={cn('size-8 object-contain', hoveredEmoji.isCustom ? 'h-8 w-8' : 'h-7 w-7')}
          />
          <span className="truncate text-[14px] font-bold text-white">
            :{hoveredEmoji.label}:
          </span>
        </div>
      ) : (
        <span className="text-[14px] font-bold text-[#949ba4]">Pick an emoji</span>
      )}
    </div>
  );
}

export {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSidebar,
};
