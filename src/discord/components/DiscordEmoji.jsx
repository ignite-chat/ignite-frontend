import { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { cn } from '@/lib/utils';

const DiscordEmoji = ({ src, name, emojiId, animated, isUnicode, isReply }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const shortcode = `:${name}:`;

  const guilds = useDiscordGuildsStore((s) => s.guilds);

  const guild = useMemo(() => {
    if (isUnicode || !emojiId) return null;
    for (const g of guilds) {
      const emojis = g.emojis || g.properties?.emojis || [];
      if (emojis.some((e) => e.id === emojiId)) {
        return g;
      }
    }
    return null;
  }, [isUnicode, emojiId, guilds]);

  const guildIcon = useMemo(() => {
    if (!guild) return null;
    const icon = guild.icon || guild.properties?.icon;
    const id = guild.id || guild.properties?.id;
    if (!icon || !id) return null;
    return `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=32`;
  }, [guild]);

  const guildName = guild?.name || guild?.properties?.name;

  if (isReply) {
    return (
      <img
        src={src}
        alt={name}
        className="inline size-4 object-contain align-text-bottom"
        draggable="false"
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
                  isUnicode ? 'size-5' : 'size-6'
                )}
                draggable="false"
                loading="lazy"
                decoding="async"
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
            {isUnicode && (
              <span className="text-sm text-[#949ba4]">
                A default emoji. You can use this emoji everywhere on Discord
              </span>
            )}
          </div>
        </div>
        {!isUnicode && guild && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <span className="text-xs font-medium uppercase text-[#949ba4]">This emoji is from</span>
            <div className="mt-2 flex items-center gap-2">
              {guildIcon ? (
                <img src={guildIcon} className="size-8 shrink-0 rounded-full" alt="" />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
                  {guildName?.charAt(0)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{guildName}</span>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DiscordEmoji;
