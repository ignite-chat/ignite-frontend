import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import Avatar from '../Avatar';
import {
  MagnifyingGlass,
  SortAscending,
  UserMinus,
  DotsThree,
  Trash,
  Plus,
  Check
} from '@phosphor-icons/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { GuildsService } from '../../services/guilds.service';
import { RolesService } from '../../services/roles.service';
import { toast } from 'sonner';

const ServerMemberManager = ({ guild }) => {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingMemberId, setUpdatingMemberId] = useState(null);

  const fetchData = async () => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      const [membersResponse, rolesResponse] = await Promise.all([
        api.get(`/guilds/${guild.id}/members`),
        api.get(`/guilds/${guild.id}/roles`),
      ]);
      setMembers(Array.isArray(membersResponse.data) ? membersResponse.data : []);
      setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
    } catch (err) {
      setError('Could not load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [guild?.id]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const name = (member.nickname || member.user?.username || member.username || '').toLowerCase();
      const id = (member.user_id || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || id.includes(searchQuery.toLowerCase());
    });
  }, [members, searchQuery]);

  const handleKickMember = async (memberId) => {
    await GuildsService.kickMember(guild.id, memberId);
    setMembers(prev => prev.filter(m => (m.user_id || m.id) !== memberId));
  };

  const handleUpdateNickname = async (memberId) => {
    const newNickname = prompt('Enter new nickname:');
    if (newNickname === null) return;
    await GuildsService.updateMemberNickname(guild.id, memberId, newNickname);
    setMembers(prev => prev.map(m => (m.user_id || m.id) === memberId ? { ...m, nickname: newNickname } : m));
  };

  const toggleRole = async (member, roleId) => {
    const memberId = member.user_id || member.id;
    const hasRole = member.roles?.some(r => String(r.id) === String(roleId));

    setUpdatingMemberId(memberId);
    try {
      if (hasRole) {
        await RolesService.removeRoleFromMember(guild.id, memberId, roleId);
        toast.success('Role removed');
      } else {
        await RolesService.assignRoleToMember(guild.id, memberId, roleId);
        toast.success('Role assigned');
      }
      // Refresh members to get updated roles
      const { data } = await api.get(`/guilds/${guild.id}/members`);
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const formatJoinedDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            Members
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the people in this server. You can assign roles and manage permissions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between mt-2">
          <div className="relative w-full sm:w-96">
            <MagnifyingGlass
              size={18}
              weight="duotone"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by username or id"
              className="pl-10 h-11 bg-[#1e1f22] border-none focus-visible:ring-2 focus-visible:ring-orange-500/40 text-foreground transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-black/10 rounded-lg overflow-hidden border border-white/5">
        <div className="grid grid-cols-[1fr_150px_230px_48px] gap-4 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 border-b border-white/5 bg-white/[0.02]">
          <div>Name</div>
          <div>Member Since</div>
          <div>Roles</div>
          <div className="text-right">Actions</div>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <Spinner className="animate-spin" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <p>No members found matching your search.</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.user_id || member.id}
                  className="grid grid-cols-[1fr_150px_230px_48px] gap-4 px-4 py-3 items-center hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={member.user || member} className="size-10 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">
                        {member.nickname || member.user?.username || member.username}
                      </span>
                      <span className="text-xs text-muted-foreground truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {member.user?.username || member.username}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatJoinedDate(member.joined_at || member.created_at)}
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {member.roles?.map((role) => (
                      <Badge
                        key={role.id || role.role_id}
                        className="h-5 px-1.5 text-[10px] font-bold bg-[#4e5058] hover:bg-[#6c6e77] border-none text-gray-200"
                        style={{ backgroundColor: role.color ? `${role.color}20` : undefined, color: role.color || undefined }}
                      >
                        {role.name}
                      </Badge>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center justify-center size-5 rounded bg-white/10 hover:bg-white/20 text-muted-foreground transition-colors shrink-0 active:scale-90">
                          <Plus size={10} weight="bold" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 bg-[#1e1f22] border-white/5 p-1 shadow-2xl" side="bottom" align="start">
                        <div className="p-2 text-[10px] font-bold uppercase text-muted-foreground/50 tracking-wider">Assign Roles</div>
                        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                          {roles.map(role => {
                            const isAssigned = member.roles?.some(r => String(r.id) === String(role.id));
                            return (
                              <button
                                key={role.id}
                                onClick={() => toggleRole(member, role.id)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-white/5 transition-colors group/role"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="size-3 rounded-full" style={{ backgroundColor: role.color || '#99aab5' }} />
                                  <span className="text-sm text-foreground">{role.name}</span>
                                </div>
                                {isAssigned && <Check size={14} weight="bold" className="text-orange-500" />}
                              </button>
                            );
                          })}
                          {roles.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">No roles available</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex justify-end">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center justify-center size-8 rounded hover:bg-white/10 text-muted-foreground transition-all active:scale-90">
                          <DotsThree weight="bold" size={24} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 bg-[#18191c] border-white/5 p-1 shadow-2xl">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleUpdateNickname(member.user_id || member.id)}
                            className="w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-orange-500 hover:text-white transition-colors flex items-center gap-2 group/item"
                          >
                            <UserMinus size={18} weight="duotone" className="text-orange-500 group-hover/item:text-white" />
                            Change Nickname
                          </button>
                          <button
                            onClick={() => handleKickMember(member.user_id || member.id)}
                            className="w-full text-left px-2 py-1.5 rounded-sm text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 group/item"
                          >
                            <Trash size={18} weight="duotone" className="text-red-400 group-hover/item:text-white" />
                            Kick Member
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const Spinner = ({ className }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default ServerMemberManager;
