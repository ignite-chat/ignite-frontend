import { useState, useMemo } from 'react';
import { useStickersStore } from '../../store/stickers.store';
import { useGuildsStore } from '../../store/guilds.store';
import { SearchIcon } from 'lucide-react';

const StickerPicker = ({ onStickerSelect }) => {
  const guildsStore = useGuildsStore();
  const { guildStickers } = useStickersStore();
  const [search, setSearch] = useState('');
  const [hoveredSticker, setHoveredSticker] = useState(null);

  const stickerGroups = useMemo(() => {
    const searchLower = search.toLowerCase();
    return guildsStore.guilds
      .filter((g) => (guildStickers[g.id] || []).length > 0)
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon_file_id
          ? `${import.meta.env.VITE_CDN_BASE_URL}/icons/${g.icon_file_id}`
          : undefined,
        stickers: (guildStickers[g.id] || []).filter((s) =>
          searchLower ? s.name.toLowerCase().includes(searchLower) : true
        ),
      }))
      .filter((g) => g.stickers.length > 0);
  }, [guildsStore.guilds, guildStickers, search]);

  const isEmpty = stickerGroups.length === 0;

  return (
    <div className="flex h-[430px] w-[350px] flex-col overflow-hidden rounded-lg bg-[#2b2d31] shadow-2xl">
      {/* Search */}
      <div className="flex h-[48px] items-center gap-2 px-3">
        <div className="relative w-full">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
            <SearchIcon className="size-4" />
          </div>
          <input
            className="h-8 w-full rounded bg-[#1e1f22] pl-9 pr-2 text-[14px] text-gray-200 placeholder:text-[#949ba4] focus:outline-none"
            placeholder="Search Stickers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Sticker grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a1b1e] scrollbar-track-transparent hover:scrollbar-thumb-[#1a1b1e]/80">
        {isEmpty && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No stickers found.
          </div>
        )}

        {stickerGroups.map((guild) => (
          <div key={guild.id} className="pb-2">
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#2b2d31] px-3 pt-4 pb-2 text-[12px] font-semibold uppercase text-[#949ba4]">
              {guild.icon && (
                <img src={guild.icon} className="size-4 rounded-full" alt="" />
              )}
              {guild.name}
            </div>
            <div className="grid grid-cols-4 gap-1 px-2">
              {guild.stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  className="flex aspect-square items-center justify-center rounded-md p-1.5 transition-colors hover:bg-[#35373c]"
                  onClick={() => onStickerSelect(sticker)}
                  onMouseEnter={() => setHoveredSticker(sticker)}
                  onMouseLeave={() => setHoveredSticker(null)}
                >
                  <img
                    src={`${import.meta.env.VITE_CDN_BASE_URL}/stickers/${sticker.id}`}
                    alt={sticker.name}
                    className="size-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex h-12 items-center border-t border-[#1e1f22] px-3">
        {hoveredSticker ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src={`${import.meta.env.VITE_CDN_BASE_URL}/stickers/${hoveredSticker.id}`}
              alt={hoveredSticker.name}
              className="size-8 object-contain"
            />
            <span className="truncate text-[14px] font-bold text-white">
              {hoveredSticker.name}
            </span>
          </div>
        ) : (
          <span className="text-[14px] font-bold text-[#949ba4]">Pick a sticker</span>
        )}
      </div>
    </div>
  );
};

export default StickerPicker;
