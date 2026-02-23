import { useState } from 'react';
import useStore from '../../../hooks/useStore';
import Avatar from '../../Avatar';
import { Button } from '../../ui/button';
import { KeyRound } from 'lucide-react';
import { Separator } from '../../ui/separator';
import ChangeUsernameDialog from '../Dialogs/ChangeUsernameDialog';
import ChangeEmailDialog from '../Dialogs/ChangeEmailDialog';
import ChangePasswordDialog from '../Dialogs/ChangePasswordDialog';

const TabMyAccount = ({ onNavigateToProfiles }) => {
  const store = useStore();
  const user = store.user;
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  return (
    <div className="max-w-[740px] space-y-8">
      {/* Profile Info Card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card select-none">
        <div
          className="h-24 bg-primary/20"
          style={{
            backgroundImage: user?.banner_url ? `url(${user.banner_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative px-4 pb-4">
          <div className="-mt-10 mb-2">
            <Avatar
              user={user}
              className="size-20 rounded-full border-[5px] border-card text-2xl"
            />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.username}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onNavigateToProfiles}>
              Edit User Profile
            </Button>
          </div>

          <div className="space-y-4 rounded-lg bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Display Name</p>
                <p className="mt-0.5 text-sm">{user?.name || 'Not set'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={onNavigateToProfiles}>
                Edit
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Username</p>
                <p className="mt-0.5 text-sm">{user?.username}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsUsernameDialogOpen(true)}>
                Edit
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Email</p>
                <p className="mt-0.5 text-sm">{user?.email || 'Not set'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsEmailDialogOpen(true)}>
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Password & Authentication */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Password and Authentication</h3>
        <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(true)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Change Password
        </Button>
      </div>

      {/* Dialogs */}
      <ChangeUsernameDialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen} />
      <ChangeEmailDialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen} />
      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
    </div>
  );
};

export default TabMyAccount;
