import { Crown } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const OwnerCrown = ({ size = 16, className = 'shrink-0 text-yellow-500' }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Crown size={size} weight="fill" className={className} />
    </TooltipTrigger>
    <TooltipContent side="top">Server Owner</TooltipContent>
  </Tooltip>
);

export default OwnerCrown;
