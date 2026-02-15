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

import { cn } from '../../lib/utils';
import { getTwemojiUrl } from '../../utils/emoji.utils';

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

// Custom props for the Content to include custom and standard emojis
interface EmojiPickerContentProps
  extends React.ComponentProps<typeof EmojiPickerPrimitive.Viewport> {
  customEmojis?: { id: string; name: string; url: string }[];
  standardEmojis?: Record<string, { names: string[]; surrogates: string }[]>;
  onEmojiSelect?: (emoji: { label: string; emoji: any; url?: string }) => void;
  searchValue?: string;
  serverName?: string;
  serverIcon?: string;
  onHoverEmojiChange?: (emoji: { label: string; url: string; isCustom: boolean } | null) => void;
}

const EmojiButton = React.memo(
  ({
    label,
    surrogates,
    onClick,
    onHover,
  }: {
    label: string;
    surrogates: string;
    onClick: () => void;
    onHover: (hover: boolean) => void;
  }) => (
    <button
      className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-[#35373c]"
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
    >
      <img
        src={getTwemojiUrl(surrogates)}
        alt={surrogates}
        className="size-6 object-contain"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </button>
  )
);
EmojiButton.displayName = 'EmojiButton';

function EmojiPickerContent({
  className,
  customEmojis = [],
  standardEmojis = {},
  onEmojiSelect,
  searchValue = '',
  serverName,
  serverIcon,
  onHoverEmojiChange,
  ...props
}: EmojiPickerContentProps) {
  const searchLower = searchValue.toLowerCase();

  // Clear hover state when leaving the viewport
  const handleMouseLeave = React.useCallback(() => {
    onHoverEmojiChange?.(null);
  }, [onHoverEmojiChange]);

  // Filter emojis with useMemo for performance
  const { filteredCustomEmojis, filteredStandardEmojis } = React.useMemo(() => {
    const fCustom = customEmojis.filter((e) => e.name.toLowerCase().includes(searchLower));

    const fStandard: typeof standardEmojis = {};
    Object.entries(standardEmojis).forEach(([category, emojis]) => {
      const filtered = emojis.filter((e) =>
        e.names.some((n) => n.toLowerCase().includes(searchLower))
      );
      if (filtered.length > 0) {
        fStandard[category] = filtered;
      }
    });

    return { filteredCustomEmojis: fCustom, filteredStandardEmojis: fStandard };
  }, [customEmojis, standardEmojis, searchLower]);

  const hasCustom = filteredCustomEmojis.length > 0;
  const hasStandard = Object.keys(filteredStandardEmojis).length > 0;
  const isEmpty = !hasCustom && !hasStandard;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#2b2d31]">
      <EmojiPickerPrimitive.Viewport
        className={cn(
          'relative flex-1 scrollbar-thin scrollbar-thumb-[#1a1b1e] scrollbar-track-transparent hover:scrollbar-thumb-[#1a1b1e]/80',
          className
        )}
        onMouseLeave={handleMouseLeave}
        data-slot="emoji-picker-viewport"
        {...props}
      >
        {/* Helper for empty state */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            No emoji found.
          </div>
        )}

        {/* Custom Emojis Section */}
        {hasCustom && (
          <div className="pb-2" id="category-custom">
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#2b2d31] px-2 pt-4 pb-2 text-[12px] font-semibold uppercase text-[#949ba4]">
              {serverIcon && <img src={serverIcon} className="size-4 rounded-full" />}
              {serverName || 'Server Emojis'}
            </div>
            <div className="grid grid-cols-9 gap-0.5 px-2">
              {filteredCustomEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-[#35373c]"
                  onClick={() =>
                    onEmojiSelect?.({ label: emoji.name, emoji: null, url: emoji.url })
                  }
                  onMouseEnter={() =>
                    onHoverEmojiChange?.({ label: emoji.name, url: emoji.url, isCustom: true })
                  }
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="size-6 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standard Emojis Section */}
        {Object.entries(filteredStandardEmojis).map(([category, emojis]) => (
          <div key={category} id={`category-${category}`} className="pb-2">
            <div className="sticky top-0 z-10 bg-[#2b2d31] px-2 pt-4 pb-2 text-[12px] font-semibold uppercase text-[#949ba4]">
              {category.replace(/_/g, ' ')}
            </div>
            <div className="grid grid-cols-9 gap-0.5 px-2">
              {emojis.map((emoji, index) => (
                <EmojiButton
                  key={`${category}-${index}`}
                  label={emoji.names[0]}
                  surrogates={emoji.surrogates}
                  onClick={() => onEmojiSelect?.({ label: emoji.names[0], emoji: emoji.surrogates })}
                  onHover={(isHovering) => {
                    if (isHovering) {
                      onHoverEmojiChange?.({
                        label: emoji.names[0],
                        url: getTwemojiUrl(emoji.surrogates),
                        isCustom: false,
                      });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </EmojiPickerPrimitive.Viewport>
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
