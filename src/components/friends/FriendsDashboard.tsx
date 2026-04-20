import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { useFriendsStore } from '@/ignite/store/friends.store';
import { useUsersStore } from '@/ignite/store/users.store';
import { useDiscordRelationshipsStore, RelationshipType } from '@/discord/store/discord-relationships.store';
import { useDiscordUsersStore } from '@/discord/store/discord-users.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { useTelegramStore } from '@/telegram/store/telegram.store';
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
  const { friends, requests, friendsLoaded, requestsLoaded } = useFriendsStore();
  const currentUser = useUsersStore((s) => s.getCurrentUser());
  const hasIgniteToken = !!localStorage.getItem('token');

  // Discord data
  const discordConnected = useDiscordStore((s) => s.isConnected);
  const discordAccounts = useDiscordStore((s) => s.accounts);
  const discordRelationships = useDiscordRelationshipsStore((s) => s.relationships);
  const discordUsersMap = useDiscordUsersStore((s) => s.users);

  // Telegram data — only needed to count connected sources for the account badge
  const telegramSession = useTelegramStore((s) => s.session);

  const discordFriends = useMemo(() => {
    if (!discordConnected) return [];
    const out: { user: NonNullable<typeof discordUsersMap[string]>; accountId?: string }[] = [];
    for (const r of discordRelationships) {
      if (r.type !== RelationshipType.FRIEND) continue;
      const user = discordUsersMap[r.id];
      if (!user) continue;
      out.push({ user, accountId: (r as any)._accountId });
    }
    return out;
  }, [discordConnected, discordRelationships, discordUsersMap]);

  const connectedAccountCount =
    (hasIgniteToken ? 1 : 0) +
    discordAccounts.filter((a) => a.isConnected).length +
    (telegramSession ? 1 : 0);
  const showAccountUI = connectedAccountCount > 1;

  const discordPendingRequests = useMemo(() => {
    if (!discordConnected) return [];
    const out: {
      user: NonNullable<typeof discordUsersMap[string]>;
      isOutgoing: boolean;
      accountId?: string;
    }[] = [];
    for (const r of discordRelationships) {
      if (r.type !== RelationshipType.INCOMING_REQUEST && r.type !== RelationshipType.OUTGOING_REQUEST) continue;
      const user = discordUsersMap[r.id];
      if (!user) continue;
      out.push({
        user,
        isOutgoing: r.type === RelationshipType.OUTGOING_REQUEST,
        accountId: (r as any)._accountId,
      });
    }
    return out;
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
                  loading={hasIgniteToken && !friendsLoaded}
                  showAccountBadges={showAccountUI}
                />
              )}
              {activeSubTab === 'pending' && (
                <PendingRequests
                  requests={requests}
                  currentUser={currentUser}
                  discordRequests={discordPendingRequests}
                  searchQuery={searchQuery}
                  loading={hasIgniteToken && !requestsLoaded}
                  showAccountBadges={showAccountUI}
                />
              )}
            </div>
          </>
        )}
      </div>

      {discordConnected && activeSubTab !== 'add_friend' && (
        <div className="hidden xl:block">
          <DiscordActivitiesPanel />
        </div>
      )}
    </div>
  );
};

export default FriendsDashboard;
