import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import MentionText from '@/ignite/components/message/markdown/MentionText';

export class MentionNode extends DecoratorNode {
  __userId;
  __displayName;
  __color;

  static getType() {
    return 'mention';
  }

  static clone(node) {
    return new MentionNode(node.__userId, node.__displayName, node.__color, node.__key);
  }

  constructor(userId, displayName, color, key) {
    super(key);
    this.__userId = userId;
    this.__displayName = displayName;
    this.__color = color || 'inherit';
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'mention',
      userId: this.__userId,
      displayName: this.__displayName,
      color: this.__color,
    };
  }

  static importJSON(json) {
    return $createMentionNode(json.userId, json.displayName, json.color);
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
    return <MentionText userId={this.__userId} />;
  }

  isInline() {
    return true;
  }

  isKeyboardSelectable() {
    return true;
  }

  getTextContent() {
    return this.__displayName;
  }

  getUserId() {
    return this.__userId;
  }
}

export function $createMentionNode(userId, displayName, color) {
  return $applyNodeReplacement(new MentionNode(userId, displayName, color));
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
