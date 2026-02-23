import React from 'react';
import { emojiMap, getTwemojiUrl } from '../utils/emoji.utils';
import ExternalLink from './Message/components/ExternalLink';

const MARKDOWN_REGEX = /(\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|\*.*?\*|__.*?__|~~.*?~~|:[\w_+-]+:|https?:\/\/[^\s]+)/g;

const parseText = (text) => {
  if (!text) return null;

  const parts = text.split(MARKDOWN_REGEX);

  return parts.map((part, index) => {
    if (!part) return null;

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      let url = linkMatch[2];
      if (!/^https?:\/\//i.test(url)) {
        if (!url.startsWith('/')) {
          url = 'about:blank';
        }
      }
      return (
        <ExternalLink key={index} href={url}>
          {linkMatch[1]}
        </ExternalLink>
      );
    }

    if (part.match(/^https?:\/\/[^\s]+$/i)) {
      return (
        <ExternalLink key={index} href={part}>
          {part}
        </ExternalLink>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
      return (
        <em key={index} className="italic">
          {part.slice(2, -2)}
        </em>
      );
    }

    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <del key={index} className="line-through">
          {part.slice(2, -2)}
        </del>
      );
    }

    if (part.startsWith(':') && part.endsWith(':')) {
      const surrogate = emojiMap.get(part);
      if (surrogate) {
        const url = getTwemojiUrl(surrogate);
        return (
          <img
            key={index}
            src={url}
            alt={part}
            className="mx-0.5 inline-block size-[1.35em] object-contain align-text-bottom"
            draggable="false"
          />
        );
      }
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

export const MarkdownText = ({ text, className }) => {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {parseText(line)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
};
