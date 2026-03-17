import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import ChannelMention from '@/ignite/components/message/markdown/ChannelMention';

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
    span.className = 'inline select-none';
    return span;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <ChannelMention channelId={this.__channelId} />;
  }

  isInline() {
    return true;
  }

  isKeyboardSelectable() {
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

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
