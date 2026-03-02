import { useCallback, useEffect, useState, useMemo } from 'react';
import api from '@/ignite/api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

const ServerInviteManager = ({ guild }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchInvites = useCallback(async () => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/guilds/${guild.id}/invites`);
      const data = Array.isArray(response.data) ? response.data : [];
      setInvites(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not load invites.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [guild?.id]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const totalPages = Math.ceil(invites.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvites = useMemo(() => {
    return invites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [invites, startIndex]);

  const [pendingRevokeId, setPendingRevokeId] = useState(null);

  const handleDeleteInvite = (inviteId) => {
    if (!guild?.id || !inviteId) return;
    // Unimplemented
    toast.error('Revoking invites is not implemented yet.');
    return;

    setPendingRevokeId(inviteId);
  };

  const confirmRevokeInvite = async () => {
    if (!pendingRevokeId || !guild?.id) {
      setPendingRevokeId(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.delete(`/guilds/${guild.id}/invites/${pendingRevokeId}`);
      setInvites((prev) => prev.filter((invite) => (invite.id || invite.code) !== pendingRevokeId));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not delete invite.';
      setError(msg);
    } finally {
      setLoading(false);
      setPendingRevokeId(null);
    }
  };

  return (
    <div className="max-w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Invites</h2>
        <p className="text-sm text-muted-foreground">
          View and manage invite links for {guild?.name || 'this server'}.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Active Invites Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Active Invite Links</h3>
        {loading && <div className="text-sm text-muted-foreground">Loading invites...</div>}
        {!loading && (
          <>
            <div className="overflow-hidden rounded-md border border-border">
              <div className="max-h-[calc(100vh-20rem)] overflow-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Uses
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedInvites.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          No active invites found.
                        </td>
                      </tr>
                    ) : (
                      paginatedInvites.map((invite) => {
                        const inviteId = invite.id || invite.code;
                        const inviteCode = invite.code || inviteId;
                        return (
                          <tr key={inviteId} className="transition-colors hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                                {inviteCode}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invite.uses ?? 0} / {invite.max_uses ?? '∞'}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invite.expires_at
                                ? new Date(invite.expires_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invite.created_at
                                ? new Date(invite.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInvite(inviteId)}
                                className="text-destructive hover:text-destructive"
                              >
                                Revoke
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
                  {Math.min(startIndex + ITEMS_PER_PAGE, invites.length)} of {invites.length}{' '}
                  invites
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
          </>
        )}
      </div>

      <AlertDialog
        open={!!pendingRevokeId}
        onOpenChange={(open) => { if (!open) setPendingRevokeId(null); }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRevokeInvite}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServerInviteManager;
