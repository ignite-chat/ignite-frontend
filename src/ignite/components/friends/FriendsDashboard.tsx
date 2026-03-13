import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { useDiscordRelationshipsStore, RelationshipType } from '@/discord/store/discord-relationships.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import AddFriendForm from './AddFriendForm';
import FriendsList from './FriendsList';
import PendingRequests from './PendingRequests';
import DiscordActivitiesPanel from '@/discord/components/DiscordActivitiesPanel';

export type FriendsSubTab = 'online' | 'all' | 'pending' | 'add_friend';

type FriendsDashboardProps = {
  activeSubTab: FriendsSubTab;
};

const FriendsDashboard = ({ activeSubTab }: FriendsDashboardProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { friends, requests } = useFriendsStore();
  const currentUser = useUsersStore((s) => s.getCurrentUser());

  // Discord data
  const discordConnected = useDiscordStore((s) => s.isConnected);
  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);

  const discordFriends = useMemo(() => {
    if (!discordConnected) return [];
    return discordRelationships
      .filter((r) => r.type === RelationshipType.FRIEND)
      .map((r) => discordUsersMap[r.id])
      .filter((u): u is NonNullable<typeof u> => !!u);
  }, [discordConnected, discordRelationships, discordUsersMap]);

  const discordPendingRequests = useMemo(() => {
    if (!discordConnected) return [];
    return discordRelationships
      .filter((r) => r.type === RelationshipType.INCOMING_REQUEST || r.type === RelationshipType.OUTGOING_REQUEST)
      .map((r) => ({
        user: discordUsersMap[r.id],
        isOutgoing: r.type === RelationshipType.OUTGOING_REQUEST,
      }))
      .filter((r): r is typeof r & { user: NonNullable<typeof r.user> } => !!r.user);
  }, [discordConnected, discordRelationships, discordUsersMap]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.username.toLowerCase().includes(query) || friend.name?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        {activeSubTab === 'add_friend' && <AddFriendForm />}

        {activeSubTab !== 'add_friend' && (
          <>
            <div className="mb-4">
              <InputGroup className="border-white/5 bg-[#17171a]">
                <InputGroupAddon>
                  <Search size={16} className="text-white" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-white placeholder:text-gray-500"
                />
                {searchQuery && (
                  <InputGroupAddon align="inline-end">
                    <button
                      onClick={() => setSearchQuery('')}
                      className="flex size-4 items-center justify-center rounded-full bg-gray-500 text-gray-900 hover:bg-gray-400"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X size={10} strokeWidth={4} />
                    </button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(activeSubTab === 'online' || activeSubTab === 'all') && (
                <FriendsList
                  friends={filteredFriends}
                  discordFriends={discordFriends}
                  filter={activeSubTab}
                  searchQuery={searchQuery}
                />
              )}
              {activeSubTab === 'pending' && currentUser && (
                <PendingRequests
                  requests={requests}
                  currentUser={currentUser}
                  discordRequests={discordPendingRequests}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          </>
        )}
      </div>

      {discordConnected && activeSubTab !== 'add_friend' && <DiscordActivitiesPanel />}
    </div>
  );
};

export default FriendsDashboard;
