import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Fire, Plus, Ticket } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field';
import { GuildsService } from '@/ignite/services/guilds.service';
import { InvitesService } from '@/ignite/services/invites.service';
import { useModalStore } from '@/ignite/store/modal.store';
import { cn } from '@/lib/utils';

const HEADING = {
  menu: { title: 'Add a Server', description: 'Start a new community or join one with an invite.' },
  create: { title: 'Create Your Server', description: 'Give it a name — you can change everything else later.' },
  join: { title: 'Join a Server', description: 'Paste the invite code or full invite URL.' },
};

const GuildModal = ({ modalId }) => {
  const [view, setView] = useState('menu');
  const close = useCallback(() => useModalStore.getState().close(modalId), [modalId]);
  const goBack = useCallback(() => setView('menu'), []);

  const heading = HEADING[view];

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Decorative ember band along the top of the modal for brand flavour. */}
        <div className="relative h-24 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_70%)]" />
          <div className="absolute bottom-0 left-1/2 flex size-16 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-2xl border border-border bg-popover shadow-xl">
            <Fire size={30} weight="fill" className="text-primary" />
          </div>
        </div>

        <div className="px-6 pb-6 pt-12">
          <DialogHeader className="space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2">
              {view !== 'menu' && (
                <button
                  type="button"
                  onClick={goBack}
                  className="absolute left-4 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <DialogTitle className="text-xl">{heading.title}</DialogTitle>
            </div>
            <DialogDescription>{heading.description}</DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            {view === 'menu' && <MenuView onPickCreate={() => setView('create')} onPickJoin={() => setView('join')} />}
            {view === 'create' && <CreateForm onDone={close} />}
            {view === 'join' && <JoinForm onDone={close} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MenuView = ({ onPickCreate, onPickJoin }) => (
  <div className="flex flex-col gap-3">
    <OptionCard
      icon={<Plus size={22} weight="bold" className="text-primary" />}
      title="Create My Own"
      description="Start with a blank canvas and invite others."
      onClick={onPickCreate}
    />
    <OptionCard
      icon={<Ticket size={22} weight="fill" className="text-primary" />}
      title="Join a Server"
      description="Have an invite already? Hop straight in."
      onClick={onPickJoin}
    />
  </div>
);

const OptionCard = ({ icon, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group flex items-center gap-4 rounded-xl border border-border bg-popover/40 p-4 text-left transition-all',
      'hover:-translate-y-0.5 hover:border-primary/50 hover:bg-popover hover:shadow-lg',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    )}
  >
    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <ArrowRight size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
  </button>
);

const CreateForm = ({ onDone }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  const onSubmit = async ({ name }) => {
    await GuildsService.createGuild({ name: name.trim() });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Server name
        </span>
        <Input
          autoFocus
          placeholder="e.g. My Awesome Server"
          className="bg-[#1e1f22]"
          {...register('name', {
            required: 'Server name is required.',
            minLength: { value: 2, message: 'At least 2 characters.' },
            maxLength: { value: 50, message: 'At most 50 characters.' },
          })}
        />
        <FieldError>{errors.name?.message}</FieldError>
      </label>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating…' : 'Create Server'}
      </Button>
    </form>
  );
};

const JoinForm = ({ onDone }) => {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    mode: 'onChange',
    defaultValues: { invite: '' },
  });

  const onSubmit = async ({ invite }) => {
    let code = invite.trim();
    // Accept full invite URLs like https://.../invite/ABC123 as well as bare codes.
    const urlMatch = code.match(/\/invite\/([^/?#]+)/);
    if (urlMatch) code = urlMatch[1];

    try {
      await InvitesService.acceptInvite(code);
      onDone();
    } catch {
      setError('invite', { type: 'server', message: 'Could not join — check the code and try again.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Invite code or link
        </span>
        <Input
          autoFocus
          placeholder="ABCdef123 or https://ignite-chat.com/invite/…"
          className="bg-[#1e1f22] font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
          {...register('invite', {
            required: 'An invite is required.',
            minLength: { value: 4, message: 'That code looks too short.' },
            maxLength: { value: 128, message: 'That code looks too long.' },
          })}
        />
        <FieldError>{errors.invite?.message}</FieldError>
      </label>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Joining…' : 'Join Server'}
      </Button>
    </form>
  );
};

export default GuildModal;
