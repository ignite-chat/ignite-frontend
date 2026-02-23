import { create } from 'zustand';

type FriendsStore = {
  friends: any[];
  requests: any[];

  setFriends: (friends: any[]) => void;
  setRequests: (requests: any[]) => void;
  reset: () => void;
};

export const useFriendsStore = create<FriendsStore>((set) => ({
  friends: [],
  requests: [],

  setFriends: (friends) => set({ friends }),
  setRequests: (requests) => set({ requests }),

  reset: () => set({ friends: [], requests: [] }),
}));
