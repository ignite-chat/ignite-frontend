import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FriendsService } from '@/services/friends.service';

const AddFriendForm = () => {
    const [friendUsername, setFriendUsername] = useState('');

    const sendFriendRequest = useCallback((e) => {
        e.preventDefault();
        FriendsService.sendRequest(friendUsername)
            .then(() => {
                toast.success(`Friend request sent to ${friendUsername}`);
                setFriendUsername('');
            })
            .catch((error) => {
                if (error?.response?.status === 404) {
                    toast.error('User not found');
                } else {
                    toast.error('Failed to send friend request');
                }
            });
    }, [friendUsername]);

    return (
        <div className="w-full border-b border-gray-700 pb-5">
            <h2 className="text-lg font-semibold text-white mb-2">Add Friend</h2>
            <p className="text-xs text-gray-300 mb-4">You can add a friend with their Ignite username.</p>
            <form onSubmit={sendFriendRequest} className="relative flex items-center bg-[#1e1f22] rounded-lg p-2 border border-black/10 focus-within:border-orange-500 ring-1 ring-transparent focus-within:ring-orange-500">
                <Input
                    value={friendUsername}
                    onChange={e => setFriendUsername(e.target.value)}
                    className="border-0 bg-transparent focus-visible:ring-0 text-sm h-10 shadow-none text-white placeholder:text-gray-500"
                    placeholder="You can add friends with their Ignite username"
                />
                <Button
                    type="submit"
                    disabled={!friendUsername}
                    className="bg-orange-500 hover:bg-orange-600 h-8 text-xs font-medium ml-2 px-4 transition-colors disabled:opacity-50"
                >
                    Send Friend Request
                </Button>
            </form>
        </div>
    );
};

export default AddFriendForm;