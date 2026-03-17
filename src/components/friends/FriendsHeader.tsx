import { Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type FriendsTopTab = 'friends' | 'message_requests';
export type FriendsSubTab = 'online' | 'all' | 'pending' | 'add_friend';

type FriendsHeaderProps = {
  activeTopTab: FriendsTopTab;
  activeSubTab: FriendsSubTab;
  onSubTabChange: (tab: FriendsSubTab) => void;
  pendingCount: number;
};

const TabButton = ({
  label,
  isActive,
  onClick,
  count,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <Button
    variant={isActive ? 'secondary' : 'ghost'}
    size="sm"
    className="h-7 px-3 text-sm font-medium"
    onClick={onClick}
  >
    {label}
    {count != null && count > 0 && (
      <Badge className="ml-2 h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] font-bold hover:bg-[#f23f42]">
        {count}
      </Badge>
    )}
  </Button>
);

const FriendsHeader = ({ activeTopTab, activeSubTab, onSubTabChange, pendingCount }: FriendsHeaderProps) => {
  return (
    <header className="flex h-12 items-center justify-between border-b border-white/5 px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-semibold text-[#f2f3f5]">
          <Users size={20} className="text-[#80848e]" />
          Friends
        </div>
        {activeTopTab === 'friends' && (
          <>
            <Separator orientation="vertical" className="h-6 bg-[#4e5058]" />
            <nav className="flex items-center gap-2">
              <TabButton
                label="Online"
                isActive={activeSubTab === 'online'}
                onClick={() => onSubTabChange('online')}
              />
              <TabButton
                label="All"
                isActive={activeSubTab === 'all'}
                onClick={() => onSubTabChange('all')}
              />
              <TabButton
                label="Pending"
                isActive={activeSubTab === 'pending'}
                onClick={() => onSubTabChange('pending')}
                count={pendingCount}
              />
              <Button
                variant={activeSubTab === 'add_friend' ? 'ghost' : 'default'}
                size="sm"
                className={`h-7 px-2 text-sm font-medium ${
                  activeSubTab === 'add_friend'
                    ? 'text-[#23a559]'
                    : 'bg-[#248046] text-white hover:bg-[#1a6334]'
                }`}
                onClick={() => onSubTabChange('add_friend')}
              >
                Add Friend
              </Button>
            </nav>
          </>
        )}
      </div>
    </header>
  );
};

export default FriendsHeader;
