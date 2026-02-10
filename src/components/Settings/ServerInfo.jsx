import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Info, Image as ImageIcon, Trash, Gear, Check, X } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { GuildsService } from '../../services/guilds.service';
import { hexToInt, intToHex } from '../../lib/colors';
import { Question } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const ServerInfo = ({ guild }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [tempIconUrl, setTempIconUrl] = useState('');

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      icon: '',
      banner_color: '#5865f2'
    }
  });

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    setLoading(true);
    api.get(`/guilds/${guild.id}/profile`)
      .then((response) => {
        if (!active) return;
        setProfile(response.data);
        form.reset({
          name: response.data?.name || '',
          description: response.data?.description || '',
          icon: response.data?.icon || '',
          banner_color: typeof response.data?.banner_color === 'number'
            ? intToHex(response.data.banner_color)
            : response.data?.banner_color || '#5865f2'
        });
      })
      .catch((err) => {
        if (!active) return;
        setError('Could not load server profile.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => { active = false; };
  }, [guild?.id, form]);

  const handleSave = async (data) => {
    if (!guild?.id) return;
    setLoading(true);
    try {
      // Calculate changes
      const changes = {};

      const normalize = (val) => val === null || val === undefined ? '' : String(val);

      if (normalize(data.name) !== normalize(profile.name)) changes.name = data.name;
      if (normalize(data.description) !== normalize(profile.description)) changes.description = data.description;
      if (normalize(data.icon) !== normalize(profile.icon)) changes.icon = data.icon;

      // Handle banner color separately as it needs conversion
      const originalBannerHex = typeof profile.banner_color === 'number'
        ? intToHex(profile.banner_color)
        : profile.banner_color || '#5865f2';

      if (typeof data.banner_color === 'string' && data.banner_color !== originalBannerHex) {
        changes.banner_color = hexToInt(data.banner_color);
      }

      if (Object.keys(changes).length === 0) {
        setLoading(false);
        return;
      }

      const updatedData = await GuildsService.updateGuildProfile(guild.id, changes);
      setProfile(prev => ({ ...prev, ...updatedData }));
    } catch (err) {
      // Error handled by service
    } finally {
      setLoading(false);
    }
  };

  const bannerColors = [
    '#5865f2', '#eb459f', '#ed4245', '#f19e38',
    '#f4d142', '#a652bb', '#51b8f1', '#43b581',
    '#5c6e1e', '#23272a'
  ];

  const handleIconSave = () => {
    form.setValue('icon', tempIconUrl);
    setIsIconModalOpen(false);
    toast.success('New icon applied to preview');
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="size-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          Server Profile
        </h3>
        <p className="text-sm text-muted-foreground mt-1 text-xs">
          Customize how your server appears in invite links and, if enabled, in Server Discovery.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-10">
        <div className="space-y-8">
          {/* Name Section */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">Server Name</Label>
            <Input
              {...form.register('name')}
              className="bg-[#1e1f22] border-none h-9 focus-visible:ring-1 focus-visible:ring-orange-500/40 text-foreground text-sm"
              placeholder="Server Name"
            />
          </div>

          <div className="h-px bg-white/5" />

          {/* Icon Section */}
          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">Icon</Label>
            <p className="text-xs text-muted-foreground opacity-70">We recommend an image of at least 512x512.</p>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  setTempIconUrl(form.getValues('icon'));
                  setIsIconModalOpen(true);
                }}
                size="sm"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white border-none h-8 px-4 text-xs font-bold shadow-lg shadow-orange-500/10 active:scale-95 transition-all"
              >
                Change Server Icon
              </Button>
              <Button
                onClick={() => form.setValue('icon', '')}
                variant="ghost"
                size="sm"
                className="h-8 px-4 text-xs hover:bg-white/5 text-muted-foreground"
              >
                Remove Icon
              </Button>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Banner Color Section */}
          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">Banner</Label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {bannerColors.map(color => (
                <button
                  key={color}
                  onClick={() => form.setValue('banner_color', color)}
                  className={`size-8 rounded-md border-2 transition-all ${form.watch('banner_color') === color ? 'border-orange-500 ring-2 ring-orange-500/20 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Description Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">Server Description</Label>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center cursor-help rounded-full transition-colors hover:bg-white/5 p-0.5 -m-0.5">
                      <Question size={14} className="text-muted-foreground/60 transition-colors hover:text-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-[#1e1f22] border border-white/10 text-foreground shadow-2xl p-3 max-w-[200px] text-[11px] font-medium leading-relaxed">
                    This description will be shown in the server discovery and on the server's home page.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <textarea
              {...form.register('description')}
              rows={4}
              className="w-full rounded-md bg-[#1e1f22] border-none p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/40 text-sm placeholder:text-muted-foreground/30"
              placeholder="Tell people what your server is about..."
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={form.handleSubmit(handleSave)}
              className="bg-[#248046] hover:bg-[#1a6334] text-white border-none px-6 h-9 text-sm font-bold active:scale-95 transition-all"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="hidden lg:block">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-4 opacity-60">Preview</Label>
          <div className="w-[300px] rounded-lg overflow-hidden bg-[#111214] shadow-2xl border border-white/5 ring-1 ring-black">
            {/* Server Card Preview */}
            <div
              className="h-32 w-full relative"
              style={{ backgroundColor: form.watch('banner_color') }}
            >
              <div className="absolute -bottom-10 left-4">
                <div className="size-20 rounded-[24px] bg-[#313338] border-[6px] border-[#111214] flex items-center justify-center p-1 overflow-hidden shadow-xl">
                  {form.watch('icon') ? (
                    <img src={form.watch('icon')} alt="Icon" className="w-full h-full object-cover rounded-[18px]" />
                  ) : (
                    <Gear size={32} weight="duotone" className="text-orange-500" />
                  )}
                </div>
              </div>
            </div>
            <div className="pt-12 px-4 pb-6 space-y-4">
              <div className="flex items-center gap-1">
                <h4 className="font-bold text-foreground text-lg truncate">{form.watch('name') || 'Server Name'}</h4>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-4 leading-relaxed opacity-80">
                {form.watch('description') || 'This is a preview of your server description. Use this space to welcome new members.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Icon Change Modal */}
      <Dialog open={isIconModalOpen} onOpenChange={setIsIconModalOpen}>
        <DialogContent className="bg-[#313338] border-none text-foreground sm:max-w-md p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold">Change Server Icon</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Provide a direct URL to an image you want to use as your server's icon.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="flex justify-center">
              <div className="size-32 rounded-[32px] bg-[#1e1f22] flex items-center justify-center overflow-hidden border-4 border-black/20 shadow-inner">
                {tempIconUrl ? (
                  <img src={tempIconUrl} alt="Preview" className="w-full h-full object-cover" onError={() => toast.error("Invalid image URL")} />
                ) : (
                  <ImageIcon size={48} weight="duotone" className="text-muted-foreground/20" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Image URL</Label>
              <Input
                value={tempIconUrl}
                onChange={(e) => setTempIconUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                className="bg-[#1e1f22] border-none h-10 focus-visible:ring-1 focus-visible:ring-orange-500/40"
              />
            </div>
          </div>
          <DialogFooter className="bg-[#2b2d31] p-4 gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsIconModalOpen(false)}
              className="text-white hover:bg-transparent hover:underline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleIconSave}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white border-none px-8 h-9 font-bold"
            >
              Apply Icon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerInfo;
