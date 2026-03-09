import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DMRowBase = ({
  isActive = false,
  isUnread = false,
  onClick,
  onClose,
  children,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'dm-row group relative flex min-h-[40px] w-full items-center gap-3 rounded px-2 text-sm transition-all',
        isActive
          ? 'bg-[#1c1c1e] text-[#fbfbfb] active:bg-[#2c2c30]'
          : isUnread
            ? 'bg-[#121214] text-[#fbfbfb] hover:bg-[#1c1c1e] active:bg-[#2c2c30]'
            : 'bg-[#121214] text-[#96979e] hover:bg-[#1c1c1e] hover:text-[#fbfbfb] active:bg-[#2c2c30] active:text-[#fbfbfb]',
        className
      )}
      style={{ '--dm-row-icon': isActive ? '#fbfbfb' : '#96979e' }}
    >
      {!isActive && isUnread && (
        <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all group-hover:h-4" />
      )}

      <div className="contents [&_svg]:text-[var(--dm-row-icon)] group-active:[&_svg]:text-[#fbfbfb]">
        {children}
      </div>

      {onClose && (
        <div
          className="ml-auto flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          role="button"
          tabIndex={-1}
        >
          <X className="size-4 text-[#96979e] hover:text-[#fbfbfb]" />
        </div>
      )}
    </button>
  );
};

export default DMRowBase;
