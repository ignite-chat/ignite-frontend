import { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import useStore from './hooks/useStore';
import api from './api';
import PageTitle from './components/PageTitle';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DirectMessagesPage from './pages/DirectMessages';
import GuildChannelPage from './pages/GuildChannel';
import InvitePage from './pages/InvitePage';
import { GuildsService } from './services/guilds.service';
import { FriendsService } from './services/friends.service';
import { useGuildsStore } from './store/guilds.store';
import { useChannelsStore } from './store/channels.store';
import { UnreadsService } from './services/unreads.service';
import { RolesService } from './services/roles.service';
import { ChannelsService } from './services/channels.service';
import { useUsersStore } from './store/users.store';
import VoiceAudioRenderer from './components/Voice/VoiceAudioRenderer';

const AuthRoute = ({ children }) => {
  const store = useStore();

  const [initialized, setInitialized] = useState(false);
  const [failed, setFailed] = useState(false);

  // Get guilds from the store
  const { guilds } = useGuildsStore();

  // Get channels from the store
  const { channels } = useChannelsStore();

  // Keep track of active subscriptions to avoid duplicates
  const activeSubscriptions = useRef(new Set());

  useEffect(() => {
    const initialize = async () => {
      try {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          const { data: user } = await api.get('@me', {
            headers: { Authorization: `Bearer ${localToken}` },
          });

          if (user?.username) {
            store.login(user, localToken);

            await Promise.all([
              GuildsService.loadGuilds(),
              FriendsService.loadFriends(),
              FriendsService.loadRequests(),
              UnreadsService.loadUnreads(),
            ]);

            await ChannelsService.loadChannels();
            await RolesService.initializeGuildRoles();
          } else {
            localStorage.removeItem('token');
          }

          console.log('Initialization complete.');
          setInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize', error);
        setFailed(true);
      } finally {
        setInitialized(true);
      }
    };

    if (!initialized) {
      initialize();
    }
  }, [initialized]);

  // Subscribe to user private channel via Echo
  useEffect(() => {
    if (!initialized || !store.user) return;

    // Subsribe to the user private channel via Echo
    console.log(`Subscribing to private.user.${store.user.id}`);

    window.Echo.private(`user.${store.user.id}`)
      .listen('.friendrequest.created', (event) => {
        console.log('Received friend request event:', event);
        FriendsService.loadRequests();
      })
      .listen('.friendrequest.deleted', (event) => {
        console.log('Friend request deleted event:', event);
        FriendsService.loadRequests();
      })
      .listen('.friendrequest.accepted', (event) => {
        console.log('Friend request accepted event:', event);
        FriendsService.loadFriends();
        FriendsService.loadRequests();
      })
      .listen('.unread.updated', (event) => {
        console.log('Unread updated event:', event);
        UnreadsService.updateUnread(event.unread.channel_id, event.unread);
      })
      .listen('.message.created', ChannelsService.handleMessageCreated)
      .listen('.message.updated', ChannelsService.handleMessageUpdated)
      .listen('.message.deleted', ChannelsService.handleMessageDeleted)
      .listen('.channel.created', ChannelsService.handleChannelCreated)
      .listen('.user.updated', (event) => {
        useUsersStore.getState().setUser(event.user.id, event.user);
      });
  }, [initialized, store.user]);

  // Subscribe to all channels via Echo
  useEffect(() => {
    if (!initialized || !store.user) return;

    // Subscribe to all guilds via Echo
    guilds.forEach((guild) => {
      const guildId = guild.id;

      // Only subscribe if we haven't already
      if (!activeSubscriptions.current.has(guildId)) {
        console.log(`Subscribing to new guild: ${guildId}`);

        window.Echo.private(`guild.${guildId}`)
          .listen('.member.joined', (event) => {
            GuildsService.addGuildMemberToStore(guildId, event.member);
          })
          .listen('.member.updated', (event) => {
            GuildsService.updateGuildMemberInStore(guildId, event.member.user_id, event.member);
          })
          .listen('.member.left', (event) => {
            GuildsService.deleteGuildMemberFromStore(guildId, event.member.user_id);
          })
          .listen('.message.created', ChannelsService.handleMessageCreated)
          .listen('.message.updated', ChannelsService.handleMessageUpdated)
          .listen('.message.deleted', ChannelsService.handleMessageDeleted)
          .listen('.role.created', RolesService.handleRoleCreated)
          .listen('.role.updated', RolesService.handleRoleUpdated)
          .listen('.role.deleted', RolesService.handleRoleDeleted)
          .listen('.user.updated', (event) => {
            useUsersStore.getState().setUser(event.user.id, event.user);
          });

        // Mark as subscribed
        activeSubscriptions.current.add(guildId);
      }
    });

    return () => {
      // Logic to leave Echo channels if needed
    };
  }, [guilds, channels, initialized, store.user]);

  if (failed) {
    // If we initialization failed, show an error message with a retry button
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-body">
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
      <div className="flex h-screen items-center justify-center bg-body">
        <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!store.user) {
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
  const store = useStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          const { data: user } = await api.get('@me', {
            headers: { Authorization: `Bearer ${localToken}` },
          });

          if (user?.username) {
            store.login(user, localToken);

            await Promise.all([
              GuildsService.loadGuilds(),
              FriendsService.loadFriends(),
              FriendsService.loadRequests(),
              UnreadsService.loadUnreads(),
            ]);

            await ChannelsService.loadChannels();
            await RolesService.initializeGuildRoles();
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Failed to initialize on public route', error);
        // Remove invalid token but don't prevent access
        localStorage.removeItem('token');
      }

      setInitialized(true);
    };

    initialize();
  }, []);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-body">
        <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

function App() {
  const store = useStore();
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
          element={
            store.user ? <Navigate to="/channels/@me" replace /> : <Navigate to="/login" replace />
          }
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
                <PageTitle title="Direct Messages" />
                <DirectMessagesPage />
              </>
            }
          />
          <Route
            path="/channels/@me/:channelId"
            element={
              <>
                <PageTitle title="Direct Messages" />
                <DirectMessagesPage />
              </>
            }
          />
          <Route
            path="/channels/:guildId/:channelId?"
            element={
              <>
                <PageTitle title="Guild Channel" />
                <GuildChannelPage />
              </>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
