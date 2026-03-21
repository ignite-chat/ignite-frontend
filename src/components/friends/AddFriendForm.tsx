import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Compass } from 'lucide-react';
import { DiscordLogo } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FriendsService } from '@/ignite/services/friends.service';
import { DiscordApiService } from '@/discord/services/discord-api.service';
import { useDiscordStore } from '@/discord/store/discord.store';

const AddFriendForm = () => {
  const [friendUsername, setFriendUsername] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const hasIgniteToken = !!localStorage.getItem('token');
  const discordConnected = useDiscordStore((s) => s.isConnected);

  const sendIgniteRequest = useCallback(
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
    [friendUsername],
  );

  const sendDiscordRequest = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      DiscordApiService.sendFriendRequestByUsername(discordUsername.trim())
        .then(() => {
          toast.success(`Friend request sent to ${discordUsername}`);
          setDiscordUsername('');
        })
        .catch((error: AxiosError) => {
          const data = (error?.response?.data as any);
          if (error?.response?.status === 404) {
            toast.error("Hm, didn't work. Double check that the username is correct.");
          } else if (data?.message) {
            toast.error(data.message);
          } else {
            toast.error('Failed to send friend request');
          }
        });
    },
    [discordUsername],
  );

  return (
    <div className="w-full">
      {hasIgniteToken && (
        <div className="border-b border-white/5 pb-5">
          <h2 className="mb-2 text-lg font-semibold text-white">Add Friend</h2>
          <p className="mb-4 text-xs text-gray-300">You can add a friend with their Ignite username.</p>
          <form
            onSubmit={sendIgniteRequest}
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
      )}

      {discordConnected && (
        <div className={hasIgniteToken ? 'mt-5 border-b border-white/5 pb-5' : 'border-b border-white/5 pb-5'}>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
            <DiscordLogo size={20} weight="fill" className="text-[#5865f2]" />
            Add Discord Friend
          </h2>
          <p className="mb-4 text-xs text-gray-300">
            You can add a friend with their Discord username.
          </p>
          <form
            onSubmit={sendDiscordRequest}
            className="relative flex items-center rounded-lg border border-black/10 bg-[#1e1f22] p-2 ring-1 ring-transparent focus-within:border-[#5865f2] focus-within:ring-[#5865f2]"
          >
            <Input
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              className="h-10 border-0 bg-transparent text-sm text-white shadow-none placeholder:text-gray-500 focus-visible:ring-0"
              placeholder="You can add friends with their Discord username"
            />
            <Button
              type="submit"
              disabled={!discordUsername.trim()}
              className="ml-2 h-8 bg-[#5865f2] px-4 text-xs font-medium transition-colors hover:bg-[#4752c4] disabled:opacity-50"
            >
              Send Friend Request
            </Button>
          </form>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase text-gray-400">
          Other places to make friends
        </h3>
        <p className="mb-4 text-[13px] leading-relaxed text-gray-400">
          Don't have a username on hand? Check out our list of public servers that includes everything
          from gaming to cooking, music, anime and more.
        </p>
        <Button
          variant="ghost"
          className="flex items-center gap-3 rounded-lg bg-[#1e1f22] px-4 py-6 text-sm font-medium text-gray-200 hover:bg-[#2b2d31]"
        >
          <Compass size={20} className="text-gray-400" />
          Explore Public Servers
        </Button>
      </div>
    </div>
  );
};

export default AddFriendForm;
