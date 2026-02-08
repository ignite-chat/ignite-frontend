import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import Pusher from 'pusher-js';
import Echo from 'laravel-echo';
import App from './App';
import api from './api';
import './css/style.css';
import { Toaster } from './components/ui/sonner';

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

function WindowBar() {
  if (!window.IgniteNative) return null;

  return (
    <div style={{
      WebkitAppRegion: 'drag',
      display: 'flex',
      alignItems: 'center',
      height: 32,
      background: '#18181b',
      borderBottom: '1px solid #27272a',
      userSelect: 'none',
      zIndex: 100,
    }}>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
        <button
          aria-label="Minimize"
          onClick={() => window.IgniteNative.minimize()}
          style={{ width: 40, height: 32, background: 'none', border: 'none', color: '#fff', fontSize: 18 }}
        >-</button>
        <button
          aria-label="Maximize"
          onClick={() => window.IgniteNative.maximize()}
          style={{ width: 40, height: 32, background: 'none', border: 'none', color: '#fff', fontSize: 18 }}
        >☐</button>
        <button
          aria-label="Close"
          onClick={() => window.IgniteNative.close()}
          style={{ width: 40, height: 32, background: 'none', border: 'none', color: '#f87171', fontSize: 18 }}
        >×</button>
      </div>
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
        api.post('broadcasting/auth', {
          socket_id: socketId,
          channel_name: channel.name
        })
          .then(response => {
            callback(false, response.data);
          })
          .catch(error => {
            callback(true, error);
          });
      }
    };
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* <WindowBar /> */}
    <BrowserRouter>
      <App />
      <Toaster />
      <RouteLogger />
    </BrowserRouter>
  </React.StrictMode>,
);