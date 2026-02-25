import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import Pusher from 'pusher-js';
import Echo from 'laravel-echo';
import { Minus, Square, X } from '@phosphor-icons/react';
import App from './App';
import api from './api';
import './css/style.css';
import { useAuthStore } from './store/auth.store';
import { useUsersStore } from './store/users.store';
import { useGuildsStore } from './store/guilds.store';
import { useChannelsStore } from './store/channels.store';
import { useFriendsStore } from './store/friends.store';
import { useRolesStore } from './store/roles.store';
import { useEmojisStore } from './store/emojis.store';
import { useStickersStore } from './store/stickers.store';
import { useUnreadsStore } from './store/unreads.store';
import { useNotificationStore } from './store/notification.store';
import { useVoiceStore } from './store/voice.store';
import { useTypingStore } from './store/typing.store';
import { useLastChannelStore } from './store/last-channel.store';
import { useSoundStore } from './store/sound.store';
import { useInvitesStore } from './store/invites.store';
import { Toaster } from './components/ui/sonner';
import { ModalRoot, useModalStore } from './store/modal.store';

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

const WindowControlButton = ({ icon: Icon, onClick, variant = 'default', ariaLabel }) => {
  const colorClasses =
    variant === 'close'
      ? 'text-red-400 hover:text-red-200 hover:bg-red-900/40'
      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700';

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`flex size-8 items-center justify-center transition-colors duration-100 ${colorClasses}`}
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <Icon className="size-5" weight="regular" />
    </button>
  );
};

function WindowBar() {
  if (!window.IgniteNative) return null;

  const isMac = window.IgniteNative.platform === 'darwin';

  return (
    <div
      className="relative flex h-8 items-center justify-center border-b border-white/5 bg-[#121214]"
      style={{
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      {/* Centered app name */}
      <div className="text-sm font-semibold text-gray-100">Ignite</div>

      {/* Window controls - hidden on macOS where native traffic lights are used */}
      {!isMac && (
        <div className="absolute right-0 flex">
          <WindowControlButton
            icon={Minus}
            onClick={() => window.IgniteNative.minimize()}
            ariaLabel="Minimize"
          />
          <WindowControlButton
            icon={Square}
            onClick={() => window.IgniteNative.maximize()}
            ariaLabel="Maximize"
          />
          <WindowControlButton
            icon={X}
            onClick={() => window.IgniteNative.close()}
            variant="close"
            ariaLabel="Close"
          />
        </div>
      )}
    </div>
  );
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
    <div className="flex h-screen flex-col overflow-hidden">
      <WindowBar />
      <div className="flex min-h-0 flex-1 flex-col">
        <BrowserRouter>
          <App />
          <ModalRoot />
          <Toaster />
          <RouteLogger />
        </BrowserRouter>
      </div>
    </div>
  </React.StrictMode>
);
