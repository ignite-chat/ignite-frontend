import { create } from 'zustand';

const STORAGE_KEY = 'sidebar-widths';

const loadWidths = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

type SidebarWidthStore = {
  widths: Record<string, number>;
  getWidth: (id: string, fallback: number) => number;
  setWidth: (id: string, width: number) => void;
};

export const useSidebarWidthStore = create<SidebarWidthStore>((set, get) => ({
  widths: loadWidths(),
  getWidth: (id, fallback) => get().widths[id] ?? fallback,
  setWidth: (id, width) =>
    set((state) => {
      const newWidths = { ...state.widths, [id]: width };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidths));
      return { widths: newWidths };
    }),
}));
