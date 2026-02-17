import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { surrogateToName } from '../../utils/emoji.utils';
import { cn } from '@/lib/utils';

const Emoji = ({ src, alt, isTwemoji, isReply }) => {
  // convertEmojiShortcodes uses the full ":name:" as alt — strip the colons
  const rawName = alt?.startsWith(':') && alt?.endsWith(':') ? alt.slice(1, -1) : (alt ?? '');

  // convertUnicodeEmojis uses the raw unicode char as alt — look up the canonical name
  const name = isTwemoji ? (surrogateToName.get(rawName) ?? rawName) : rawName;

  const shortcode = `:${name}:`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img
          src={src}
          alt={name}
          className={cn(
            'inline object-contain align-text-bottom',
            isReply ? 'h-4 w-4' : isTwemoji ? 'h-6 w-6' : 'h-8 w-8'
          )}
          loading="lazy"
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="flex items-center gap-2 rounded-md bg-[#111214] px-3 py-2 shadow-lg"
      >
        <img src={src} alt={name} className="size-8 object-contain" />
        <span className="text-sm font-medium text-white">{shortcode}</span>
      </TooltipContent>
    </Tooltip>
  );
};

export default Emoji;
