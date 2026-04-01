import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import { useDiscordChannelsStore } from '../../../store/discord-channels.store';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { Hash, Megaphone, SpeakerHigh } from '@phosphor-icons/react';

/**
 * Inline decorator component rendered inside the editor for #channel mentions.
 */
const DiscordChannelMentionDisplay = ({ channelId }) => {
  const channel = useDiscordChannelsStore((s) => s.channels.find((c) => c.id === channelId));
  const name = channel?.name || 'unknown';
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    if (!channel?.guild_id) return;
    navigate(`/discord/${channel.guild_id}/${channelId}`);
  }, [channel, channelId, navigate]);

  const type = channel?.type;
  const Icon = type === 2 ? SpeakerHigh : type === 5 ? Megaphone : Hash;
  const iconWeight = type === 5 ? 'fill' : 'bold';

  return (
    <span
      className="inline-flex cursor-pointer items-center gap-0.5 rounded bg-blue-500/20 px-1 font-medium text-blue-400 hover:bg-blue-500/30"
      onClick={handleClick}
      role="button"
      tabIndex={-1}
    >
      <Icon className="size-3.5" weight={iconWeight} />
      {name}
    </span>
  );
};

export class DiscordChannelMentionNode extends DecoratorNode {
  __channelId;
  __channelName;

  static getType() {
    return 'discord-channel-mention';
  }

  static clone(node) {
    return new DiscordChannelMentionNode(node.__channelId, node.__channelName, node.__key);
  }

  constructor(channelId, channelName, key) {
    super(key);
    this.__channelId = channelId;
    this.__channelName = channelName;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'discord-channel-mention',
      channelId: this.__channelId,
      channelName: this.__channelName,
    };
  }

  static importJSON(json) {
    return $createDiscordChannelMentionNode(json.channelId, json.channelName);
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
    return <DiscordChannelMentionDisplay channelId={this.__channelId} />;
  }

  isInline() {
    return true;
  }

  isKeyboardSelectable() {
    return true;
  }

  getTextContent() {
    return `<#${this.__channelId}>`;
  }

  getChannelId() {
    return this.__channelId;
  }
}

export function $createDiscordChannelMentionNode(channelId, channelName) {
  return $applyNodeReplacement(new DiscordChannelMentionNode(channelId, channelName));
}

export function $isDiscordChannelMentionNode(node) {
  return node instanceof DiscordChannelMentionNode;
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
