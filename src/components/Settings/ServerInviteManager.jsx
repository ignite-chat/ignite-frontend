import { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  Trash,
  Plus,
  Clock,
  Users,
  Hash,
  X
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { GuildsService } from '../../services/guilds.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';
import Avatar from '../Avatar';

const ServerInviteManager = ({ guild }) => {
  const [invites, setInvites] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [expiry, setExpiry] = useState('1d');
  const [maxUses, setMaxUses] = useState(0);
  const [targetChannelId, setTargetChannelId] = useState('');

  const fetchData = useCallback(async () => {
    if (!guild?.id) return;
    setLoading(true);

    try {
      const [invitesRes, channelsRes] = await Promise.all([
        api.get(`/guilds/${guild.id}/invites`),
        api.get(`/guilds/${guild.id}/channels`)
      ]);
      setInvites(Array.isArray(invitesRes.data) ? invitesRes.data : []);
      setChannels(Array.isArray(channelsRes.data) ? channelsRes.data : []);
    } catch (err) {
      toast.error('Could not load invites.');
    } finally {
      setLoading(false);
    }
  }, [guild?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteInvite = async (inviteCode) => {
    if (!guild?.id || !inviteCode) return;

    try {
      await api.delete(`/guilds/${guild.id}/invites/${inviteCode}`);
      setInvites((prev) => prev.filter((invite) => (invite.code || invite.id) !== inviteCode));
      toast.success('Invite deleted successfully');
    } catch (err) {
      toast.error('Failed to delete invite');
    }
  };

  const handleCreateInvite = async () => {
    if (!guild?.id || !targetChannelId) {
      toast.error("Please select a channel first.");
      return;
    }
    setIsCreating(true);
    try {
      const options = {
        max_uses: maxUses > 0 ? maxUses : undefined,
        expires_at: expiry || undefined
      };
      const newInvite = await GuildsService.createInvite(guild.id, targetChannelId, options);
      if (newInvite) {
        setInvites(prev => [newInvite, ...prev]);
        setIsModalOpen(false);
        // Reset form
        setExpiry('1d');
        setMaxUses(0);
        setTargetChannelId('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-foreground">Invites</h3>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white border-none h-8 px-4 font-bold text-xs transition-all active:scale-95"
        >
          Create invite link
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-60 mb-4">
            Active Invite Links
          </h4>

          <div className="grid grid-cols-[1.5fr_1fr_100px_1fr_100px_48px] gap-4 px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5 opacity-50">
            <div>Inviter</div>
            <div>Invite Code</div>
            <div>Uses</div>
            <div>Expires</div>
            <div>Roles</div>
            <div className="text-right"></div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="size-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                </div>
              ) : invites.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                  <Plus size={40} weight="duotone" className="mb-4" />
                  <p className="text-sm font-medium">No active invite links.</p>
                </div>
              ) : (
                invites.map((invite) => (
                  <div
                    key={invite.code}
                    className="grid grid-cols-[1.5fr_1fr_100px_1fr_100px_48px] gap-4 px-2 py-3 items-center hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar user={invite.inviter} className="size-6 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-foreground truncate">{invite.inviter?.username || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Hash size={10} /> {invite.channel?.name || 'none'}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-foreground font-medium">
                      {invite.code}
                    </div>

                    <div className="text-sm text-foreground font-medium">
                      {invite.uses || 0}
                    </div>

                    <div className="text-sm text-foreground font-medium">
                      {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'Never'}
                    </div>

                    <div className="text-sm text-foreground font-medium opacity-10">
                      —
                    </div>

                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded"
                        onClick={() => handleDeleteInvite(invite.code)}
                      >
                        <Trash size={18} weight="duotone" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* CREATE INVITE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#313338] border-none text-foreground sm:max-w-[440px] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6">
            <DialogTitle className="text-xl font-bold text-center">Create Invite Link</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-sm">
              Generate a custom invite link for a specific channel.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground opacity-60">Select Channel</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between w-full px-3 py-2 bg-[#1e1f22] rounded-md ring-1 ring-white/5 text-left h-10 border-none outline-none focus:ring-1 focus:ring-orange-500">
                    <span className="text-sm truncate">
                      {targetChannelId ? channels.find(c => (c.id || c.channel_id) === targetChannelId)?.name : 'Select a channel...'}
                    </span>
                    <Plus size={14} className="opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[392px] bg-[#1e1f22] border-white/10 p-1 shadow-2xl" align="start">
                  <ScrollArea className="h-48">
                    <div className="flex flex-col gap-0.5">
                      {channels.map(channel => (
                        <button
                          key={channel.id || channel.channel_id}
                          onClick={() => setTargetChannelId(channel.id || channel.channel_id)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-2 rounded text-left text-sm hover:bg-white/5 transition-colors",
                            targetChannelId === (channel.id || channel.channel_id) && "bg-orange-500/10 text-orange-500"
                          )}
                        >
                          <Hash size={16} className="opacity-50" />
                          {channel.name}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground opacity-60">Expire After</Label>
                <Input
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="e.g. 1d, 7d, never"
                  className="bg-[#1e1f22] border-none h-10 focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground opacity-60">Max Number of Uses</Label>
                <Input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
                  placeholder="0 (unlimited)"
                  className="bg-[#1e1f22] border-none h-10 focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-[#2b2d31] p-4 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="text-white hover:bg-transparent hover:underline px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvite}
              disabled={isCreating}
              className="bg-orange-500 hover:bg-orange-600 text-white border-none px-6 h-10 font-bold active:scale-95 transition-all shadow-lg shadow-black/20"
            >
              Generate Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerInviteManager;
