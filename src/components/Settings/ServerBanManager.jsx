import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { GuildsService } from '../../services/guilds.service';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

const ServerBanManager = ({ guild }) => {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!guild?.id) return;
    setLoading(true);
    GuildsService.getGuildBans(guild.id)
      .then((data) => setBans(data))
      .catch(() => toast.error('Failed to load bans.'))
      .finally(() => setLoading(false));
  }, [guild?.id]);

  const filteredBans = useMemo(() => {
    if (!searchQuery.trim()) return bans;
    const query = searchQuery.toLowerCase();
    return bans.filter((ban) => {
      const name = ban.user?.username || ban.user?.name || '';
      return name.toLowerCase().includes(query);
    });
  }, [bans, searchQuery]);

  const totalPages = Math.ceil(filteredBans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBans = filteredBans.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleUnban = async (userId) => {
    try {
      await GuildsService.unbanMember(guild.id, userId);
      setBans((prev) => prev.filter((b) => (b.user?.id || b.user_id) !== userId));
    } catch {
      // toast already shown by service
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading bans...</p>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Bans</h2>
          <p className="text-sm text-muted-foreground">
            Manage banned users in {guild?.name || 'this server'}.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <InputGroup>
            <InputGroupInput
              type="text"
              placeholder="Search bans"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="max-h-[calc(100vh-20rem)] overflow-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Banned At
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedBans.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {searchQuery
                      ? 'No bans found matching your search.'
                      : 'No banned users.'}
                  </td>
                </tr>
              ) : (
                paginatedBans.map((ban) => {
                  const userId = ban.user?.id || ban.user_id;
                  const username = ban.user?.username || ban.user?.name || 'Unknown';
                  const reason = ban.reason || 'No reason provided';
                  const bannedAt = ban.created_at || ban.banned_at;

                  return (
                    <tr key={userId} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-sm font-semibold text-red-400">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{username}</span>
                        </div>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
                        {reason}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {bannedAt
                          ? new Date(bannedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUnban(userId)}
                        >
                          Unban
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

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center text-sm text-muted-foreground sm:text-left">
            Showing {startIndex + 1} to{' '}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredBans.length)} of{' '}
            {filteredBans.length} bans
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
    </div>
  );
};

export default ServerBanManager;
