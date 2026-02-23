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
import { ChannelsService } from '@/services/channels.service';

const CreateGuildChannelDialog = ({ open, onOpenChange, guild, categoryId }) => {
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

        await ChannelsService.createGuildChannel(guild.id, {
          name: cleanName,
          type: parseInt(data.type),
          parent_id: categoryId,
        });

        onOpenChange(false);
        reset();
      } catch (error) {
        console.error('Failed to create channel', error);
      }
    },
    [guild?.id, categoryId, onOpenChange, reset]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Channel Type Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              Channel Type
            </Label>

            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid gap-2"
                >
                  {/* Text Channel Option */}
                  <Label
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-all ${
                      field.value === '0'
                        ? 'border-primary bg-accent ring-1 ring-primary'
                        : 'border-transparent bg-secondary/40 hover:bg-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="0" className="sr-only" />
                    <Hash size={24} className="text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">Text</span>
                      <span className="text-xs font-normal leading-tight text-muted-foreground">
                        Send messages, images, and GIFs.
                      </span>
                    </div>
                  </Label>

                  {/* Voice Channel Option */}
                  <Label
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-all ${
                      field.value === '2'
                        ? 'border-primary bg-accent ring-1 ring-primary'
                        : 'border-transparent bg-secondary/40 opacity-80 hover:bg-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="2" className="sr-only" />
                    <SpeakerHigh size={24} className="text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">Voice</span>
                      <span className="text-xs font-normal leading-tight text-muted-foreground">
                        Hang out with voice and video.
                      </span>
                    </div>
                  </Label>
                </RadioGroup>
              )}
            />
          </div>

          {/* Channel Name Input */}
          <div className="space-y-2">
            <Label
              htmlFor="channel-name"
              className="text-xs font-bold uppercase text-muted-foreground"
            >
              Channel Name
            </Label>
            <div className="relative">
              {selectedType === '2' ? (
                <SpeakerHigh className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              ) : (
                <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                id="channel-name"
                placeholder="new-channel"
                className={`border-none bg-secondary/40 pl-9 focus-visible:ring-1 ${
                  errors.name ? 'ring-1 ring-destructive' : ''
                }`}
                {...register('name', {
                  required: 'Channel name is required',
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
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="px-6 text-white">
              {isSubmitting ? 'Creating...' : 'Create Channel'}
              {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGuildChannelDialog;
