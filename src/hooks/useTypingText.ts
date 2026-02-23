import { useMemo, useEffect } from 'react';
import { useTypingStore } from '../store/typing.store';

export function useTypingText(channelId: string | undefined) {
  const typingUsers = useTypingStore((s) => s.typing[channelId!] || []);
  const clearExpired = useTypingStore((s) => s.clearExpired);

  useEffect(() => {
    const interval = setInterval(clearExpired, 500);
    return () => clearInterval(interval);
  }, [clearExpired]);

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map((t) => t.username);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]}, ${names[1]}, and others are typing...`;
  }, [typingUsers]);

  return { typingText, typingUsers };
}
