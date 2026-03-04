import { create } from 'zustand';

let modalId = 0;

type Modal = {
  id: number;
  component: React.ComponentType<any>;
  props: Record<string, any>;
};

type ModalStore = {
  modals: Modal[];
  push: (component: React.ComponentType<any>, props?: Record<string, any>) => number;
  close: (id: number) => void;
  clear: () => void;
};

export const useModalStore = create<ModalStore>((set) => ({
  modals: [],
  push: (component, props = {}) => {
    const id = ++modalId;
    set((state) => ({
      modals: [...state.modals, { id, component, props }],
    }));
    return id;
  },
  close: (id) =>
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    })),
  clear: () => set({ modals: [] }),
}));

export const ModalRoot = () => {
  const modals = useModalStore((s) => s.modals);
  return modals.map(({ id, component: Component, props }) => (
    <Component key={id} modalId={id} {...props} />
  ));
};
