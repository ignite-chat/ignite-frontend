import { Monitor, DeviceMobile, Globe, GameController } from '@phosphor-icons/react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const statusFills = {
  online: '#22c55e',
  idle: '#eab308',
  dnd: '#ef4444',
  offline: '#6b7280',
};

const statusLabels = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

const platformLabels = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  web: 'Web',
  embedded: 'Console',
};

const platformPhosphorIcons = {
  desktop: Monitor,
  mobile: DeviceMobile,
  web: Globe,
  embedded: GameController,
};

const getPlatforms = (clientStatus) => {
  if (!clientStatus) return [];
  return Object.entries(clientStatus)
    .filter(([, v]) => v && v !== 'offline')
    .map(([platform]) => platform);
};

// Priority: desktop > web > mobile > embedded (pick the "primary" platform to show)
const platformPriority = ['desktop', 'web', 'mobile', 'embedded'];

const sizeConfig = {
  xs: { icon: 18, badge: 16, badgeFont: 10 },
  sm: { icon: 18, badge: 16, badgeFont: 10 },
  md: { icon: 24, badge: 22, badgeFont: 13 },
  lg: { icon: 28, badge: 26, badgeFont: 15 },
};

const DiscordStatusIndicator = ({
  status = 'offline',
  clientStatus,
  size = 'xs',
  borderColor = '#1a1a1e',
  className = '',
}) => {
  const config = sizeConfig[size] || sizeConfig.xs;
  const platforms = getPlatforms(clientStatus);
  const fill = statusFills[status] || statusFills.offline;
  const multiDevice = platforms.length > 1;

  const statusLabel = statusLabels[status] || 'Offline';

  // Pick the primary platform icon, fallback to desktop if no client_status
  const primaryPlatform =
    platformPriority.find((p) => platforms.includes(p)) || (status !== 'offline' ? 'desktop' : null);

  const PhosphorIcon = primaryPlatform ? platformPhosphorIcons[primaryPlatform] : platformPhosphorIcons.desktop;

  const isOffline = status === 'offline';

  let indicator;
  if (isOffline) {
    // Hollow circle for offline
    const circleSize = config.icon * 0.65;
    indicator = (
      <div
        className="flex items-center justify-center rounded-md"
        style={{
          width: config.icon,
          height: config.icon,
          backgroundColor: borderColor,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: circleSize,
            height: circleSize,
            border: `2px solid ${statusFills.offline}`,
            backgroundColor: borderColor,
          }}
        />
      </div>
    );
  } else if (multiDevice) {
    // Multi-device: show a colored badge with device count
    indicator = (
      <div
        className="flex items-center justify-center rounded-full font-bold text-white"
        style={{
          width: config.badge,
          height: config.badge,
          fontSize: config.badgeFont,
          lineHeight: 1,
          backgroundColor: fill,
          border: `2px solid ${borderColor}`,
        }}
      >
        {platforms.length}
      </div>
    );
  } else {
    // Single device: show platform icon
    indicator = (
      <div
        className="flex items-center justify-center rounded-md"
        style={{
          width: config.icon,
          height: config.icon,
          backgroundColor: borderColor,
        }}
      >
        <PhosphorIcon size={config.icon * 0.65} weight="fill" color={fill} />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`absolute -bottom-0.5 -right-0.5 ${className}`}>
          {indicator}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-black px-2.5 py-2 text-xs font-medium text-white">
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold">{statusLabel}</span>
          {platforms.length > 0 && (
            <div className="flex flex-col gap-1">
              {platforms.map((p) => {
                const Icon = platformPhosphorIcons[p];
                return (
                  <div key={p} className="flex items-center gap-1.5">
                    {Icon && <Icon size={14} weight="fill" color={fill} />}
                    <span className="text-gray-300">{platformLabels[p] || p}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default DiscordStatusIndicator;
