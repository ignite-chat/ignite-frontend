import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDiscordUsersStore } from '../store/discord-users.store';
import { useDiscordGuildsStore } from '../store/discord-guilds.store';
import { DiscordService } from '../services/discord.service';
import { DiscordApiService } from '../services/discord-api.service';
import { Circle } from '@phosphor-icons/react';

// Simple in-memory cache for guild profiles
const profileCache = new Map();

/**
 * Renders a Discord clan/identity tag badge next to a username.
 * Clicking opens a popover with guild info fetched from the profile API.
 */
const DiscordClanTag = ({ userId, size = 'sm' }) => {
  const user = useDiscordUsersStore((s) => s.users[userId]);
  const guilds = useDiscordGuildsStore((s) => s.guilds);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const fetchProfile = useCallback(async () => {
    if (!clanData?.guildId) return;

    const cached = profileCache.get(clanData.guildId);
    if (cached) {
      setProfile(cached);
      return;
    }

    setLoading(true);
    try {
      const data = await DiscordApiService.getGuildProfile(clanData.guildId);
      profileCache.set(clanData.guildId, data);
      setProfile(data);
    } catch (err) {
      // 50001 = Missing Access (private server) — cache a minimal fallback
      const code = err?.response?.data?.code;
      const fallback = { _private: true, tag: clanData.tag };
      if (code === 50001) profileCache.set(clanData.guildId, fallback);
      setProfile(fallback);
    } finally {
      setLoading(false);
    }
  }, [clanData?.guildId]);

  if (!clanData) return null;

  const badgeUrl = clanData.badge
    ? `https://cdn.discordapp.com/clan-badges/${clanData.guildId}/${clanData.badge}.png?size=32`
    : clanData.iconUrl;

  // Resolve display data — prefer profile API data, fall back to local guild
  const guildName = profile?.name || null;
  const description = profile?.description || null;
  const memberCount = profile?.member_count || null;
  const onlineCount = profile?.online_count || null;
  const iconHash = profile?.icon_hash || null;
  const bannerHash = profile?.banner_hash || null;
  const customBannerHash = profile?.custom_banner_hash || null;
  const badgeColorPrimary = profile?.badge_color_primary || null;
  const badgeColorSecondary = profile?.badge_color_secondary || null;
  const badgeHash = profile?.badge_hash || null;

  const iconUrl = iconHash
    ? `https://cdn.discordapp.com/icons/${clanData.guildId}/${iconHash}.${iconHash.startsWith('a_') ? 'gif' : 'png'}?size=64`
    : clanData.iconUrl;
  const bannerUrl = customBannerHash
    ? `https://cdn.discordapp.com/discovery-splashes/${clanData.guildId}/${customBannerHash}.${customBannerHash.startsWith('a_') ? 'gif' : 'png'}?size=480`
    : bannerHash
      ? `https://cdn.discordapp.com/banners/${clanData.guildId}/${bannerHash}.${bannerHash.startsWith('a_') ? 'gif' : 'png'}?size=480`
      : null;
  const profileBadgeUrl = badgeHash
    ? `https://cdn.discordapp.com/clan-badges/${clanData.guildId}/${badgeHash}.png?size=64`
    : badgeUrl;

  return (
    <Popover onOpenChange={(open) => open && fetchProfile()}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className={cn(
            'inline-flex cursor-pointer items-center gap-0.5 rounded bg-[#333338] no-underline transition-colors hover:bg-[#3f3f46]',
            size === 'sm' && 'px-1 py-[3px] text-[11px]',
            size === 'md' && 'ml-1.5 px-1.5 py-0.5 text-xs',
          )}
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
          <span className="font-semibold text-gray-300">{clanData.tag}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] overflow-hidden rounded-lg border-none bg-[#111214] p-0 shadow-xl"
        align="start"
        side="right"
        sideOffset={8}
      >
        {loading && !profile ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
          </div>
        ) : profile?._private ? (
          <div className="px-3 py-4">
            <div className="mb-2 flex items-center gap-2">
              {badgeUrl && <img src={badgeUrl} alt="" className="size-5 rounded-sm object-cover" />}
              <span className="text-sm font-bold text-white">{clanData.tag}</span>
            </div>
            <p className="text-xs text-gray-500">This is a private server.</p>
          </div>
        ) : (
          <>
            {/* Banner or gradient fallback */}
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="h-24 w-full object-cover" />
            ) : (
              <div
                className="h-16 w-full"
                style={{
                  background: badgeColorPrimary && badgeColorSecondary
                    ? `linear-gradient(135deg, ${badgeColorPrimary}, ${badgeColorSecondary})`
                    : '#5865f2',
                }}
              />
            )}

            <div className="relative px-3 pb-3">
              {/* Guild icon */}
              <div className="-mt-8 mb-2">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt={guildName || clanData.tag}
                    className="size-14 rounded-2xl border-4 border-[#111214] bg-[#111214] object-cover"
                  />
                ) : (
                  <div
                    className="flex size-14 items-center justify-center rounded-2xl border-4 border-[#111214] text-lg font-bold text-white"
                    style={{ background: badgeColorPrimary || '#5865f2' }}
                  >
                    {(guildName || clanData.tag).charAt(0)}
                  </div>
                )}
              </div>

              {/* Guild name */}
              <p className="text-sm font-bold text-white">
                {guildName || clanData.tag}
              </p>

              {/* Member / Online counts */}
              {(memberCount || onlineCount) && (
                <div className="flex items-center gap-3 text-[13px] text-gray-500">
                  {onlineCount != null && (
                    <span className="flex items-center gap-1">
                      <Circle size={8} weight="fill" className="text-green-500" />
                      {onlineCount.toLocaleString()} Online
                    </span>
                  )}
                  {memberCount != null && (
                    <span className="flex items-center gap-1">
                      <Circle size={8} weight="fill" className="text-gray-500" />
                      {memberCount.toLocaleString()} Members
                    </span>
                  )}
                </div>
              )}

              {/* Clan tag + badge */}
              {/* <div className="mt-1 flex items-center gap-1.5">
                {profileBadgeUrl && (
                  <img src={profileBadgeUrl} alt="" className="size-4 rounded-sm object-cover" />
                )}
                <span
                  className="text-xs font-semibold"
                  style={{ color: badgeColorPrimary || '#b5bac1' }}
                >
                  {profile?.tag || clanData.tag}
                </span>
              </div> */}

              {/* Description */}
              {description && (
                <p className="mt-2 text-[13px] leading-relaxed text-gray-400">{description}</p>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DiscordClanTag;
