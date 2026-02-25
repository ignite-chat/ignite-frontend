import { useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { ArrowRight, Hash, SpeakerHigh } from '@phosphor-icons/react';

// Shadcn UI Components
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { GuildsService } from '@/services/guilds.service';
import { ChannelsService } from '@/services/channels.service';
import { useModalStore } from '@/store/modal.store';

const CreateGuildCategoryModal = ({ modalId, guild }) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      type: '0',
    },
  });

  const selectedType = watch('type');

  const onSubmit = useCallback(
    async (data) => {
      try {
        // Clean name: lowercase and replace spaces with hyphens
        const cleanName = data.name.trim().toLowerCase().replace(/\s+/g, '-');

        // await GuildsService.createGuildChannel(guild.id, {
        //   name: cleanName,
        //   type: 3,
        // });

        await ChannelsService.createGuildChannel(guild.id, {
          name: cleanName,
          type: 3,
        });

        useModalStore.getState().close(modalId);
        reset();
      } catch (error) {
        console.error('Failed to create category', error);
      }
    },
    [guild?.id, modalId, reset]
  );

  return (
    <Dialog open onOpenChange={() => useModalStore.getState().close(modalId)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Category Name Input */}
        <div className="space-y-2">
          <Label
            htmlFor="category-name"
            className="text-xs font-bold uppercase text-muted-foreground"
          >
            Category Name
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="category-name"
              placeholder="new-category"
              className={`border-none bg-secondary/40 pl-9 focus-visible:ring-1 ${
                errors.name ? 'ring-1 ring-destructive' : ''
              }`}
              {...register('name', {
                required: 'Category name is required',
                maxLength: { value: 100, message: 'Name is too long' },
              })}
            />
          </div>
          {errors.name && (
            <p className="text-[12px] font-medium text-destructive">{errors.name.message}</p>
          )}
        </div>

          {/* Footer Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                useModalStore.getState().close(modalId);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="px-6 text-white">
              {isSubmitting ? 'Creating...' : 'Create Category'}
              {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGuildCategoryModal;
