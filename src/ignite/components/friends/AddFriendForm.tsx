import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FriendsService } from '@/ignite/services/friends.service';

const AddFriendForm = () => {
  const [friendUsername, setFriendUsername] = useState('');

  const sendFriendRequest = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      FriendsService.sendRequest(friendUsername)
        .then(() => {
          toast.success(`Friend request sent to ${friendUsername}`);
          setFriendUsername('');
        })
        .catch((error: AxiosError) => {
          if (error?.response?.status === 404) {
            toast.error('User not found');
          } else {
            toast.error('Failed to send friend request');
          }
        });
    },
    [friendUsername]
  );

  return (
    <div className="w-full border-b border-white/5 pb-5">
      <h2 className="mb-2 text-lg font-semibold text-white">Add Friend</h2>
      <p className="mb-4 text-xs text-gray-300">You can add a friend with their Ignite username.</p>
      <form
        onSubmit={sendFriendRequest}
        className="relative flex items-center rounded-lg border border-black/10 bg-[#1e1f22] p-2 ring-1 ring-transparent focus-within:border-[#00a8fc] focus-within:ring-[#00a8fc]"
      >
        <Input
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          className="h-10 border-0 bg-transparent text-sm text-white shadow-none placeholder:text-gray-500 focus-visible:ring-0"
          placeholder="You can add friends with their Ignite username"
        />
        <Button
          type="submit"
          disabled={!friendUsername}
          className="ml-2 h-8 bg-[#5865f2] px-4 text-xs font-medium transition-colors hover:bg-[#4752c4] disabled:opacity-50"
        >
          Send Friend Request
        </Button>
      </form>
    </div>
  );
};

export default AddFriendForm;
