import { useUsersStore } from '@/store/users.store';
import Avatar from '../../Avatar';
import { Button } from '../../ui/button';
import { KeyRound } from 'lucide-react';
import { Separator } from '../../ui/separator';
import ChangeUsernameDialog from '@/components/modals/ChangeUsernameDialog';
import ChangeEmailDialog from '@/components/modals/ChangeEmailDialog';
import ChangePasswordDialog from '@/components/modals/ChangePasswordDialog';
import { useModalStore } from '@/store/modal.store';

const TabMyAccount = ({ onNavigateToProfiles }) => {
  const user = useUsersStore((s) => s.getCurrentUser());

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
              <Button variant="secondary" size="sm" onClick={() => useModalStore.getState().push(ChangeUsernameDialog)}>
                Edit
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Email</p>
                <p className="mt-0.5 text-sm">{user?.email || 'Not set'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => useModalStore.getState().push(ChangeEmailDialog)}>
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Password & Authentication */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Password and Authentication</h3>
        <Button variant="secondary" onClick={() => useModalStore.getState().push(ChangePasswordDialog)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Change Password
        </Button>
      </div>

    </div>
  );
};

export default TabMyAccount;
