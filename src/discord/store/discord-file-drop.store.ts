import { create } from 'zustand';

type DiscordFileDropStore = {
  isDragOver: boolean;
  droppedFiles: File[];

  setDragOver: (v: boolean) => void;
  addDroppedFiles: (files: File[]) => void;
  clearDroppedFiles: () => void;
};

export const useDiscordFileDropStore = create<DiscordFileDropStore>((set) => ({
  isDragOver: false,
  droppedFiles: [],

  setDragOver: (v) => set({ isDragOver: v }),
  addDroppedFiles: (files) => set({ droppedFiles: files }),
  clearDroppedFiles: () => set({ droppedFiles: [] }),
}));
