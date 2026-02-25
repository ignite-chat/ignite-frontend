import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUsersStore } from '@/store/users.store';
import { useGuildsStore } from '@/store/guilds.store';
import { useModalStore } from '@/store/modal.store';

const highlightJson = (obj) => {
  const raw = JSON.stringify(obj, null, 2);
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-emerald-400';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-blue-400' : 'text-amber-300';
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-400';
      } else if (/null/.test(match)) {
        cls = 'text-red-400';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
};

/**
 * Debug info dialog for a guild member.
 * Pushed via useModalStore.push(MemberDebugModal, { user, guildId }).
 */
export const MemberDebugModal = ({ modalId, user, guildId }) => {
  const getUser = useUsersStore((s) => s.getUser);
  const guildMembers = useGuildsStore((s) => s.guildMembers);

  const storeUser = user ? getUser(user.id) : null;
  const member = user ? guildMembers[guildId]?.find((m) => m.user_id === user.id) : null;

  if (!user) return null;

  const debugData = { user: storeUser || null, member: member || null };

  return (
    <Dialog open onOpenChange={() => useModalStore.getState().close(modalId)}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Member Debug Info</DialogTitle>
          <DialogDescription>{user.name || user.username}</DialogDescription>
        </DialogHeader>
        <pre
          className="min-h-0 flex-1 overflow-auto rounded-md bg-black/40 p-4 text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightJson(debugData) }}
        />
      </DialogContent>
    </Dialog>
  );
};
