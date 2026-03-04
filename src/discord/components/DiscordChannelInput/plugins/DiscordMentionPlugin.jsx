import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createTextNode, $getSelection, $isRangeSelection } from 'lexical';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { $createMentionNode } from '@/ignite/components/channel/ChannelInput/nodes/MentionNode';
import { DiscordService } from '@/discord/services/discord.service';

const SUGGESTIONS_LIMIT = 7;

class MentionMenuOption extends MenuOption {
  member;
  label;
  userId;
  color;
  avatarUrl;

  constructor(member, color) {
    super(member.user?.id || member.user_id);
    this.member = member;
    this.userId = member.user?.id || member.user_id;
    const user = member.user || {};
    this.label = `@${user.global_name || user.username || 'unknown'}`;
    this.color = color || 'inherit';
    this.avatarUrl = DiscordService.getUserAvatarUrl(this.userId, user.avatar, 32);
  }
}

export default function DiscordMentionPlugin({ members, guildRoles, guildId, menuContainer }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);

  const triggerFn = useBasicTypeaheadTriggerMatch('@', {
    minLength: 0,
  });

  const resolveColor = useCallback(
    (member) => {
      if (!guildRoles || !member.roles) return 'inherit';
      const topColorRole = guildRoles
        .filter((r) => member.roles.includes(r.id) && r.id !== guildId)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .find((r) => r.color && r.color !== 0);
      if (!topColorRole) return 'inherit';
      return `#${topColorRole.color.toString(16).padStart(6, '0')}`;
    },
    [guildRoles, guildId]
  );

  const options = useMemo(() => {
    if (queryString === null) return [];
    const q = queryString.toLowerCase();
    return members
      .filter((m) => {
        const user = m.user || {};
        const nick = m.nick || '';
        return (
          (user.username || '').toLowerCase().includes(q) ||
          (user.global_name || '').toLowerCase().includes(q) ||
          nick.toLowerCase().includes(q)
        );
      })
      .slice(0, SUGGESTIONS_LIMIT)
      .map((m) => new MentionMenuOption(m, resolveColor(m)));
  }, [members, queryString, resolveColor]);

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
              {opts.map((option, i) => {
                const user = option.member.user || {};
                const nick = option.member.nick;
                const displayName = nick || user.global_name || user.username;
                return (
                  <button
                    key={option.key}
                    ref={(el) => option.setRefElement(el)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-200 ${
                      selectedIndex === i ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                    }`}
                    onClick={() => selectOptionAndCleanUp(option)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <img
                      src={option.avatarUrl}
                      alt={displayName}
                      className="size-6 shrink-0 rounded-full object-cover"
                    />
                    <div className="flex-1 truncate font-medium">
                      {displayName}
                    </div>
                    <div className="text-xs font-normal text-gray-400">
                      @{user.username}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>,
          menuContainer.current
        );
      }}
    />
  );
}
