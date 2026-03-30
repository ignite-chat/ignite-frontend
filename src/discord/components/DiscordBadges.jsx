import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const DiscordBadges = ({ badges }) => {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-0.5">
      {badges.map((badge) => (
        <Tooltip key={badge.id}>
          <TooltipTrigger asChild>
            {badge.link ? (
              <a
                href={badge.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={`https://cdn.discordapp.com/badge-icons/${badge.icon}.png`}
                  alt={badge.description}
                  className="size-[22px]"
                  draggable="false"
                />
              </a>
            ) : (
              <span className="flex items-center">
                <img
                  src={`https://cdn.discordapp.com/badge-icons/${badge.icon}.png`}
                  alt={badge.description}
                  className="size-[22px]"
                  draggable="false"
                />
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {badge.description}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default DiscordBadges;
