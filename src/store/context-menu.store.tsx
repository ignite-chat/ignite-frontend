import { create } from 'zustand';
import { createElement, useEffect, useRef } from 'react';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';

let menuId = 0;

type ContextMenuEntry = {
  id: number;
  component: React.ComponentType<any>;
  props: Record<string, any>;
  position: { x: number; y: number };
};

type ContextMenuStore = {
  menu: ContextMenuEntry | null;
  open: (
    component: React.ComponentType<any>,
    props: Record<string, any>,
    event: React.MouseEvent | MouseEvent
  ) => void;
  close: (id?: number) => void;
};

export const useContextMenuStore = create<ContextMenuStore>((set) => ({
  menu: null,
  open: (component, props, event) => {
    event.preventDefault();
    set({
      menu: {
        id: ++menuId,
        component,
        props,
        position: { x: event.clientX, y: event.clientY },
      },
    });
  },
  close: (id) =>
    set((state) => {
      if (id != null && state.menu?.id !== id) return state;
      return { menu: null };
    }),
}));

const ContextMenuInstance = ({
  menu,
  onClose,
}: {
  menu: ContextMenuEntry;
  onClose: () => void;
}) => {
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (triggerRef.current) {
      const evt = new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: menu.position.x,
        clientY: menu.position.y,
      });
      triggerRef.current.dispatchEvent(evt);
    }
  }, []);

  return (
    <ContextMenu onOpenChange={(open) => { if (!open) onClose(); }}>
      <ContextMenuTrigger asChild>
        <span
          ref={triggerRef}
          style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none' }}
        />
      </ContextMenuTrigger>
      {createElement(menu.component, menu.props)}
    </ContextMenu>
  );
};

export const ContextMenuRoot = () => {
  const menu = useContextMenuStore((s) => s.menu);
  const close = useContextMenuStore((s) => s.close);

  if (!menu) return null;

  return (
    <ContextMenuInstance
      key={menu.id}
      menu={menu}
      onClose={() => close(menu.id)}
    />
  );
};
