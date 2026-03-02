import { useState } from 'react';
import { Sticker as StickerIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGuildsStore } from '@/ignite/store/guilds.store';

const STICKER_CDN_PREFIX = `${import.meta.env.VITE_CDN_BASE_URL}/stickers/`;

const StickerItem = ({ sticker }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const guilds = useGuildsStore((s) => s.guilds);

  const guild = sticker.guild_id
    ? guilds.find((g) => g.id === sticker.guild_id)
    : null;

  const guildIcon = guild?.icon_file_id
    ? `${import.meta.env.VITE_CDN_BASE_URL}/icons/${guild.icon_file_id}`
    : null;

  const stickerUrl = `${STICKER_CDN_PREFIX}${sticker.id}`;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="cursor-pointer rounded-md transition-opacity hover:opacity-80"
              onClick={() => setPopoverOpen(true)}
            >
              <img
                src={stickerUrl}
                alt={sticker.name}
                className="size-40 object-contain"
                decoding="async"
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!popoverOpen && (
          <TooltipContent
            side="top"
            className="flex flex-col items-center gap-0.5 rounded-md bg-[#111214] px-3 py-2 shadow-lg"
          >
            <div className="flex items-center gap-1.5">
              <StickerIcon className="size-4 text-white" />
              <span className="text-sm font-medium text-white">{sticker.name}</span>
            </div>
            <span className="text-xs text-[#949ba4]">Click to learn more</span>
          </TooltipContent>
        )}
      </Tooltip>

      <PopoverContent
        side="top"
        align="start"
        className="w-auto rounded-lg border-none bg-[#2b2d31] p-4 shadow-xl"
      >
        <div className="flex items-center gap-4">
          <img
            src={stickerUrl}
            alt={sticker.name}
            className="size-28 object-contain"
          />
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-white">{sticker.name}</span>
            {guild && (
              <div className="flex items-center gap-1.5 text-sm text-[#949ba4]">
                {guildIcon ? (
                  <img src={guildIcon} className="size-4 rounded-full" alt="" />
                ) : (
                  <div className="flex size-4 items-center justify-center rounded-full bg-[#5865f2] text-[8px] font-bold text-white">
                    {guild.name?.charAt(0)}
                  </div>
                )}
                <span>{guild.name}</span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StickerItem;
