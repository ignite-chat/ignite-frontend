import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'ignite:guild-order';

/**
 * Hook to manage user-defined guild ordering.
 * Persists to localStorage so it's per-user/device.
 *
 * @param {Array} guilds - The guilds array from the store
 * @returns {{ orderedGuilds: Array, reorder: (activeId: string, overId: string) => void }}
 */
export function useGuildOrder(guilds) {
  const [orderMap, setOrderMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persist to localStorage whenever orderMap changes
  useEffect(() => {
    if (orderMap) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orderMap));
        // TODO: Backend would go here to save between devices
        // e.g. api.patch('/users/@me/settings', { guild_order: orderMap });
      } catch {
        // localStorage full or unavailable — ignore
      }
    }
  }, [orderMap]);

  // Build the ordered guilds list
  const orderedGuilds = useMemo(() => {
    if (!guilds || guilds.length === 0) return [];
    if (!orderMap || orderMap.length === 0) return guilds;

    // Order by the saved ID list, append any new guilds at the end
    const ordered = [];
    const guildMap = new Map(guilds.map((g) => [String(g.id), g]));

    // First, add guilds in saved order
    for (const id of orderMap) {
      const guild = guildMap.get(String(id));
      if (guild) {
        ordered.push(guild);
        guildMap.delete(String(id));
      }
    }

    // Then append any guilds not in the saved order (newly joined)
    for (const guild of guildMap.values()) {
      ordered.push(guild);
    }

    return ordered;
  }, [guilds, orderMap]);

  // Reorder: move activeId to the position of overId
  const reorder = useCallback(
    (activeId, overId) => {
      const currentOrder = orderedGuilds.map((g) => String(g.id));
      const activeIndex = currentOrder.indexOf(String(activeId));
      const overIndex = currentOrder.indexOf(String(overId));

      if (activeIndex === -1 || overIndex === -1) return;

      const newOrder = [...currentOrder];
      const [moved] = newOrder.splice(activeIndex, 1);
      newOrder.splice(overIndex, 0, moved);

      setOrderMap(newOrder);
    },
    [orderedGuilds]
  );

  return { orderedGuilds, reorder };
}
