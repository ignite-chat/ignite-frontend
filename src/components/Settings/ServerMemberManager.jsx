import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { useGuildsStore } from '../../store/guilds.store';
import { useRolesStore } from '../../store/roles.store';

const ITEMS_PER_PAGE = 10;

const ServerMemberManager = ({ guild }) => {
  const guildMembers = useGuildsStore((state) => state.guildMembers);
  const guildRoles = useRolesStore((state) => state.guildRoles);

  const members = guild?.id ? guildMembers[guild.id] || [] : [];
  const roles = guild?.id ? guildRoles[guild.id] || [] : [];

  const [memberRoles, setMemberRoles] = useState({});
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!guild?.id || members.length === 0) return;

    const initialRoles = members.reduce((acc, member) => {
      const roleIds = Array.isArray(member.roles)
        ? member.roles.map((role) => role.id || role.role_id).filter(Boolean)
        : [];
      const memberId = member.user_id || member.id;
      if (memberId) {
        acc[memberId] = new Set(roleIds);
      }
      return acc;
    }, {});
    setMemberRoles(initialRoles);
  }, [guild?.id, members]);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        id: member.user_id || member.id,
        name: member.nickname || member.user?.username || member.username || 'Unknown',
        joinedAt: member.joined_at || member.created_at || null,
      })),
    [members]
  );

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id || role.role_id,
        name: role.name || role.role_name || 'Unnamed role',
      })),
    [roles]
  );

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return memberOptions;
    const query = searchQuery.toLowerCase();
    return memberOptions.filter((member) => member.name.toLowerCase().includes(query));
  }, [memberOptions, searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const toggleRole = (memberId, roleId) => {
    setMemberRoles((prev) => {
      const memberSet = new Set(prev[memberId] || []);
      if (memberSet.has(roleId)) {
        memberSet.delete(roleId);
      } else {
        memberSet.add(roleId);
      }
      return { ...prev, [memberId]: memberSet };
    });
  };

  const handleSave = async (memberId) => {
    if (!guild?.id || !memberId) return;

    setSaving(true);
    setError('');

    try {
      await api.patch(`/guilds/${guild.id}/members/${memberId}`, {
        roles: Array.from(memberRoles[memberId] || []),
      });
      setEditingMemberId(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update member.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage members in {guild?.name || 'this server'}.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <InputGroup>
            <InputGroupInput
              type="text"
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Members Table */}
          <div className="overflow-hidden rounded-md border border-border">
            <div className="max-h-[calc(100vh-20rem)] overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Member Since
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Roles
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        {searchQuery
                          ? 'No members found matching your search.'
                          : 'No members found.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((member) => {
                      const assignedRoles = memberRoles[member.id] || new Set();
                      const memberRolesList = roleOptions.filter((role) =>
                        assignedRoles.has(role.id)
                      );
                      return (
                        <tr key={member.id} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {member.joinedAt
                              ? new Date(member.joinedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Unknown'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {memberRolesList.length === 0 ? (
                                <span className="text-sm text-muted-foreground">No roles</span>
                              ) : (
                                memberRolesList.map((role) => (
                                  <Badge key={role.id} variant="secondary" className="text-xs">
                                    {role.name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemberId(member.id)}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center text-sm text-muted-foreground sm:text-left">
                Showing {startIndex + 1} to{' '}
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredMembers.length)} of{' '}
                {filteredMembers.length} members
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex max-w-full items-center gap-1 overflow-x-auto">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          type="button"
                          variant={currentPage === page ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[2.5rem] shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="shrink-0 px-2 text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

      {/* Edit Roles Dialog */}
      <Dialog open={!!editingMemberId} onOpenChange={(open) => !open && setEditingMemberId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Roles - {memberOptions.find((m) => m.id === editingMemberId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Roles</Label>
                {roleOptions.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {(memberRoles[editingMemberId] || new Set()).size} of {roleOptions.length} assigned
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <div className="space-y-2 pb-1">
                    {roleOptions.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No roles available.</div>
                    ) : (
                      roleOptions.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2.5"
                        >
                          <span className="text-sm font-medium">{role.name}</span>
                          <Switch
                            checked={(memberRoles[editingMemberId] || new Set()).has(role.id)}
                            onCheckedChange={() => toggleRole(editingMemberId, role.id)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {roleOptions.length > 6 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent" />
                )}
              </div>
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingMemberId(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => handleSave(editingMemberId)} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerMemberManager;
