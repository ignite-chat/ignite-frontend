import { create } from 'zustand';
import type { User } from './users.store';

export type Friend = User & {
  status?: string;
};

export type FriendRequest = {
  id: string;
  sender_id?: string;
  sender?: User;
  receiver?: User;
  user?: User;
  status?: string;
  created_at?: string;
};

type FriendsStore = {
  friends: Friend[];
  requests: FriendRequest[];

  setFriends: (friends: Friend[]) => void;
  setRequests: (requests: FriendRequest[]) => void;
  reset: () => void;
};

export const useFriendsStore = create<FriendsStore>((set) => ({
  friends: [],
  requests: [],

  setFriends: (friends) => set({ friends }),
  setRequests: (requests) => set({ requests }),

  reset: () => set({ friends: [], requests: [] }),
}));
