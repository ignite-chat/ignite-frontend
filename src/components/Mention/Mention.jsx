import { useMemo } from 'react';
import { useUsersStore } from '../../store/users.store';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import GuildMemberPopoverContent from '../GuildMember/GuildMemberPopoverContent';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MentionText = ({ userId }) => {
  const { getUser, users } = useUsersStore();
  const user = useMemo(() => getUser(userId), [userId, getUser, users]);

  if (!user) {
    return <span className="text-blue-400">&lt;@{userId}&gt;</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline cursor-pointer rounded bg-blue-500/20 px-1 font-medium text-blue-400 transition-colors hover:bg-blue-500/30 hover:text-blue-300"
        >
          @{user.username}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
        <GuildMemberPopoverContent userId={user.id} guild={null} />
      </PopoverContent>
    </Popover>
  );
};

const Mention = ({ content }) => {
  // Parse the content and split by mentions
  // Regex to match <@userid> pattern
  const mentionRegex = /<@(\d+)>/g;

  const parts = useMemo(() => {
    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        elements.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
          key: `text-${lastIndex}`,
        });
      }

      // Add the mention
      elements.push({
        type: 'mention',
        userId: match[1],
        key: `mention-${match.index}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last mention
    if (lastIndex < content.length) {
      elements.push({
        type: 'text',
        content: content.substring(lastIndex),
        key: `text-${lastIndex}`,
      });
    }

    return elements;
  }, [content]);

  return (
    <>
      {parts.map((part) => {
        if (part.type === 'mention') {
          return <MentionText key={part.key} userId={part.userId} />;
        }
        return (
          <Markdown
            key={part.key}
            remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
            components={{
              // Override paragraph to render inline
              p: ({ children }) => <>{children}</>,
            }}
          >
            {part.content}
          </Markdown>
        );
      })}
    </>
  );
};

export default Mention;
