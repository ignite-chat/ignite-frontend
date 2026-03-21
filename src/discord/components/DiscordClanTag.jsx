import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDiscordProfilesStore } from '../store/discord-profiles.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { DiscordService } from '../services/discord.service';

/**
 * Renders a Discord clan/identity tag badge next to a username.
 * The tag comes from user_profile.primary_guild in the profile API response.
 *
 * @param {string} userId - The Discord user ID
 * @param {string} [guildId] - Optional guild context for profile lookup
 * @param {'sm' | 'md'} [size='sm'] - Badge size variant
 */
const DiscordClanTag = ({ userId, guildId, size = 'sm' }) => {
  const profile = useDiscordProfilesStore((s) => s.getProfile(userId, guildId));
  const fetchProfile = useDiscordProfilesStore((s) => s.fetchProfile);
  const guilds = useDiscordGuildsStore((s) => s.guilds);

  useEffect(() => {
    if (!profile) {
      fetchProfile(userId, guildId);
    }
  }, [userId, guildId, profile, fetchProfile]);

  const clanData = useMemo(() => {
    const primaryGuild =
      profile?.user_profile?.primary_guild || profile?.user?.primary_guild;
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
  }, [profile, guilds]);

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
