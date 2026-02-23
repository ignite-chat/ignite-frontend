import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createTextNode, $getSelection, $isRangeSelection } from 'lexical';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { emojiMap, getTwemojiUrl } from '../../../../utils/emoji.utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../../ui/context-menu';
import { toast } from 'sonner';

const SUGGESTIONS_LIMIT = 10;

class EmojiMenuOption extends MenuOption {
  shortcode;
  displayName;
  emoji;
  custom;
  imageUrl;
  id;

  constructor(data) {
    super(data.shortcode);
    this.shortcode = data.shortcode;
    this.displayName = data.displayName;
    this.emoji = data.emoji;
    this.custom = data.custom;
    this.imageUrl = data.imageUrl;
    this.id = data.id;
  }
}

export default function EmojiSuggestionPlugin({ guildEmojis, guildId, menuContainer }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);

  const triggerFn = useBasicTypeaheadTriggerMatch(':', {
    minLength: 1,
  });

  const options = useMemo(() => {
    if (queryString === null) return [];
    const q = queryString.toLowerCase();

    const results = [];

    // Collect all unique custom emojis
    const allCustom = [];

    // Priority 1: Current guild emojis
    const currentGuildEmojis = guildEmojis[guildId] || [];
    currentGuildEmojis.forEach((e) => {
      if (e.name.toLowerCase().includes(q)) {
        allCustom.push({ ...e, fromCurrent: true });
      }
    });

    // Priority 2: Other guilds
    Object.entries(guildEmojis).forEach(([gid, emojis]) => {
      if (gid === guildId) return;
      emojis.forEach((e) => {
        if (e.name.toLowerCase().includes(q) && !allCustom.find((ac) => ac.id === e.id)) {
          allCustom.push({ ...e, fromCurrent: false });
        }
      });
    });

    // Map custom emojis
    allCustom.slice(0, SUGGESTIONS_LIMIT).forEach((e) => {
      results.push(
        new EmojiMenuOption({
          shortcode: e.fromCurrent ? `:${e.name}:` : `<${e.id}:${e.name}>`,
          displayName: `:${e.name}:`,
          id: e.id,
          emoji: null,
          custom: true,
          imageUrl: `${import.meta.env.VITE_CDN_BASE_URL}/emojis/${e.id}`,
        })
      );
    });

    // Priority 3: Standard emojis
    for (const [shortcode, emoji] of emojiMap) {
      if (results.length >= SUGGESTIONS_LIMIT) break;
      if (shortcode.toLowerCase().includes(`:${q}`)) {
        results.push(
          new EmojiMenuOption({
            shortcode,
            displayName: shortcode,
            emoji,
            custom: false,
          })
        );
      }
    }

    return results;
  }, [queryString, guildEmojis, guildId]);

  const onSelectOption = useCallback(
    (option, textNodeContainingQuery, closeMenu) => {
      editor.update(() => {
        const textNode = $createTextNode(option.shortcode);

        if (textNodeContainingQuery) {
          textNodeContainingQuery.replace(textNode);
        } else {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([textNode]);
          }
        }

        textNode.select(textNode.getTextContentSize(), textNode.getTextContentSize());
        closeMenu();
      });
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, options: opts }) => {
        if (opts.length === 0 || !menuContainer?.current) return null;

        return createPortal(
          <div className="absolute inset-x-0 bottom-full z-[1005] mb-1 flex max-h-[300px] flex-col rounded border border-white/5 bg-[#222327] shadow-lg">
            <div className="shrink-0 border-b border-white/5 px-4 py-3 text-xs font-bold uppercase text-gray-400">
              Emoji matching :{queryString}
            </div>
            <div className="flex-1 overflow-y-auto">
              {opts.map((option, i) => (
                <button
                  key={option.key}
                  ref={(el) => option.setRefElement(el)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    selectedIndex === i ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                  }`}
                  onClick={() => selectOptionAndCleanUp(option)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="flex-1 truncate font-medium text-gray-200">
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div className="flex w-full cursor-default items-center gap-3">
                          {option.custom ? (
                            <img
                              src={option.imageUrl}
                              alt={option.shortcode}
                              className="size-6 shrink-0 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <img
                              src={getTwemojiUrl(option.emoji)}
                              alt={option.emoji}
                              className="size-6 shrink-0 object-contain"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1 truncate font-medium text-gray-200">
                            {option.displayName}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      {option.custom && (
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (option.id) {
                                navigator.clipboard.writeText(option.id);
                                toast.success('Emoji ID copied to clipboard');
                              }
                            }}
                          >
                            Copy Emoji ID
                          </ContextMenuItem>
                        </ContextMenuContent>
                      )}
                    </ContextMenu>
                  </div>
                </button>
              ))}
            </div>
          </div>,
          menuContainer.current
        );
      }}
    />
  );
}
