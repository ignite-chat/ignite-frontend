import { ArrowSquareOut } from '@phosphor-icons/react';
import { openExternalLinkModal } from '@/components/modals/ExternalLinkModal';

const ExternalLink = ({ href, children }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openExternalLinkModal(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex cursor-pointer items-center gap-1 text-blue-400 underline-offset-2 hover:text-blue-300"
    >
      {children}
      <ArrowSquareOut className="inline h-3 w-3 opacity-60" />
    </a>
  );
};

export default ExternalLink;
