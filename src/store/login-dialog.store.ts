import { create } from 'zustand';

type LoginDialogStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useLoginDialogStore = create<LoginDialogStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
