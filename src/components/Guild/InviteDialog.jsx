import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Link } from '@phosphor-icons/react';
import api from '@/api';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EXPIRE_OPTIONS = [
  { label: '30 minutes', value: '1800' },
  { label: '1 hour', value: '3600' },
  { label: '6 hours', value: '21600' },
  { label: '12 hours', value: '43200' },
  { label: '1 day', value: '86400' },
  { label: '7 days', value: '604800' },
  { label: 'Never', value: '0' },
];

const MAX_USES_OPTIONS = [
  { label: 'No limit', value: '0' },
  { label: '1 use', value: '1' },
  { label: '5 uses', value: '5' },
  { label: '10 uses', value: '10' },
  { label: '25 uses', value: '25' },
  { label: '50 uses', value: '50' },
  { label: '100 uses', value: '100' },
];

const InviteDialog = ({ open, onOpenChange, guildId }) => {
  const [maxAge, setMaxAge] = useState('86400');
  const [maxUses, setMaxUses] = useState('0');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);

  const handleCreate = useCallback(async () => {
    if (!guildId || loading) return;
    setLoading(true);
    try {
      const res = await api.post(`guilds/${guildId}/invites`, {
        max_age: Number(maxAge),
        max_uses: Number(maxUses),
      });
      setInviteCode(res.data.code);
      toast.success('Invite created.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [guildId, maxAge, maxUses, loading]);

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(`https://app.ignite-chat.com/invite/${inviteCode}`);
      toast.success('Copied invite link.');
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }, [inviteCode]);

  const handleClose = (value) => {
    onOpenChange(value);
    if (!value) {
      setInviteCode(null);
      setMaxAge('86400');
      setMaxUses('0');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to Server</DialogTitle>
          <DialogDescription>Create an invite link to share with others.</DialogDescription>
        </DialogHeader>

        {!inviteCode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Expire After</Label>
              <Select value={maxAge} onValueChange={setMaxAge}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Max Number of Uses
              </Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_USES_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="text-white">
                {loading ? 'Creating…' : 'Create Invite'}
                {!loading && <Link className="ml-2 size-4" />}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Your Invite Link
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 select-all break-all rounded-md bg-secondary/40 px-3 py-2 font-mono text-sm text-foreground">
                  https://app.ignite-chat.com/invite/{inviteCode}
                </div>
                <Button size="sm" variant="secondary" onClick={handleCopy}>
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setInviteCode(null)}>
                Create Another
              </Button>
              <Button onClick={() => handleClose(false)} className="text-white">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteDialog;
