import { useMemo, useCallback } from 'react';
import Avatar from '../Avatar.jsx';

const MessageReplyBar = ({ referenceMessageId, messages }) => {
  const referencedMessage = useMemo(() => {
    if (!referenceMessageId || !messages) return null;
    return messages.find((m) => m.id === referenceMessageId);
  }, [referenceMessageId, messages]);

  const handleClick = useCallback(() => {
    const el = document.getElementById(`msg-${referenceMessageId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    el.style.transition = 'background-color 0.3s ease';
    el.style.backgroundColor = 'rgba(88, 101, 242, 0.2)';

    setTimeout(() => {
      el.style.transition = 'background-color 1.5s ease';
      el.style.backgroundColor = '';
    }, 1000);

    setTimeout(() => {
      el.style.transition = '';
    }, 2500);
  }, [referenceMessageId]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200"
    >
      {referencedMessage ? (
        <>
          <Avatar user={referencedMessage.author} size={16} />
          <span className="font-semibold text-gray-300">
            {referencedMessage.author.name || referencedMessage.author.username}
          </span>
          <span className="max-w-[300px] truncate text-gray-400">
            {referencedMessage.content || 'Click to see original message'}
          </span>
        </>
      ) : (
        <span className="italic text-gray-500">Original message was deleted or not loaded</span>
      )}
    </button>
  );
};

export default MessageReplyBar;
