import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createTextNode, $getSelection, $isRangeSelection } from 'lexical';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { $createMentionNode } from '../nodes/MentionNode';
import Avatar from '../../../Avatar.jsx';

const SUGGESTIONS_LIMIT = 7;

class MentionMenuOption extends MenuOption {
  member;
  label;
  userId;
  color;

  constructor(member, resolveUser) {
    super(member.user_id);
    this.member = member;
    this.userId = member.user_id;
    const resolved = resolveUser(member.user_id);
    this.label = resolved.label;
    this.color = resolved.color;
  }
}

export default function MentionPlugin({ members, resolveUser, menuContainer }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);

  const triggerFn = useBasicTypeaheadTriggerMatch('@', {
    minLength: 0,
  });

  const options = useMemo(() => {
    if (queryString === null) return [];
    const q = queryString.toLowerCase();
    return members
      .filter(
        (m) =>
          m.user.username.toLowerCase().includes(q) ||
          m.user.name.toLowerCase().includes(q)
      )
      .slice(0, SUGGESTIONS_LIMIT)
      .map((m) => new MentionMenuOption(m, resolveUser));
  }, [members, queryString, resolveUser]);

  const onSelectOption = useCallback(
    (option, textNodeContainingQuery, closeMenu) => {
      editor.update(() => {
        const mentionNode = $createMentionNode(
          option.userId,
          option.label,
          option.color
        );
        const spaceNode = $createTextNode(' ');

        if (textNodeContainingQuery) {
          textNodeContainingQuery.replace(mentionNode);
          mentionNode.insertAfter(spaceNode);
        } else {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([mentionNode, spaceNode]);
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
                Members
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
                  <Avatar user={option.member.user} size={24} className="shrink-0" />
                  <div className="flex-1 truncate font-medium">
                    {option.member.user.name}
                  </div>
                  <div className="text-xs font-normal text-gray-400">
                    @{option.member.user.username}
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
