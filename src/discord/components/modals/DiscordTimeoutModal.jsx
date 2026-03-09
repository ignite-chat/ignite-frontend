import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useModalStore } from '@/store/modal.store';
import { DiscordApiService } from '../../services/discord-api.service';

const TIMEOUT_DURATIONS = [
  { label: '60 secs', seconds: 60 },
  { label: '5 mins', seconds: 300 },
  { label: '10 mins', seconds: 600 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 604800 },
];

const DiscordTimeoutModal = ({ modalId, author, guildId }) => {
  const closeModal = () => useModalStore.getState().close(modalId);
  const [selectedDuration, setSelectedDuration] = useState(TIMEOUT_DURATIONS[0].seconds);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const displayName = author.global_name || author.username;

  const handleTimeout = async () => {
    setLoading(true);
    try {
      const until = new Date(Date.now() + selectedDuration * 1000).toISOString();
      const body = { communication_disabled_until: until };
      if (reason.trim()) body.reason = reason.trim();
      await DiscordApiService.modifyGuildMember(guildId, author.id, body);
      toast.success(`Timed out ${displayName}`);
      closeModal();
    } catch {
      toast.error(`Failed to timeout ${displayName}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={closeModal}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[440px] overflow-hidden rounded-lg border bg-[#242429] p-0 shadow-2xl"
      >
        <div className="px-4 pt-4">
          <DialogTitle className="text-xl font-bold leading-tight text-[#f2f3f5]">
            Timeout {displayName}
          </DialogTitle>

          <p className="mt-2 text-[14px] leading-[1.43] text-[#b5bac1]">
            Members who are in timeout are temporarily not allowed to
            chat or react in text channels. They are also not allowed to
            connect to voice or Stage channels.
          </p>
        </div>

        <div className="px-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
            Duration
          </h3>
          <div className="flex gap-2">
            {TIMEOUT_DURATIONS.map(({ label, seconds }) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setSelectedDuration(seconds)}
                className={`whitespace-nowrap rounded-full border px-3 py-[5px] text-[13px] font-medium transition-colors ${
                  selectedDuration === seconds
                    ? 'border-[#5865f2] bg-[#5865f2] text-white'
                    : 'border-[#4e5058] bg-transparent text-[#b5bac1] hover:border-[#6d6f78] hover:text-[#dbdee1]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
            Reason
          </h3>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason. This will only be visible in the Audit Log and will not be shown to the member."
            className="h-[88px] w-full resize-none rounded-[3px] border-none bg-[#1e1f22] px-2.5 py-2 text-sm leading-[1.4] text-[#dbdee1] placeholder-[#87888c] focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center justify-end gap-0 bg-[#232428] px-4 py-4">
          <button
            type="button"
            onClick={closeModal}
            className="px-6 py-[7px] text-[14px] font-medium text-[#dbdee1] transition-colors hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTimeout}
            disabled={loading}
            className="min-w-[96px] rounded-[3px] bg-[#5865f2] px-6 py-[7px] text-[14px] font-medium text-white transition-colors hover:bg-[#4752c4] disabled:opacity-50"
          >
            {loading ? 'Timing out...' : 'Timeout'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscordTimeoutModal;
