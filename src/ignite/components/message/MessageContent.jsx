import { useMemo } from 'react';
import { useGuildContext } from '../../contexts/GuildContext';
import { useEmojisStore } from '../../store/emojis.store';
import { parseMarkdown } from '@/components/message/markdown/parser';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import InviteEmbed from './components/InviteEmbed.jsx';
import Attachment from './components/Attachment';
import StickerItem from './components/StickerItem';

const INVITE_URL_REGEX = /https?:\/\/app\.ignite-chat\.com\/invite\/([a-zA-Z0-9]+)/g;
const MessageContent = ({ content, isReply = false, stickers = [], attachments = [], author, timestamp }) => {
  const { guildId } = useGuildContext();
  const { guildEmojis } = useEmojisStore();

  const ast = useMemo(
    () => parseMarkdown(content, { guildEmojis, currentGuildId: guildId }),
    [content, guildEmojis, guildId],
  );

  const inviteCodes = useMemo(() => {
    if (isReply) return [];
    const matches = [...content.matchAll(INVITE_URL_REGEX)];
    return [...new Set(matches.map((m) => m[1]))];
  }, [content, isReply]);

  return (
    <>
      <MarkdownRenderer nodes={ast} isReply={isReply} />
      {inviteCodes.map((code) => (
        <InviteEmbed key={code} code={code} />
      ))}
      {stickers.length > 0 && !isReply && (
        <div className="mt-1 flex gap-2 select-none">
          {stickers.map((sticker) => (
            <StickerItem key={sticker.id} sticker={sticker} />
          ))}
        </div>
      )}
      {attachments.length > 0 && !isReply && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {attachments.map((attachment) => (
            <Attachment key={attachment.id} attachment={attachment} author={author} timestamp={timestamp} />
          ))}
        </div>
      )}
    </>
  );
};

export default MessageContent;
