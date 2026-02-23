import { DecoratorNode, $applyNodeReplacement } from 'lexical';

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
    if (this.__color !== 'inherit') {
      span.className = 'inline-flex rounded px-1 py-0.5 mx-[1px] select-none font-medium';
      span.style.backgroundColor = `${this.__color}33`;
      span.style.color = this.__color;
    } else {
      span.className =
        'inline-flex rounded bg-blue-500/20 text-blue-400 px-1 py-0.5 mx-[1px] select-none font-medium';
    }
    return span;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <span>{this.__displayName}</span>;
  }

  isInline() {
    return true;
  }

  isIsolated() {
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
