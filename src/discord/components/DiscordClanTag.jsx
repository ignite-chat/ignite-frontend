import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { DiscordService } from '../services/discord.service';

/**
 * Renders a Discord clan/identity tag badge next to a username.
 * Reads primary_guild directly from the user object (sent via gateway),
 * no profile API call needed.
 *
 * @param {string} userId - The Discord user ID
 * @param {'sm' | 'md'} [size='sm'] - Badge size variant
 */
const DiscordClanTag = ({ userId, size = 'sm' }) => {
  const user = useDiscordUsersStore((s) => s.users[userId]);
  const guilds = useDiscordGuildsStore((s) => s.guilds);

  const clanData = useMemo(() => {
    const primaryGuild = user?.primary_guild;
    if (!primaryGuild?.identity_enabled || !primaryGuild?.tag) return null;

    const clanGuildId = primaryGuild.identity_guild_id;
    const clanGuild = guilds.find((g) => g.id === clanGuildId);
    const iconHash = clanGuild?.icon || clanGuild?.properties?.icon;
    const iconUrl = iconHash
      ? DiscordService.getGuildIconUrl(clanGuildId, iconHash, 32)
      : null;

    return {
      tag: primaryGuild.tag,
      guildId: clanGuildId,
      iconUrl,
      badge: primaryGuild.badge,
    };
  }, [user, guilds]);

  if (!clanData) return null;

  const badgeUrl = clanData.badge
    ? `https://cdn.discordapp.com/clan-badges/${clanData.guildId}/${clanData.badge}.png?size=32`
    : clanData.iconUrl;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded no-underline',
        size === 'sm' && 'ml-1 px-1 py-px text-[10px]',
        size === 'md' && 'ml-1.5 px-1.5 py-0.5 text-xs',
      )}
      title={clanData.tag}
    >
      {badgeUrl && (
        <img
          src={badgeUrl}
          alt=""
          className={cn(
            'rounded-sm object-cover',
            size === 'sm' && 'size-3',
            size === 'md' && 'size-3.5',
          )}
          draggable="false"
        />
      )}
      <span className="font-medium text-gray-300">{clanData.tag}</span>
    </span>
  );
};

export default DiscordClanTag;
