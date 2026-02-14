import { Gear } from '@phosphor-icons/react';
import useStore from '../hooks/useStore';
import { Dialog, DialogTrigger } from './ui/dialog';
import UserSettingsDialogContent from './UserSettingsDialogContent';
import { LogOut } from 'lucide-react';
import Avatar from './Avatar';

const UserBar = () => {
  const store = useStore();

  return (
    <div className="flex items-center border-t border-white/5 bg-[#202024] px-2 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative shrink-0">
          <Avatar user={store.user} className="size-8" />
          {store.user?.status !== 'offline' && (
            <div className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#202024]">
              <div className="size-2.5 rounded-full bg-green-600"></div>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-gray-100">{store.user?.name}</span>
          <span className="truncate text-[11px] text-gray-500">
            {store.user?.status || 'Online'}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => store.logout()}
          className="flex size-8 items-center justify-center rounded hover:bg-gray-700"
        >
          <LogOut className="size-4 text-gray-400 hover:text-gray-200" />
        </button>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded hover:bg-gray-700"
            >
              <Gear className="size-4 text-gray-400 hover:text-gray-200" weight="fill" />
            </button>
          </DialogTrigger>
          <UserSettingsDialogContent />
        </Dialog>
      </div>
    </div>
  );
};

export default UserBar;
