import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';

const ServerInfo = ({ guild }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ownerWarning, setOwnerWarning] = useState('');
  const [editingField, setEditingField] = useState(null);
  const nameForm = useForm({ defaultValues: { name: '' } });
  const descriptionForm = useForm({ defaultValues: { description: '' } });
  const iconForm = useForm({ defaultValues: { icon: '' } });
  const ownerForm = useForm({ defaultValues: { owner_id: '', confirm_transfer: false } });
  const confirmTransfer = ownerForm.watch('confirm_transfer');

  const getErrorMessage = (form, field) => form.formState.errors?.[field]?.message;

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    setLoading(true);
    setError('');

    api
      .get(`/guilds/${guild.id}/profile`)
      .then((response) => {
        if (!active) return;
        setProfile(response.data);
        nameForm.reset({ name: response.data?.name || '' });
        descriptionForm.reset({ description: response.data?.description || '' });
        iconForm.reset({ icon: response.data?.icon || '' });
        ownerForm.reset({
          owner_id: response.data?.owner_id ? String(response.data.owner_id) : '',
          confirm_transfer: false,
        });
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load server profile.';
        setError(msg);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guild?.id, descriptionForm, iconForm, nameForm, ownerForm]);

  useEffect(() => {
    ownerForm.register('confirm_transfer');
  }, [ownerForm]);

  const handleSave = async (params, resetForm) => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');

    try {
      await api.patch(`/guilds/${guild.id}/profile`, null, { params });
      const response = await api.get(`/guilds/${guild.id}/profile`);
      setProfile(response.data);
      resetForm?.(response.data);
      setOwnerWarning('');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update server profile.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[740px] space-y-10">
      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Server Name */}
          <form
            onSubmit={nameForm.handleSubmit(async (data) => {
              const name = data.name?.trim();
              if (!name) return;
              const saved = await handleSave({ name }, (nextProfile) =>
                nameForm.reset({ name: nextProfile?.name || '' })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="profile-name"
                className="text-xs font-bold uppercase text-muted-foreground"
              >
                Server Name
              </Label>
              {editingField === 'name' ? (
                <div className="space-y-3">
                  <Input
                    id="profile-name"
                    type="text"
                    placeholder="Enter server name"
                    className="bg-background"
                    {...nameForm.register('name')}
                  />
                  {getErrorMessage(nameForm, 'name') && (
                    <p className="text-sm text-destructive">{getErrorMessage(nameForm, 'name')}</p>
                  )}
                  <div className="flex gap-3">
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        nameForm.reset({ name: profile?.name || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-sm">
                    {profile?.name || guild?.name || 'Unnamed Server'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField('name')}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </form>

          <Separator />

          {/* Server Description */}
          <form
            onSubmit={descriptionForm.handleSubmit(async (data) => {
              const description = data.description?.trim();
              const saved = await handleSave({ description: description || '' }, (nextProfile) =>
                descriptionForm.reset({ description: nextProfile?.description || '' })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="profile-description"
                className="text-xs font-bold uppercase text-muted-foreground"
              >
                Server Description
              </Label>
              <p className="text-xs text-muted-foreground">
                Help others discover your server by providing a description.
              </p>
              {editingField === 'description' ? (
                <div className="space-y-3">
                  <Input
                    id="profile-description"
                    type="text"
                    placeholder="Enter server description"
                    className="bg-background"
                    {...descriptionForm.register('description')}
                  />
                  <div className="flex gap-3">
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        descriptionForm.reset({ description: profile?.description || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {profile?.description || 'No description set'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField('description')}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </form>

          <Separator />

          {/* Server Icon */}
          <form
            onSubmit={iconForm.handleSubmit(async (data) => {
              const icon = data.icon?.trim();
              const saved = await handleSave({ icon: icon || '' }, (nextProfile) =>
                iconForm.reset({ icon: nextProfile?.icon || '' })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="profile-icon"
                className="text-xs font-bold uppercase text-muted-foreground"
              >
                Server Icon
              </Label>
              <p className="text-xs text-muted-foreground">
                We recommend an image of at least 512x512 for the server.
              </p>
              {editingField === 'icon' ? (
                <div className="space-y-3">
                  <Input
                    id="profile-icon"
                    type="text"
                    placeholder="https://..."
                    className="bg-background"
                    {...iconForm.register('icon')}
                  />
                  <div className="flex gap-3">
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        iconForm.reset({ icon: profile?.icon || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="truncate text-sm text-muted-foreground">
                    {profile?.icon || 'No icon set'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField('icon')}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </form>

          <Separator />

          {/* Owner Transfer */}
          <form
            onSubmit={ownerForm.handleSubmit(async (data) => {
              const nextOwnerId = data.owner_id?.trim();
              const currentOwnerId = profile?.owner_id ? String(profile.owner_id) : '';
              const isTransfer = nextOwnerId && nextOwnerId !== currentOwnerId;
              if (!nextOwnerId) return;
              if (isTransfer && !data.confirm_transfer) {
                setOwnerWarning('Confirm the ownership transfer to continue.');
                return;
              }
              const saved = await handleSave({ owner_id: nextOwnerId }, (nextProfile) =>
                ownerForm.reset({
                  owner_id: nextProfile?.owner_id ? String(nextProfile.owner_id) : '',
                  confirm_transfer: false,
                })
              );
              if (saved) setEditingField(null);
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="profile-owner"
                className="text-xs font-bold uppercase text-muted-foreground"
              >
                Server Owner
              </Label>
              <p className="text-xs text-muted-foreground">
                Transfer server ownership to another user. This action cannot be undone.
              </p>
              {editingField === 'owner_id' ? (
                <div className="space-y-3">
                  <Input
                    id="profile-owner"
                    type="text"
                    placeholder="Enter user ID"
                    className="bg-background"
                    {...ownerForm.register('owner_id')}
                  />
                  {ownerWarning && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {ownerWarning}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(confirmTransfer)}
                      onCheckedChange={(checked) =>
                        ownerForm.setValue('confirm_transfer', checked, { shouldDirty: true })
                      }
                    />
                    <span className="text-sm">I understand this will transfer ownership</span>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" size="sm" variant="destructive">
                      Transfer Ownership
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        ownerForm.reset({
                          owner_id: profile?.owner_id ? String(profile.owner_id) : '',
                          confirm_transfer: false,
                        });
                        setOwnerWarning('');
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {profile?.owner_id ? String(profile.owner_id) : 'Unknown'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOwnerWarning('');
                      setEditingField('owner_id');
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ServerInfo;
