import { useCallback, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { GuildsService } from '@/services/guilds.service';
import { InvitesService } from '@/services/invites.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FormInput from '@/components/Form/FormInput';
import FormError from '@/components/Form/FormError';
import FormSubmit from '@/components/Form/FormSubmit';
import { useModalStore } from '@/store/modal.store';

const GuildModal = ({ modalId }) => {
  const [view, setView] = useState('menu');
  const createForm = useForm({ mode: 'onChange', defaultValues: { name: '' } });
  const joinForm = useForm({ mode: 'onChange', defaultValues: { invite: '' } });

  const title = useMemo(() => {
    if (view === 'create') return 'Create Your Server';
    if (view === 'join') return 'Join a Server';
    return 'Servers';
  }, [view]);

  const closeAll = useCallback(() => {
    useModalStore.getState().close(modalId);
    setView('menu');
    createForm.reset();
    joinForm.reset();
  }, [modalId, createForm, joinForm]);

  const goBack = useCallback(() => {
    setView('menu');
    createForm.reset();
    joinForm.reset();
  }, [createForm, joinForm]);

  const onCreate = useCallback(
    async (data) => {
      GuildsService.createGuild(data);
      closeAll();
    },
    [closeAll]
  );

  const onJoin = useCallback(
    async (data) => {
      try {
        let code = data.invite.trim();
        // Extract invite code from full URL if pasted
        const urlMatch = code.match(/\/invite\/([^/?#]+)/);
        if (urlMatch) code = urlMatch[1];
        await InvitesService.acceptInvite(code);
        closeAll();
      } catch (error) {
        console.error(error);
      }
    },
    [closeAll]
  );

  const activeIndex = view === 'menu' ? 0 : view === 'create' ? 1 : 2;
  const isCreateSubmitting = createForm.formState.isSubmitting;
  const isJoinSubmitting = joinForm.formState.isSubmitting;

  return (
    <Dialog open onOpenChange={() => useModalStore.getState().close(modalId)}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[75vh] w-full overflow-y-auto overflow-x-hidden">
          <div
            className="flex transition-transform duration-200 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            <div className="w-full shrink-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create a new server or join one with an invite code.
                </p>

              <div className="grid gap-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left shadow-sm transition hover:shadow-md"
                  onClick={() => setView('create')}
                >
                  <div>
                    <div className="text-sm font-medium">Create a server</div>
                    <div className="text-xs text-muted-foreground">
                      Start fresh and invite others.
                    </div>
                  </div>
                  <ArrowRight className="size-4 opacity-70" />
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left shadow-sm transition hover:shadow-md"
                  onClick={() => setView('join')}
                >
                  <div>
                    <div className="text-sm font-medium">Join a server</div>
                    <div className="text-xs text-muted-foreground">
                      Paste an invite code to hop in.
                    </div>
                  </div>
                  <ArrowRight className="size-4 opacity-70" />
                </button>

                <button
                  type="button"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-lg border bg-background px-4 py-2.5 text-sm shadow-sm transition hover:shadow-md"
                  onClick={closeAll}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition hover:shadow-md sm:w-auto"
                onClick={goBack}
                disabled={isCreateSubmitting}
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            </div>

            <FormProvider {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-3">
                <div className="space-y-2">
                  <FormInput
                    type="text"
                    name="name"
                    placeholder="My Server"
                    validation={{
                      required: 'Name is required.',
                      minLength: { value: 2, message: 'Name must be at least 2 characters.' },
                      maxLength: { value: 50, message: 'Name must be 50 characters or less.' },
                    }}
                  />
                  <FormError name="name" />
                </div>

                <FormSubmit
                  form={createForm}
                  label={isCreateSubmitting ? 'Creating…' : 'Create'}
                  icon={<ArrowRight className="size-4" />}
                  className="w-full sm:w-auto"
                />
              </form>
            </FormProvider>
          </div>

          <div className="w-full shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition hover:shadow-md sm:w-auto"
                onClick={goBack}
                disabled={isJoinSubmitting}
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            </div>

            <FormProvider {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(onJoin)} className="space-y-3">
                <div className="space-y-2">
                  <FormInput
                    type="text"
                    name="invite"
                    placeholder="Enter invite code or link"
                    validation={{
                      required: 'Invite is required.',
                      minLength: { value: 4, message: 'Invite code looks too short.' },
                      maxLength: { value: 128, message: 'Invite code looks too long.' },
                    }}
                  />
                  <FormError name="invite" />
                </div>

                <FormSubmit
                  form={joinForm}
                  label={isJoinSubmitting ? 'Joining…' : 'Join'}
                  icon={<ArrowRight className="size-4" />}
                  className="w-full sm:w-auto"
                />
              </form>
            </FormProvider>
          </div>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuildModal;
