import { useState, useContext } from 'react';
import Dialog from './Dialog';
import Avatar from './Avatar';
import { Calendar, Hash, Info, UserCircle, PencilSimple, Plus, Tag, Clock, ListChecks, Users, UserPlus, ChatTeardropText, DotsThree, Notepad, Check, Prohibit, UserMinus, Copy } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import useStore from '../hooks/useStore';
import { useFriendsStore } from '../store/friends.store';
import { FriendsService } from '../services/friends.service';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { GuildContext } from '../contexts/GuildContext';
import { useGuildsStore } from '../store/guilds.store';

/**
 * UserProfileModal - A high-fidelity, Discord-inspired profile modal.
 */
const UserProfileModal = ({ user, isOpen, setIsOpen }) => {
    const store = useStore();
    const { friends, requests } = useFriendsStore();
    const guildContext = useContext(GuildContext);
    const guildsStore = useGuildsStore();
    const [note, setNote] = useState('');
    const [isSending, setIsSending] = useState(false);

    const isOwner = store.user?.id === user?.id;

    const isFriend = friends.some(f => f.id === user?.id);
    const pendingRequest = requests.find(req =>
        (req.sender_id === store.user?.id && (req.receiver_id === user?.id || req.receiver?.username === user?.username)) ||
        (req.receiver_id === store.user?.id && (req.sender_id === user?.id || req.sender?.username === user?.username))
    );

    const isOutgoing = pendingRequest && pendingRequest.sender_id === store.user?.id;
    const isIncoming = pendingRequest && pendingRequest.receiver_id === store.user?.id;

    const guildId = guildContext?.guildId;
    const member = guildId ? (guildsStore.guildMembers[guildId] || []).find(m => m.user_id === user?.id) : null;
    const roles = member?.roles || user?.roles || [];
    const sortedRoles = [...roles].sort((a, b) => (b.position || 0) - (a.position || 0));

    if (!user) return null;

    const handleAddFriend = async () => {
        if (isSending || isFriend || pendingRequest) return;

        setIsSending(true);
        try {
            await FriendsService.sendRequest(user.username);
            toast.success(`Friend request sent to ${user.username}`);
        } catch (error) {
            toast.error('Failed to send friend request');
        } finally {
            setIsSending(false);
        }
    };

    const handleRemoveFriend = async () => {
        try {
            if (isFriend) {
                await FriendsService.deleteFriend(user.id);
                toast.success(`Removed ${user.username} from friends`);
            } else if (pendingRequest) {
                await FriendsService.cancelRequest(pendingRequest.id);
                toast.success(`Cancelled friend request to ${user.username}`);
            }
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(user.id);
        toast.success('Copied User ID');
    };

    const handleBlock = () => {
        toast.info('Block feature coming soon!');
    };

    const getRoleColor = (color) => {
        if (!color || color === 0) return '#5865f2';
        return typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
    };

    return (
        <Dialog
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            outsideChildren=""
            transparent
            noPadding
        >
            <div className="overflow-hidden rounded-xl bg-[#111214] shadow-2xl border border-white/5">
                <div
                    className="h-[105px] w-full bg-primary"
                    style={{
                        backgroundColor: user.banner_color || '#5865F2',
                        backgroundImage: user.banner_url ? `url(${user.banner_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                />

                <div className="relative px-4 pb-0">
                    <div className="absolute -top-[45px] left-4">
                        <div className="rounded-full border-[7px] border-[#111214] bg-[#111214]">
                            <Avatar user={user} className="size-[80px] !cursor-default text-3xl" />
                        </div>
                        <div className="absolute bottom-1 right-1 size-5 rounded-full border-[4px] border-[#111214] bg-[#23a559]" />
                    </div>

                    <div className="flex h-[38px] items-center justify-end gap-1 px-1 pt-2" />

                    <div className="mt-1 space-y-4 rounded-lg bg-[#18191c] p-4 mb-4 shadow-sm">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-white">
                                {user.username}
                            </h2>
                            <div className="text-xs font-semibold text-gray-300">
                                {user.username}
                            </div>
                        </div>

                        {!isOwner && (
                            <div className="flex items-center gap-2 pt-1">
                                {isFriend ? (
                                    <button disabled className="flex h-8 grow items-center justify-center gap-2 rounded bg-[#23a559]/20 px-4 text-sm font-bold text-[#23a559] cursor-default">
                                        <Check size={16} weight="bold" />
                                        Friends
                                    </button>
                                ) : isOutgoing ? (
                                    <button disabled className="flex h-8 grow items-center justify-center gap-2 rounded bg-[#35373c] px-4 text-sm font-bold text-gray-400 cursor-default">
                                        Friend Request Pending
                                    </button>
                                ) : isIncoming ? (
                                    <button
                                        onClick={() => FriendsService.acceptRequest(pendingRequest.id)}
                                        className="flex h-8 grow items-center justify-center gap-2 rounded bg-[#23a559] px-4 text-sm font-bold text-white transition hover:bg-[#1a7a42]"
                                    >
                                        Accept Request
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAddFriend}
                                        disabled={isSending}
                                        className="flex h-8 grow items-center justify-center gap-2 rounded bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                                    >
                                        <UserPlus size={16} weight="bold" />
                                        {isSending ? 'Sending...' : 'Add Friend'}
                                    </button>
                                )}

                                <button title="Message" className="flex size-8 items-center justify-center rounded bg-[#35373c] text-white transition hover:bg-[#4e5058]">
                                    <ChatTeardropText size={18} weight="fill" />
                                </button>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button title="More" className="flex size-8 items-center justify-center rounded bg-[#35373c] text-white transition hover:bg-[#4e5058]">
                                            <DotsThree size={20} weight="bold" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-48 bg-[#111214] border-white/5 p-1 shadow-xl rounded-md">
                                        <div className="flex flex-col gap-0.5">
                                            {(isFriend || pendingRequest) && (
                                                <button
                                                    onClick={handleRemoveFriend}
                                                    className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-red-400 rounded hover:bg-red-500/10 transition-colors"
                                                >
                                                    {isFriend ? 'Remove Friend' : 'Cancel Request'}
                                                    <UserMinus size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={handleBlock}
                                                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-red-500 rounded hover:bg-red-500/10 transition-colors"
                                            >
                                                Block
                                                <Prohibit size={14} />
                                            </button>
                                            <div className="h-px bg-white/5 my-0.5" />
                                            <button
                                                onClick={handleCopyId}
                                                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-gray-300 rounded hover:bg-white/5 transition-colors"
                                            >
                                                Copy User ID
                                                <UserCircle size={14} />
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Description
                            </h3>
                            <p className="text-sm text-gray-200 leading-normal">
                                {user.bio || "No description provided."}
                            </p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Ignite Member Since
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-200">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Feb 8, 2026'}
                            </div>
                        </div>

                        {sortedRoles.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Roles
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {sortedRoles.map(role => (
                                        <span key={role.id} className="flex items-center gap-1.5 rounded bg-[#2b2d31] px-2 py-1 text-[11px] font-bold text-gray-200 group relative">
                                            <div
                                                className="size-3 rounded-full"
                                                style={{ backgroundColor: getRoleColor(role.color) }}
                                            />
                                            {role.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    Note <span className="text-[9px] font-medium lowercase">(only visible to you)</span>
                                </h3>
                            </div>
                            <div className="relative group">
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Click to add a note"
                                    className="w-full bg-transparent p-1 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none resize-none min-h-[40px] hover:bg-white/5 rounded transition-colors"
                                    rows={2}
                                />
                                <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-30 pointer-events-none">
                                    <Notepad size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

export default UserProfileModal;
