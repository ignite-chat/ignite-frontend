import { useState, useMemo } from 'react';
import { Users, X, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { useFriendsStore } from '@/store/friends.store';
import { useUsersStore } from '@/store/users.store';
import AddFriendForm from './AddFriendForm';
import FriendsList from './FriendsList';
import PendingRequests from './PendingRequests';

type Tab = 'online' | 'all' | 'pending' | 'add_friend';

const FriendsDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const { friends, requests } = useFriendsStore();
  const currentUser = useUsersStore((s) => s.getCurrentUser());

  const pendingCount = requests.filter((req) => req.sender_id != currentUser?.id).length;

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.username.toLowerCase().includes(query) || friend.name?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e] select-none">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-white/5 px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold text-[#f2f3f5]">
            <Users size={20} className="text-[#80848e]" />
            Friends
          </div>
          <Separator orientation="vertical" className="h-6 bg-[#4e5058]" />
          <nav className="flex items-center gap-2">
            <TabButton id="online" label="Online" active={activeTab} onClick={setActiveTab} />
            <TabButton id="all" label="All" active={activeTab} onClick={setActiveTab} />
            <TabButton
              id="pending"
              label="Pending"
              active={activeTab}
              onClick={setActiveTab}
              count={pendingCount}
            />
            <Button
              variant={activeTab === 'add_friend' ? 'ghost' : 'default'}
              size="sm"
              className={`h-7 px-2 text-sm font-medium ${
                activeTab === 'add_friend'
                  ? 'text-[#23a559]'
                  : 'bg-[#248046] text-white hover:bg-[#1a6334]'
              }`}
              onClick={() => setActiveTab('add_friend')}
            >
              Add Friend
            </Button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        {activeTab === 'add_friend' && <AddFriendForm />}

        {(activeTab === 'online' || activeTab === 'all') && (
          <>
            <div className="mb-4">
              <InputGroup className="border-white/5 bg-[#17171a]">
                <InputGroupAddon>
                  <Search size={16} className="text-white" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-white placeholder:text-gray-500"
                />
                {searchQuery && (
                  <InputGroupAddon>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery('')}
                      className="h-6 w-6 text-gray-500 hover:bg-transparent hover:text-gray-300"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </Button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FriendsList friends={filteredFriends} filter={activeTab} />
            </div>
          </>
        )}

        {activeTab === 'pending' && currentUser && (
          <PendingRequests requests={requests} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

type TabButtonProps = {
  id: Tab;
  label: string;
  active: Tab;
  onClick: (id: Tab) => void;
  count?: number;
};

const TabButton = ({ id, label, active, onClick, count }: TabButtonProps) => (
  <Button
    variant={active === id ? 'secondary' : 'ghost'}
    size="sm"
    className="h-7 px-3 text-sm font-medium"
    onClick={() => onClick(id)}
  >
    {label}
    {count != null && count > 0 && (
      <Badge className="ml-2 h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
        {count}
      </Badge>
    )}
  </Button>
);

export default FriendsDashboard;
