import { toast } from 'sonner';
import { useFriendsStore } from '../store/friends.store';
import { useUsersStore } from '../store/users.store';
import api from '../api.js';
import type { Friend, FriendRequest } from '../store/friends.store';
import type { User } from '../store/users.store';

export const FriendsService = {
  async loadFriends() {
    const { setFriends } = useFriendsStore.getState();
    const { setUsers } = useUsersStore.getState();
    try {
      const { data } = await api.get<Friend[]>('@me/friends');
      setFriends(data);
      setUsers(data as User[]);
    } catch {
      toast.error('Unable to load friends.');
    }
  },

  async loadRequests() {
    const { setRequests } = useFriendsStore.getState();
    const { setUsers } = useUsersStore.getState();
    try {
      const { data } = await api.get<FriendRequest[]>('@me/friends/requests');
      setRequests(data);
      const users = data.flatMap((req) =>
        [req.sender, req.receiver, req.user].filter((u): u is User => !!u)
      );
      setUsers(users);
    } catch {
      console.error('Unable to load friend requests.');
    }
  },

  /**
   * Send a friend request to a user by username and sync local store.
   */
  async sendRequest(username: string) {
    const { requests, setRequests } = useFriendsStore.getState();

    const { data } = await api.post<FriendRequest>('@me/friends/requests', { username });

    // Optimistically update requests list
    setRequests([...requests, data]);

    console.log('Sent friend request to:', username);
  },

  /**
   * Accept a friend request by ID and sync local store.
   */
  async acceptRequest(id: string) {
    try {
      await api.post(`@me/friends/requests/${id}/accept`);
      await Promise.all([this.loadFriends(), this.loadRequests()]);
    } catch {
      console.error('Unable to accept friend request.');
    }
  },

  /**
   * Cancel a friend request by ID and sync local store.
   */
  async cancelRequest(id: string) {
    try {
      await api.delete(`@me/friends/requests/${id}`);
      await this.loadRequests();
    } catch {
      toast.error('Unable to cancel friend request.');
    }
  },

  /**
   * Delete a friend by ID and sync local store.
   */
  async deleteFriend(id: string) {
    try {
      await api.delete(`@me/friends/${id}`);
      await this.loadFriends();
    } catch {
      console.error('Unable to delete friend.');
    }
  },
};
