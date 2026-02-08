import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus, DoorOpen, CircleNotch } from '@phosphor-icons/react';
import api from '../api';
import useStore from '../hooks/useStore';
import { GuildsService } from '../services/guilds.service';
import { ChannelsService } from '../services/channels.service';
import { FriendsService } from '../services/friends.service';
import { UnreadsService } from '../services/unreads.service';
import { RolesService } from '../services/roles.service';
import GuestLayout from '../layouts/GuestLayout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { FieldGroup, FieldLabel, Field } from '../components/ui/field';

const InvitePage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const store = useStore();
    const [invite, setInvite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState(null);

    const fetchInvite = useCallback(async () => {
        // backend logic goes here to fetch invite details from api
        setLoading(false);
        setInvite({
            guild: {
                name: "Sample Server",
                member_count: 128,
                approximate_presence_count: 42
            }
        });
    }, [code]);

    useEffect(() => {
        fetchInvite();
    }, [fetchInvite]);

    const handleJoin = async () => {
        if (joining) return;

        // backend logic goes here to handle guest/user registration and joining
        toast.success("Joined (Demo Only)!");
        navigate('/channels/@me');
    };

    if (loading) {
        return (
            <GuestLayout>
                <div className="flex flex-col items-center justify-center p-12">
                    <CircleNotch size={48} className="animate-spin text-primary opacity-20" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
                        Fetching invite details...
                    </p>
                </div>
            </GuestLayout>
        );
    }

    if (error) {
        return (
            <GuestLayout>
                <div className="animate-in fade-in zoom-in duration-300">
                    <Card className="mx-auto max-w-md overflow-hidden border-destructive/20 shadow-2xl shadow-destructive/5">
                        <CardContent className="p-10 text-center">
                            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
                                <DoorOpen size={40} weight="duotone" />
                            </div>
                            <h1 className="mb-2 text-2xl font-bold tracking-tight">Invite Invalid</h1>
                            <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
                                {error} <br />
                                Ask for a new link or try logging in.
                            </p>
                            <div className="space-y-3">
                                <Button onClick={() => navigate('/login')} className="w-full h-11 font-semibold">
                                    Go to Login
                                </Button>
                                <Button onClick={() => navigate('/')} variant="ghost" className="w-full h-11">
                                    Back home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </GuestLayout>
        );
    }

    const guild = invite?.guild;

    return (
        <GuestLayout>
            <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="overflow-hidden p-0 border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        {/* Left Side: Join Form */}
                        <div className="p-6 md:p-8">
                            <FieldGroup>
                                <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        {guild?.name || 'Community Server'}
                                    </h1>
                                    <p className="text-sm text-balance text-muted-foreground">
                                        You've been invited to join this community.
                                    </p>
                                </div>

                                {/* Mobile Only Server Visual */}
                                <div className="flex flex-col items-center md:hidden">
                                    {guild?.icon_url ? (
                                        <img
                                            src={guild.icon_url}
                                            alt={guild.name}
                                            className="size-20 rounded-3xl border-4 border-background object-cover shadow-xl"
                                        />
                                    ) : (
                                        <div className="flex size-20 items-center justify-center rounded-3xl border-4 border-background bg-gradient-to-tr from-primary to-primary-foreground/20 text-3xl font-black text-white shadow-xl">
                                            {guild?.name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {!store.user ? (
                                        <Field className="flex flex-col gap-2">
                                            <FieldLabel htmlFor="display-name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Display Name
                                            </FieldLabel>
                                            <div className="relative">
                                                <Input
                                                    id="display-name"
                                                    placeholder="How should others see you?"
                                                    className="h-12 border-border/50 bg-background/50 pl-4 pr-10 focus:ring-primary/20"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    autoFocus
                                                />
                                                <UserPlus size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                            </div>
                                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/60">
                                                You're joining as a guest. You can always set a password later to keep your account.
                                            </p>
                                        </Field>
                                    ) : (
                                        <div className="overflow-hidden rounded-2xl bg-primary/5 p-5 border border-primary/10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                                    {store.user.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Joining as</div>
                                                    <div className="text-base font-bold text-foreground">{store.user.username}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleJoin}
                                    className="w-full font-bold transition-all active:scale-[0.98]"
                                    disabled={joining || (!store.user && !name.trim())}
                                >
                                    {joining ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <CircleNotch size={18} className="animate-spin" />
                                            <span>Authenticating...</span>
                                        </div>
                                    ) : (
                                        store.user ? 'Accept Invite' : 'Join Server'
                                    )}
                                </Button>
                            </FieldGroup>
                        </div>

                        {/* Right Side: Branding Visuals */}
                        <div className="relative hidden md:flex items-center justify-center border-l border-white/5 overflow-hidden">
                            <img
                                src="https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/themes/2875810/settings_images/JPhoaqJwRNuwUl2Ucz9j_Ignite_Logo_FullColor_1.jpg"
                                alt="Ignite Branding"
                                className="absolute inset-0 size-full object-cover"
                            />
                        </div>
                    </CardContent>
                </Card>

                <p className="px-6 text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 leading-relaxed max-w-sm mx-auto">
                    By joining, you agree to our <a href="#" className="hover:text-primary transition-colors">Guidelines</a> & <a href="#" className="hover:text-primary transition-colors">Terms</a>.
                </p>
            </div>
        </GuestLayout>
    );
};

export default InvitePage;
