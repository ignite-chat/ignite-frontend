import { DiscordLogo, TelegramLogo } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUsersStore } from '@/ignite/store/users.store';
import { useDiscordStore } from '@/discord/store/discord.store';
import { DiscordService } from '@/discord/services/discord.service';
import { useTelegramStore } from '@/telegram/store/telegram.store';

const AccountBadge = ({ source, accountId = undefined, show = true }) => {
  if (!show) return null;
  const discordAccounts = useDiscordStore((s) => s.accounts);
  const defaultDiscordUser = useDiscordStore((s) => s.user);
  const igniteUser = useUsersStore((s) => s.getCurrentUser());

  if (source === 'discord') {
    const account = accountId
      ? discordAccounts.find((a) => a.user?.id === accountId)
      : null;
    const user = account?.user || defaultDiscordUser;
    const avatarUrl = user
      ? DiscordService.getUserAvatarUrl(user.id, user.avatar, 32)
      : null;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="order-last ml-auto flex shrink-0 items-center self-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <DiscordLogo size={18} weight="fill" className="text-[#5865f2]" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{user?.global_name || user?.username || 'Discord'}</TooltipContent>
      </Tooltip>
    );
  }

  if (source === 'ignite') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="order-last ml-auto flex shrink-0 items-center self-center">
            {igniteUser?.avatar_url ? (
              <img src={igniteUser.avatar_url} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full bg-orange-500/20 text-[9px] font-bold text-orange-400">
                {igniteUser?.username?.slice(0, 1).toUpperCase() || 'I'}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{igniteUser?.username || 'Ignite'}</TooltipContent>
      </Tooltip>
    );
  }

  if (source === 'telegram') {
    const telegramUser = useTelegramStore.getState().user;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="order-last ml-auto flex shrink-0 items-center self-center">
            {telegramUser?.photo ? (
              <img src={telegramUser.photo} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full bg-[#2AABEE]">
                <TelegramLogo size={14} weight="fill" style={{ color: 'white' }} />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{telegramUser?.firstName || 'Telegram'}</TooltipContent>
      </Tooltip>
    );
  }

  return null;
};

export default AccountBadge;
