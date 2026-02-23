import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Clock, XCircle, CheckCircle } from '@phosphor-icons/react';
import useStore from '../hooks/useStore';
import { useGuildsStore } from '../store/guilds.store';
import { useInvitesStore } from '../store/invites.store';
import { InvitesService } from '../services/invites.service';
import GuestLayout from '../layouts/GuestLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Field, FieldLabel, FieldError } from '../components/ui/field';

const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const { guilds } = useGuildsStore();

  const cachedInvite = useInvitesStore((s) => s.invites[code]);
  const fetchInvite = useInvitesStore((s) => s.fetchInvite);

  const [loading, setLoading] = useState(!cachedInvite);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(cachedInvite ?? null);
  const [joining, setJoining] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Fetch invite preview on mount (skips API call if already cached)
  useEffect(() => {
    if (cachedInvite) {
      setInvite(cachedInvite);
      setLoading(false);
      return;
    }

    const loadInvite = async () => {
      try {
        setLoading(true);
        const data = await fetchInvite(code);
        setInvite(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch invite:', err);
        const status = err.response?.status;
        const message = err.response?.data?.message;

        if (status === 404) {
          setError({ type: 'not_found', message: 'Invite Not Found' });
        } else if (status === 410) {
          setError({ type: 'expired', message: message || 'This Invite Has Expired' });
        } else {
          setError({ type: 'server_error', message: 'Unable to Load Invite' });
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [code, cachedInvite, fetchInvite]);

  // Check if user is already a member and redirect
  useEffect(() => {
    if (invite && store.user && guilds.length > 0) {
      const guild = guilds.find((g) => g.id === invite.guild.id);
      if (guild) {
        navigate(`/channels/${guild.id}`, { replace: true });
      }
    }
  }, [invite, guilds, store.user, navigate]);

  // Handle join for authenticated users
  const handleJoin = useCallback(async () => {
    if (!invite) return;

    try {
      setJoining(true);
      await InvitesService.acceptInvite(code);

      navigate('/channels/@me');
    } catch (err) {
      console.error('Failed to join server:', err);
    } finally {
      setJoining(false);
    }
  }, [invite, code, navigate]);

  // Handle quick account creation and auto-join
  const handleQuickSignup = useCallback(async () => {
    // Validate username
    setUsernameError('');
    if (!username || username.trim().length < 2) {
      setUsernameError('Username must be at least 2 characters');
      return;
    }
    if (username.length > 32) {
      setUsernameError('Username must be 32 characters or less');
      return;
    }

    try {
      setJoining(true);
      await InvitesService.acceptInviteWithQuickAccount(code, username);
      // Navigate to the dashboard after successful account creation and join
      navigate('/channels/@me', { replace: true });
    } catch (err) {
      console.error('Failed to create account and join server:', err);
      setUsernameError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setJoining(false);
    }
  }, [username, code, navigate]);

  // Format expiry date
  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date - now;

    if (diffMs < 0) return 'Expired';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    return 'Soon';
  };

  // Loading state
  if (loading) {
    return (
      <GuestLayout>
        <div className="mx-auto flex max-w-md flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading invite...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </GuestLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <GuestLayout>
        <div className="mx-auto flex max-w-md flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <XCircle className="size-16 text-red-500" weight="duotone" />
                <div>
                  <h2 className="text-xl font-bold">{error.message}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {error.type === 'not_found' &&
                      'The invite link you used is invalid or has been deleted.'}
                    {error.type === 'expired' &&
                      'This invite may have expired or reached its maximum uses.'}
                    {error.type === 'server_error' && 'Please try again later.'}
                  </p>
                </div>
                <Button onClick={() => navigate('/channels/@me')} className="mt-2">
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </GuestLayout>
    );
  }

  const guildIconUrl = invite?.guild.icon_file_id
    ? `${import.meta.env.VITE_CDN_BASE_URL}/icons/${invite.guild.icon_file_id}`
    : null;

  // Success state - show invite preview
  return (
    <GuestLayout>
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6">
              {/* Guild Icon */}
              <div className="relative">
                {guildIconUrl ? (
                  <img
                    src={guildIconUrl}
                    alt={invite.guild.name}
                    className="size-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                    {invite.guild.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <CheckCircle
                  className="absolute -bottom-1 -right-1 size-8 rounded-full bg-background text-green-500"
                  weight="fill"
                />
              </div>

              {/* Guild Info */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {invite.user
                    ? `${invite.user.username} has invited you to join`
                    : "You've been invited to join"}
                </p>
                <h1 className="mt-2 text-2xl font-bold">{invite.guild.name}</h1>
              </div>

              {/* Stats */}
              <div className="flex w-full justify-center gap-6 text-sm">
                {invite.guild.online_count && (
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-green-500"></div>
                    <div>
                      <span className="font-semibold">{invite.guild.online_count || 0}</span>
                      <span className="ml-1 text-muted-foreground">Online</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-gray-500"></div>
                  <div>
                    <span className="font-semibold">{invite.guild.member_count || 0}</span>
                    <span className="ml-1 text-muted-foreground">Members</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {invite.expires_at && (
                <div className="w-full space-y-2 border-t pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" />
                      Expires in:
                    </span>
                    <span className="font-medium text-foreground">
                      {formatExpiry(invite.expires_at)}
                    </span>
                  </div>
                </div>
              )}
              {/* Action Buttons */}
              <div className="w-full space-y-3 border-t pt-4">
                {store.user ? (
                  // Logged in user
                  <Button onClick={handleJoin} disabled={joining} className="w-full" size="lg">
                    {joining ? 'Joining...' : 'Join Server'}
                  </Button>
                ) : (
                  // Not logged in user - show username input directly
                  <div className="space-y-3">
                    <Field>
                      <FieldLabel htmlFor="username">Choose a display name</FieldLabel>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your display name"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setUsernameError('');
                        }}
                        disabled={joining}
                        autoFocus
                      />
                      {usernameError && <FieldError>{usernameError}</FieldError>}
                    </Field>
                    <Button
                      onClick={handleQuickSignup}
                      disabled={joining}
                      className="w-full"
                      size="lg"
                    >
                      {joining ? 'Joining...' : 'Continue'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <Link
                        to={`/login?redirect=/invite/${code}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Login
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </GuestLayout>
  );
};

export default InvitePage;
