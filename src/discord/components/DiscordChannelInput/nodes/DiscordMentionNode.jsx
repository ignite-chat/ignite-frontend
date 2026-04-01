import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import { useDiscordUsersStore } from '../../../store/discord-users.store';
import { useModalStore } from '@/store/modal.store';
import { useCallback } from 'react';

/**
 * Inline decorator component rendered inside the editor for @user mentions.
 */
const DiscordMentionDisplay = ({ userId }) => {
  const user = useDiscordUsersStore((s) => s.users[userId]);
  const name = user?.global_name || user?.username || userId;

  const handleClick = useCallback(async () => {
    const { default: DiscordUserProfileModal } = await import('../../DiscordUserProfileModal');
    useModalStore.getState().push(DiscordUserProfileModal, { userId });
  }, [userId]);

  return (
    <span
      className="cursor-pointer rounded bg-blue-500/20 px-1 font-medium text-blue-400 hover:bg-blue-500/30"
      onClick={handleClick}
      role="button"
      tabIndex={-1}
    >
      @{name}
    </span>
  );
};

export class DiscordMentionNode extends DecoratorNode {
  __userId;
  __displayName;

  static getType() {
    return 'discord-mention';
  }

  static clone(node) {
    return new DiscordMentionNode(node.__userId, node.__displayName, node.__key);
  }

  constructor(userId, displayName, key) {
    super(key);
    this.__userId = userId;
    this.__displayName = displayName;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'discord-mention',
      userId: this.__userId,
      displayName: this.__displayName,
    };
  }

  static importJSON(json) {
    return $createDiscordMentionNode(json.userId, json.displayName);
  }

  createDOM() {
    const span = document.createElement('span');
    span.className = 'inline select-none';
    return span;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <DiscordMentionDisplay userId={this.__userId} />;
  }

  isInline() {
    return true;
  }

  isKeyboardSelectable() {
    return true;
  }

  getTextContent() {
    return `<@${this.__userId}>`;
  }

  getUserId() {
    return this.__userId;
  }
}

export function $createDiscordMentionNode(userId, displayName) {
  return $applyNodeReplacement(new DiscordMentionNode(userId, displayName));
}

export function $isDiscordMentionNode(node) {
  return node instanceof DiscordMentionNode;
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
