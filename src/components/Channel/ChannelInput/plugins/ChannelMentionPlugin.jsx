import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createTextNode, $getSelection, $isRangeSelection } from 'lexical';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { $createChannelMentionNode } from '../nodes/ChannelMentionNode';
import { Hash, Megaphone, SpeakerHigh } from '@phosphor-icons/react';

const SUGGESTIONS_LIMIT = 7;

class ChannelMenuOption extends MenuOption {
  channel;

  constructor(channel) {
    super(channel.channel_id || channel.id);
    this.channel = channel;
  }
}

export default function ChannelMentionPlugin({ channels, menuContainer }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);

  const triggerFn = useBasicTypeaheadTriggerMatch('#', {
    minLength: 0,
  });

  const options = useMemo(() => {
    if (queryString === null) return [];

    const available = channels.filter((c) => c.type === 0);
    const q = queryString.toLowerCase();

    if (q === '') {
      return [...available]
        .sort(() => 0.5 - Math.random())
        .slice(0, SUGGESTIONS_LIMIT)
        .map((c) => new ChannelMenuOption(c));
    }

    return available
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;
        if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
        if (bName.startsWith(q) && !aName.startsWith(q)) return 1;
        return 0;
      })
      .slice(0, SUGGESTIONS_LIMIT)
      .map((c) => new ChannelMenuOption(c));
  }, [channels, queryString]);

  const onSelectOption = useCallback(
    (option, textNodeContainingQuery, closeMenu) => {
      editor.update(() => {
        const channelId = option.channel.channel_id || option.channel.id;
        const channelNode = $createChannelMentionNode(channelId, option.channel.name);
        const spaceNode = $createTextNode(' ');

        if (textNodeContainingQuery) {
          textNodeContainingQuery.replace(channelNode);
          channelNode.insertAfter(spaceNode);
        } else {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([channelNode, spaceNode]);
          }
        }

        spaceNode.select(1, 1);
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
          <div className="absolute inset-x-0 bottom-full z-[1005] mb-1 rounded bg-[#222327] p-0 shadow-lg">
            <div className="p-2">
              <div className="mb-2 px-2 text-xs font-bold uppercase text-gray-400">
                Text Channels
              </div>
              {opts.map((option, i) => (
                <button
                  key={option.key}
                  ref={(el) => option.setRefElement(el)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-200 ${
                    selectedIndex === i ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                  }`}
                  onClick={() => selectOptionAndCleanUp(option)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {option.channel.type === 2 ? (
                    <SpeakerHigh className="size-4 text-gray-400" />
                  ) : option.channel.type === 5 ? (
                    <Megaphone className="size-4 text-gray-400" />
                  ) : (
                    <Hash className="size-4 text-gray-400" />
                  )}
                  <div className="flex-1 truncate font-medium">{option.channel.name}</div>
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
