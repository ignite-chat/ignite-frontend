import { useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { ArrowRight, Hash, SpeakerHigh } from '@phosphor-icons/react';

// Shadcn UI Components
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Button } from '../ui/button';

import { GuildsService } from '../../services/guilds.service';
import Dialog from '../Dialog';
import { ChannelsService } from '../../services/channels.service';

const CreateGuildCategoryDialog = ({ isOpen, setIsOpen, guild }) => {
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

        setIsOpen(false);
        reset();
      } catch (error) {
        console.error('Failed to create category', error);
      }
    },
    [guild.id, setIsOpen, reset]
  );

  return (
    <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Create Category">
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
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsOpen(false);
              reset();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="px-6 text-white">
            {isSubmitting ? 'Creating...' : 'Create Category'}
            {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateGuildCategoryDialog;
