import { FriendsService } from '../services/friends.service';

export function handleFriendRequestCreated(): void {
  FriendsService.loadRequests();
}

export function handleFriendRequestDeleted(): void {
  FriendsService.loadRequests();
}

export function handleFriendRequestAccepted(): void {
  FriendsService.loadFriends();
  FriendsService.loadRequests();
}
