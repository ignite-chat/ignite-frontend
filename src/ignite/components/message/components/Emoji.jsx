import { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { surrogateToName } from '@/utils/emoji.utils';
import { useEmojisStore } from '@/ignite/store/emojis.store';
import { useGuildsStore } from '@/ignite/store/guilds.store';
import { cn } from '@/lib/utils';

const Emoji = ({ src, alt, emojiId, isTwemoji, isReply }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // convertEmojiShortcodes uses the full ":name:" as alt — strip the colons
  const rawName = alt?.startsWith(':') && alt?.endsWith(':') ? alt.slice(1, -1) : (alt ?? '');

  // convertUnicodeEmojis uses the raw unicode char as alt — look up the canonical name
  const name = isTwemoji ? (surrogateToName.get(rawName) ?? rawName) : rawName;

  const shortcode = `:${name}:`;

  const guildEmojis = useEmojisStore((s) => s.guildEmojis);
  const guilds = useGuildsStore((s) => s.guilds);

  const guild = useMemo(() => {
    if (isTwemoji || !emojiId) return null;
    for (const [guildId, emojis] of Object.entries(guildEmojis)) {
      if (emojis.some((e) => e.id === emojiId)) {
        return guilds.find((g) => g.id === guildId) || null;
      }
    }
    return null;
  }, [isTwemoji, emojiId, guildEmojis, guilds]);

  const guildIcon = guild?.icon_file_id
    ? `${import.meta.env.VITE_CDN_BASE_URL}/icons/${guild.icon_file_id}`
    : null;

  // In reply mode, just render inline with no interactions
  if (isReply) {
    return (
      <img
        src={src}
        alt={name}
        className="inline h-4 w-4 object-contain align-text-bottom"
      />
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="inline cursor-pointer align-text-bottom"
              onClick={() => setPopoverOpen(true)}
            >
              <img
                src={src}
                alt={name}
                className={cn(
                  'inline object-contain align-text-bottom',
                  isTwemoji ? 'h-6 w-6' : 'h-8 w-8'
                )}
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!popoverOpen && (
          <TooltipContent
            side="top"
            className="flex items-center gap-2 rounded-md bg-[#111214] px-3 py-2 shadow-lg"
          >
            <img src={src} alt={name} className="size-8 object-contain" />
            <span className="text-sm font-medium text-white">{shortcode}</span>
          </TooltipContent>
        )}
      </Tooltip>

      <PopoverContent
        side="top"
        align="start"
        className="max-w-72 w-auto rounded-lg border-none bg-[#2b2d31] p-4 shadow-xl"
      >
        <div className="flex items-center gap-4">
          <img
            src={src}
            alt={name}
            className="size-12 shrink-0 object-contain"
          />
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-white">{shortcode}</span>
            {isTwemoji ? (
              <span className="text-sm text-[#949ba4]">
                A default emoji. You can use this emoji everywhere on Ignite
              </span>
            ) : null}
          </div>
        </div>
        {!isTwemoji && guild && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <span className="text-xs font-medium uppercase text-[#949ba4]">This emoji is from</span>
            <div className="mt-2 flex items-center gap-2">
              {guildIcon ? (
                <img src={guildIcon} className="size-8 shrink-0 rounded-full" alt="" />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
                  {guild.name?.charAt(0)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{guild.name}</span>
                <span className="text-xs text-[#949ba4]">
                  {guild.is_discoverable ? 'Public server' : 'Invite only'}
                </span>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default Emoji;
