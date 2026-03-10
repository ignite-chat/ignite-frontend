import { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSidebarWidthStore } from '@/store/sidebar-width.store';

const ResizableSidebar = ({
  id,
  children,
  defaultWidth = 320,
  minWidth = 190,
  maxWidth = 360,
  className,
}) => {
  const width = useSidebarWidthStore((s) => s.widths[id] ?? defaultWidth);
  const setWidth = useSidebarWidthStore((s) => s.setWidth);
  const isResizing = useRef(false);
  const sidebarRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - rect.left));
      setWidth(id, newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [id, minWidth, maxWidth, setWidth]);

  return (
    <div
      ref={sidebarRef}
      className={cn('relative flex shrink-0', className)}
      style={{ width }}
    >
      {children}
      <div
        className="absolute right-0 top-0 z-10 h-full w-1 cursor-ew-resize hover:bg-white/10 active:bg-white/20"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default ResizableSidebar;
