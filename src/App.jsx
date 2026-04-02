import { useState, useEffect } from 'react';
import { useMountEffect } from './hooks/useMountEffect';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { useAuthStore } from './ignite/store/auth.store';
import PageTitle from './ignite/components/PageTitle';
import DirectMessagesPage from './ignite/pages/DirectMessages';
import GuildChannelPage from './ignite/pages/GuildChannel';
import InvitePage from './ignite/pages/InvitePage';
import GuildDiscoveryPage from './ignite/pages/GuildDiscovery';
import DiscordGuildPage from './discord/pages/DiscordGuildPage';
import DiscordLandingPage from './discord/pages/DiscordLandingPage';
import TelegramChatPage from './telegram/pages/TelegramChatPage';
import AppLayout from './layouts/AppLayout';
import { InitializationService } from './ignite/services/initialization.service';
import { EchoService } from './ignite/services/echo.service';
import { useGuildsStore } from './ignite/store/guilds.store';
import VoiceAudioRenderer from './ignite/components/voice/VoiceAudioRenderer';
import { useElectronBadge } from './ignite/hooks/useElectronBadge';
import { useWindowOpenHandler } from './hooks/useWindowOpenHandler';

const AuthRoute = ({ children }) => {
  const { userId } = useAuthStore();
  const { guilds } = useGuildsStore();

  const [initialized, setInitialized] = useState(false);

  const hasIgniteToken = !!localStorage.getItem('token');

  // Sync taskbar badge with unread/mention state (Electron only)
  useElectronBadge();

  // Intercept window.open calls from Electron and handle in-app
  useWindowOpenHandler();

  // Initialize app on mount
  useMountEffect(() => {
    if (!hasIgniteToken) {
      setInitialized(true);
      return;
    }

    const init = async () => {
      const result = await InitializationService.initialize();

      setInitialized(true);
    };

    init();
  });

  // Subscribe to user private channel via Echo
  useEffect(() => {
    if (!initialized || !userId || !hasIgniteToken) return;

    EchoService.subscribeToUserChannel(userId);

    return () => {
      if (userId) {
        EchoService.unsubscribeFromUserChannel(userId);
      }
    };
  }, [initialized, userId]);

  // Subscribe to guild channels via Echo
  useEffect(() => {
    if (!initialized || !userId || guilds.length === 0 || !hasIgniteToken) return;

    EchoService.subscribeToGuilds(guilds);
  }, [guilds, initialized, userId]);

  // if (failed) {
  //   return (
  //     <div className="flex h-full flex-col items-center justify-center gap-4 bg-body">
  //       <div className="text-xl font-semibold text-red-500">Server Error</div>
  //       <div className="text-center text-muted-foreground">
  //         The server appears to be down. Please try again later.
  //       </div>
  //       <button
  //         className="rounded bg-primary px-4 py-2 text-white"
  //         onClick={() => {
  //           window.location.reload();
  //         }}
  //       >
  //         Retry
  //       </button>
  //     </div>
  //   );
  // }

  // While initializing, render the app layout so skeletons show instead of a spinner
  if (hasIgniteToken && !initialized) {
    return children ? children : <Outlet />;
  }

  return children ? children : <Outlet />;
};

const PublicRoute = ({ children }) => {
  useMountEffect(() => {
    const init = async () => {
      try {
        await InitializationService.initialize();
      } catch (error) {
        console.error('Failed to initialize on public route', error);
        localStorage.removeItem('token');
      }
    };

    init();
  });

  return children ? children : <Outlet />;
};

const DiscordDMRedirect = () => {
  const { channelId } = useParams();
  return <Navigate to={channelId ? `/channels/@me/${channelId}` : '/channels/@me'} replace />;
};

function App() {
  return (
    <>
      <VoiceAudioRenderer />
      <Routes>
        <Route
          index
          element={<Navigate to="/channels/@me" replace />}
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
        <Route element={<AuthRoute />}>
          <Route element={<AppLayout />}>
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
            {!!window.IgniteNative && (
              <>
                <Route path="/discord" element={<DiscordLandingPage />} />
                <Route
                  path="/discord/:guildId/:channelId?"
                  element={<DiscordGuildPage />}
                />
                <Route
                  path="/telegram/:chatId"
                  element={<TelegramChatPage />}
                />
              </>
            )}
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
