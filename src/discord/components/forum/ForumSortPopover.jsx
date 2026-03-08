import { SlidersHorizontal, Check, CaretDown } from '@phosphor-icons/react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const MENU_ITEM = 'flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5';
const SECTION_LABEL = 'px-2 py-1 text-[11px] font-bold uppercase text-gray-500';
const DIVIDER = 'my-1 h-px bg-white/5';

const CheckMark = ({ visible }) =>
  visible ? <Check size={14} weight="bold" className="text-primary" /> : null;

const ForumSortPopover = ({ sortBy, setSortBy, viewAs, setViewAs, tagMatch, setTagMatch, onReset }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="flex shrink-0 items-center gap-1 rounded-md bg-[#2b2d31] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-[#32353b] hover:text-white"
      >
        <SlidersHorizontal className="size-3.5" />
        Sort &amp; View
        <CaretDown className="size-3 text-gray-400" />
      </button>
    </PopoverTrigger>
    <PopoverContent side="bottom" align="start" className="w-56 border-white/10 bg-[#111214] p-2">
      <div className="flex flex-col gap-1">
        <span className={SECTION_LABEL}>Sort by</span>
        <button type="button" onClick={() => setSortBy('recent_activity')} className={MENU_ITEM}>
          Recently Active
          <CheckMark visible={sortBy === 'recent_activity'} />
        </button>
        <button type="button" onClick={() => setSortBy('date_posted')} className={MENU_ITEM}>
          Date Posted
          <CheckMark visible={sortBy === 'date_posted'} />
        </button>

        <div className={DIVIDER} />
        <span className={SECTION_LABEL}>View as</span>
        <button type="button" onClick={() => setViewAs('list')} className={MENU_ITEM}>
          List
          <CheckMark visible={viewAs === 'list'} />
        </button>
        <button type="button" onClick={() => setViewAs('gallery')} className={MENU_ITEM}>
          Gallery
          <CheckMark visible={viewAs === 'gallery'} />
        </button>

        <div className={DIVIDER} />
        <span className={SECTION_LABEL}>Tag Matching</span>
        <button type="button" onClick={() => setTagMatch('some')} className={MENU_ITEM}>
          Match Some
          <CheckMark visible={tagMatch === 'some'} />
        </button>
        <button type="button" onClick={() => setTagMatch('all')} className={MENU_ITEM}>
          Match All
          <CheckMark visible={tagMatch === 'all'} />
        </button>

        <div className={DIVIDER} />
        <button type="button" onClick={onReset} className="rounded px-2 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
          Reset to Default
        </button>
      </div>
    </PopoverContent>
  </Popover>
);

export default ForumSortPopover;
