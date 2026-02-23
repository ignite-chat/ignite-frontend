import { useAuthStore } from '../store/auth.store';
import { useUsersStore } from '../store/users.store';

/**
 * @deprecated This hook is deprecated. Use the following instead:
 * - For authentication: import { useAuthStore } from '@/store/auth.store'
 * - For user data: import { useUsersStore } from '@/store/users.store'
 * - For guilds: import { useGuildsStore } from '@/store/guilds.store'
 *
 * This is a compatibility shim that proxies to the new stores.
 * Please migrate to the new stores in your components.
 */
const useStore = () => {
  const { token, logout } = useAuthStore();
  const getCurrentUser = useUsersStore((state) => state.getCurrentUser);
  const setUser = useUsersStore((state) => state.setUser);

  return {
    user: getCurrentUser(),
    token,
    login: (user, token) => {
      // Store user in users store
      useUsersStore.getState().setUser(user.id, user);
      // Store userId in auth store
      useAuthStore.getState().login(user.id, token);
    },
    logout,
    setUser: (user) => setUser(user.id, user),
    // Guilds should use useGuildsStore directly
    guilds: [],
    setGuilds: () => console.warn('setGuilds is deprecated. Use useGuildsStore instead.'),
  };
};

export default useStore;
