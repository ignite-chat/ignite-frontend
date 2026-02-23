import { DecoratorNode, $applyNodeReplacement } from 'lexical';

export class ChannelMentionNode extends DecoratorNode {
  __channelId;
  __channelName;

  static getType() {
    return 'channel-mention';
  }

  static clone(node) {
    return new ChannelMentionNode(node.__channelId, node.__channelName, node.__key);
  }

  constructor(channelId, channelName, key) {
    super(key);
    this.__channelId = channelId;
    this.__channelName = channelName;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'channel-mention',
      channelId: this.__channelId,
      channelName: this.__channelName,
    };
  }

  static importJSON(json) {
    return $createChannelMentionNode(json.channelId, json.channelName);
  }

  createDOM() {
    const span = document.createElement('span');
    span.className =
      'inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1 py-0.5 mx-[1px] text-blue-400 cursor-pointer select-none font-medium';
    return span;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <span>#{this.__channelName}</span>;
  }

  isInline() {
    return true;
  }

  isIsolated() {
    return true;
  }

  getTextContent() {
    return `#${this.__channelName}`;
  }

  getChannelId() {
    return this.__channelId;
  }
}

export function $createChannelMentionNode(channelId, channelName) {
  return $applyNodeReplacement(new ChannelMentionNode(channelId, channelName));
}

export function $isChannelMentionNode(node) {
  return node instanceof ChannelMentionNode;
}
