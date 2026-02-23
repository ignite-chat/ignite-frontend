import { toast } from 'sonner';
import { useFriendsStore } from '../store/friends.store';
import api from '../api.js';

export const FriendsService = {
  async loadFriends() {
    const { setFriends } = useFriendsStore.getState();
    try {
      const { data } = await api.get('@me/friends');
      setFriends(data);
    } catch {
      toast.error('Unable to load friends.');
    }
  },

  async loadRequests() {
    const { setRequests } = useFriendsStore.getState();
    try {
      const { data } = await api.get('@me/friends/requests');
      setRequests(data);
    } catch {
      console.error('Unable to load friend requests.');
    }
  },

  /**
   * Send a friend request to a user by username and sync local store.
   *
   * @param username The username of the user to send a friend request to.
   * @returns void
   */
  async sendRequest(username: string) {
    // if (!username.trim()) {
    //   toast.error('Enter a username.');
    //   return;
    // }

    // try {
    //   await api.post('@me/friends/requests', null, {
    //     params: { username },
    //   });
    //   toast.success('Friend request sent.');
    //   await this.loadRequests();
    // } catch {
    //   toast.error('Unable to send friend request.');
    // }
    const { requests, setRequests } = useFriendsStore.getState();

    const { data } = await api.post('@me/friends/requests', { username });

    // Optimistically update requests list
    setRequests([...requests, data]);

    console.log('Sent friend request to:', username);
  },

  /**
   * Accept a friend request by ID and sync local store.
   *
   * @param id The ID of the friend request to accept.
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
   *
   * @param id The ID of the friend request to cancel.
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
   *
   * @param id The ID of the friend to delete.
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
