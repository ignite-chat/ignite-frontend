import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const WIDTHS = ['25%', '30%', '35%', '40%', '45%', '50%', '55%', '60%', '65%', '70%', '75%', '80%', '90%'];

function generateSkeletonMessages(count) {
  const messages = [];
  for (let i = 0; i < count; i++) {
    const showHeader = i === 0 || Math.random() > 0.4;
    const lineCount = Math.floor(Math.random() * 3) + 1;
    const lines = Array.from({ length: lineCount }, () => ({
      width: WIDTHS[Math.floor(Math.random() * WIDTHS.length)],
    }));
    messages.push({ showHeader, lines });
  }
  return messages;
}

const SkeletonMessage = ({ showHeader, lines }) => (
  <div className={`flex items-start gap-4 px-4 py-1 ${showHeader ? 'mt-3.5' : ''}`}>
    {showHeader ? (
      <Skeleton className="size-10 shrink-0 rounded-full" />
    ) : (
      <div className="w-10 shrink-0" />
    )}
    <div className="flex flex-1 flex-col gap-1.5">
      {showHeader && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-2.5 w-16 rounded" />
        </div>
      )}
      {lines.map((line, i) => (
        <Skeleton key={i} className="h-3.5 rounded" style={{ width: line.width }} />
      ))}
    </div>
  </div>
);

const MessageSkeletonList = ({ count = 25 }) => {
  const messages = useMemo(() => generateSkeletonMessages(count), [count]);

  return (
    <div className="flex h-full flex-col justify-end pb-4">
      {messages.map((msg, i) => (
        <SkeletonMessage key={i} showHeader={msg.showHeader} lines={msg.lines} />
      ))}
    </div>
  );
};

export default MessageSkeletonList;
