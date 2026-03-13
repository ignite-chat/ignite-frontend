import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import Pusher from 'pusher-js';
import Echo from 'laravel-echo';
import App from './App';
import api from './ignite/api';
import './css/style.css';
import { useAuthStore } from './ignite/store/auth.store';
import { useUsersStore } from './ignite/store/users.store';
import { useGuildsStore } from './ignite/store/guilds.store';
import { useChannelsStore } from './ignite/store/channels.store';
import { useFriendsStore } from './ignite/store/friends.store';
import { useRolesStore } from './ignite/store/roles.store';
import { useEmojisStore } from './ignite/store/emojis.store';
import { useStickersStore } from './ignite/store/stickers.store';
import { useUnreadsStore } from './ignite/store/unreads.store';
import { useNotificationStore } from './ignite/store/notification.store';
import { useVoiceStore } from './ignite/store/voice.store';
import { useTypingStore } from './ignite/store/typing.store';
import { useLastChannelStore } from './store/last-channel.store';
import { useSoundStore } from './ignite/store/sound.store';
import { useInvitesStore } from './ignite/store/invites.store';
import { Toaster } from './components/ui/sonner';
import { ModalRoot, useModalStore } from './store/modal.store';
import { ContextMenuRoot } from './store/context-menu.store';
import DiscordCaptchaProvider from './discord/components/DiscordCaptchaProvider';

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

function RouteLogger() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    console.group('🧭 Router navigation');
    console.log('Type:', navigationType); // PUSH | POP | REPLACE
    console.log('Path:', location.pathname);
    console.log('Search:', location.search);
    console.log('State:', location.state);
    console.groupEnd();
  }, [location, navigationType]);

  return null;
}

window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  authorizer: (channel) => {
    return {
      authorize: (socketId, callback) => {
        api
          .post('broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
          })
          .then((response) => {
            callback(false, response.data);
          })
          .catch((error) => {
            callback(true, error);
          });
      },
    };
  },
});

window.__IGNITE_STORES__ = () => ({
  auth: useAuthStore.getState(),
  users: useUsersStore.getState(),
  guilds: useGuildsStore.getState(),
  channels: useChannelsStore.getState(),
  friends: useFriendsStore.getState(),
  roles: useRolesStore.getState(),
  emojis: useEmojisStore.getState(),
  stickers: useStickersStore.getState(),
  unreads: useUnreadsStore.getState(),
  notification: useNotificationStore.getState(),
  voice: useVoiceStore.getState(),
  typing: useTypingStore.getState(),
  lastChannel: useLastChannelStore.getState(),
  sound: useSoundStore.getState(),
  invites: useInvitesStore.getState(),
  modals: useModalStore.getState(),
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ModalRoot />
      <ContextMenuRoot />
      <DiscordCaptchaProvider />
      <Toaster />
      <RouteLogger />
    </BrowserRouter>
  </React.StrictMode>
);
