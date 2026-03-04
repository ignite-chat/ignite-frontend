import { create } from 'zustand';

type MemberListGroup = {
  id: string; // role id, "online", or "offline"
  count: number;
};

type MemberListItem =
  | { group: { id: string; count: number } }
  | { member: any };

type MemberListData = {
  id: string; // list id — unique per channel subscription
  groups: MemberListGroup[];
  items: MemberListItem[];
  member_count: number;
  online_count: number;
};

type DiscordMemberListStore = {
  /** memberLists[guildId] holds the current member list data */
  memberLists: { [guildId: string]: MemberListData };

  /** Tracks whether we're waiting for a fresh SYNC after a new subscription */
  pendingSyncs: { [guildId: string]: boolean };

  /** Mark that a new subscription was sent and we're waiting for a SYNC */
  markPendingSync: (guildId: string) => void;

  /** Handle a full GUILD_MEMBER_LIST_UPDATE event */
  handleListUpdate: (guildId: string, data: any) => void;

  /** Clear all data */
  clear: () => void;
};

export const useDiscordMemberListStore = create<DiscordMemberListStore>((set) => ({
  memberLists: {},
  pendingSyncs: {},

  markPendingSync: (guildId) =>
    set((state) => ({
      pendingSyncs: { ...state.pendingSyncs, [guildId]: true },
    })),

  handleListUpdate: (guildId, data) =>
    set((state) => {
      const { id, ops, groups, member_count, online_count } = data;
      const existing = state.memberLists[guildId];
      const isPending = state.pendingSyncs[guildId];
      const hasSyncOp = ops?.some((op: any) => op.op === 'SYNC');

      // If we've just subscribed to a new channel and are waiting for fresh data,
      // ignore any non-SYNC updates (they belong to the old subscription).
      if (isPending && !hasSyncOp) {
        return state;
      }

      if (existing && id !== existing.id && !hasSyncOp) {
        // This update is for a stale list ID (e.g. an INVALIDATE for the old channel).
        // Ignore it — the current list belongs to a different subscription.
        return state;
      }

      // If this is a new list ID with a SYNC, start fresh
      const base = (existing && id === existing.id)
        ? existing
        : { id: id || 'everyone', groups: [], items: [], member_count: 0, online_count: 0 };

      let items = [...base.items];

      for (const op of ops || []) {
        switch (op.op) {
          case 'SYNC': {
            const [start, end] = op.range || [0, 0];
            const syncItems = op.items || [];
            // Ensure items array is long enough
            while (items.length < end + 1) items.push({ group: { id: 'placeholder', count: 0 } });
            // Replace range with synced items
            items.splice(start, end - start + 1, ...syncItems);
            break;
          }
          case 'INSERT': {
            const index = op.index ?? 0;
            if (op.item) {
              items.splice(index, 0, op.item);
            }
            break;
          }
          case 'UPDATE': {
            const index = op.index ?? 0;
            if (op.item && index < items.length) {
              items[index] = op.item;
            }
            break;
          }
          case 'DELETE': {
            const index = op.index ?? 0;
            if (index < items.length) {
              items.splice(index, 1);
            }
            break;
          }
          case 'INVALIDATE': {
            const [start, end] = op.range || [0, 0];
            items.splice(start, end - start + 1);
            break;
          }
        }
      }

      return {
        memberLists: {
          ...state.memberLists,
          [guildId]: {
            id: id || base.id,
            groups: groups || base.groups,
            items,
            member_count: member_count ?? base.member_count,
            online_count: online_count ?? base.online_count,
          },
        },
        // Clear pending flag once we've received a SYNC
        pendingSyncs: hasSyncOp
          ? { ...state.pendingSyncs, [guildId]: false }
          : state.pendingSyncs,
      };
    }),

  clear: () => set({ memberLists: {}, pendingSyncs: {} }),
}));
