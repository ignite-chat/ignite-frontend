import { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import PageTitle from './components/PageTitle';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DirectMessagesPage from './pages/DirectMessages';
import GuildChannelPage from './pages/GuildChannel';
import InvitePage from './pages/InvitePage';
import GuildDiscoveryPage from './pages/GuildDiscovery';
import DiscordGuildPage from './discord/pages/DiscordGuildPage';
import DiscordDMPage from './discord/pages/DiscordDMPage';
import { InitializationService } from './services/initialization.service';
import { EchoService } from './services/echo.service';
import { useGuildsStore } from './store/guilds.store';
import VoiceAudioRenderer from './components/Voice/VoiceAudioRenderer';
import { useElectronBadge } from './hooks/useElectronBadge';

const AuthRoute = ({ children }) => {
  const { userId } = useAuthStore();
  const { guilds } = useGuildsStore();

  const [initialized, setInitialized] = useState(false);
  const [failed, setFailed] = useState(false);

  // Sync taskbar badge with unread/mention state (Electron only)
  useElectronBadge();

  // Initialize app on mount
  useEffect(() => {
    const init = async () => {
      const result = await InitializationService.initialize();

      if (result.error) {
        setFailed(true);
      }

      setInitialized(true);
    };

    init();
  }, []);

  // Subscribe to user private channel via Echo
  useEffect(() => {
    if (!initialized || !userId) return;

    EchoService.subscribeToUserChannel(userId);

    return () => {
      if (userId) {
        EchoService.unsubscribeFromUserChannel(userId);
      }
    };
  }, [initialized, userId]);

  // Subscribe to guild channels via Echo
  useEffect(() => {
    if (!initialized || !userId || guilds.length === 0) return;

    EchoService.subscribeToGuilds(guilds);
  }, [guilds, initialized, userId]);

  if (failed) {
    // If we initialization failed, show an error message with a retry button
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-body">
        <div className="text-xl font-semibold text-red-500">Server Error</div>
        <div className="text-center text-muted-foreground">
          The server appears to be down. Please try again later.
        </div>
        <button
          className="rounded bg-primary px-4 py-2 text-white"
          onClick={() => {
            window.location.reload();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center bg-body">
        <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

const GuestRoute = ({ children }) => {
  if (localStorage.getItem('token')) {
    return <Navigate to="/channels/@me" replace />;
  }

  return children ? children : <Outlet />;
};

const PublicRoute = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  const initializing = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        await InitializationService.initialize();
      } catch (error) {
        console.error('Failed to initialize on public route', error);
        // Remove invalid token but don't prevent access
        localStorage.removeItem('token');
      }

      setInitialized(true);
      initializing.current = false;
    };

    init();
  }, []);

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center bg-body">
        <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

function App() {
  const { userId } = useAuthStore();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') return;

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <>
      <VoiceAudioRenderer />
      <Routes>
        <Route
          index
          element={userId ? <Navigate to="/channels/@me" replace /> : <Navigate to="/login" replace />}
        />
        <Route element={<PublicRoute />}>
          <Route
            path="/invite/:code"
            element={
              <>
                <PageTitle title="Server Invite" />
                <InvitePage />
              </>
            }
          />
        </Route>
        <Route element={<GuestRoute />}>
          <Route
            path="login"
            element={
              <>
                <PageTitle title="Login" />
                <LoginPage />
              </>
            }
          />
          <Route
            path="register"
            element={
              <>
                <PageTitle title="Register" />
                <RegisterPage />
              </>
            }
          />
        </Route>
        <Route element={<AuthRoute />}>
          <Route
            path="/channels/@me"
            element={
              <>
                <PageTitle title="Friends" />
                <DirectMessagesPage />
              </>
            }
          />
          <Route
            path="/channels/@me/:channelId/:messageId?"
            element={<DirectMessagesPage />}
          />
          <Route
            path="/guild-discovery"
            element={
              <>
                <PageTitle title="Discover Servers" />
                <GuildDiscoveryPage />
              </>
            }
          />
          <Route
            path="/channels/:guildId/:channelId?/:messageId?"
            element={<GuildChannelPage />}
          />
          <Route
            path="/discord/@me/:channelId?"
            element={
              <>
                <PageTitle title="Discord DMs" />
                <DiscordDMPage />
              </>
            }
          />
          <Route
            path="/discord/:guildId/:channelId?"
            element={
              <>
                <PageTitle title="Discord" />
                <DiscordGuildPage />
              </>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
